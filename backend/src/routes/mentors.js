import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireApprovedMentor } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { getSetting } from "../lib/payments.js";

const router = Router();

// Public listing (auth required — prevents scraping)
router.get("/", requireAuth, async (_req, res) => {
  const rows = await prisma.user.findMany({
    where: { role: "mentor", isActive: true, mentorProfile: { isApproved: true } },
    select: {
      id: true, fullName: true, avatarUrl: true,
      mentorProfile: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ mentors: rows });
});

router.get("/:id", requireAuth, async (req, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, fullName: true, avatarUrl: true, mentorProfile: true },
  });
  if (!u || !u.mentorProfile?.isApproved) return res.status(404).json({ error: "Not found" });
  const slots = await prisma.mentorSlot.findMany({
    where: { mentorId: u.id, isBooked: false, slotDate: { gte: new Date().toISOString().slice(0, 10) } },
    orderBy: [{ slotDate: "asc" }, { startTime: "asc" }],
    take: 50,
  });
  res.json({ mentor: u, slots });
});

router.post("/:id/book", requireAuth, async (req, res, next) => {
  try {
    if (!["client", "doer"].includes(req.userRole)) return res.status(403).json({ error: "Students only" });
    const { slotId, topic } = req.body;
    if (!slotId) return res.status(400).json({ error: "slotId required" });

    const result = await prisma.$transaction(async (tx) => {
      const slot = await tx.mentorSlot.findUnique({ where: { id: slotId } });
      if (!slot || slot.mentorId !== req.params.id) throw httpErr(404, "Slot not found");
      if (slot.isBooked) throw httpErr(409, "Slot already booked");

      await tx.mentorSlot.update({ where: { id: slot.id }, data: { isBooked: true } });

      return tx.mentorBooking.create({
        data: {
          slotId: slot.id,
          mentorId: slot.mentorId,
          studentId: req.userId,
          studentRole: req.userRole,
          topic: topic || null,
          status: "pending_payment",
        },
      });
    });
    await audit({ actorId: req.userId, entity: "booking", entityId: result.id, action: "create" });
    res.status(201).json({ booking: result });
  } catch (e) { next(e); }
});

router.delete("/bookings/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const b = await prisma.mentorBooking.findUnique({ where: { id: req.params.id }, include: { slot: true } });
    if (!b || b.studentId !== req.userId) return res.status(404).json({ error: "Not found" });
    if (b.status === "completed" || b.status === "cancelled") return res.status(409).json({ error: "Not cancellable" });
    const windowH = await getSetting("mentor_cancellation_window_hours", 4);
    const slotStart = new Date(`${b.slot.slotDate}T${b.slot.startTime}:00`);
    const freeCancellation = slotStart.getTime() - Date.now() > windowH * 3600 * 1000;
    await prisma.$transaction([
      prisma.mentorBooking.update({ where: { id: b.id }, data: { status: "cancelled" } }),
      prisma.mentorSlot.update({ where: { id: b.slotId }, data: { isBooked: false } }),
    ]);
    await audit({ actorId: req.userId, entity: "booking", entityId: b.id, action: "cancel", metadata: { freeCancellation } });
    res.json({ ok: true, freeCancellation });
  } catch (e) { next(e); }
});

router.get("/my/bookings", requireAuth, async (req, res) => {
  const rows = await prisma.mentorBooking.findMany({
    where: { studentId: req.userId },
    include: {
      slot: true,
      mentor: { select: { id: true, fullName: true, mentorProfile: { select: { headline: true, institution: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ bookings: rows });
});

router.post("/bookings/:id/rate", requireAuth, async (req, res) => {
  const b = await prisma.mentorBooking.findUnique({ where: { id: req.params.id } });
  if (!b || b.studentId !== req.userId) return res.status(404).json({ error: "Not found" });
  if (b.status !== "completed") return res.status(409).json({ error: "Rate after completion" });
  const stars = Number(req.body.rating);
  if (!(stars >= 1 && stars <= 5)) return res.status(400).json({ error: "Bad rating" });
  await prisma.mentorBooking.update({ where: { id: b.id }, data: { rating: stars, feedback: req.body.feedback || null } });
  const agg = await prisma.mentorBooking.aggregate({ where: { mentorId: b.mentorId, rating: { not: null } }, _avg: { rating: true }, _count: true });
  await prisma.mentorProfile.update({
    where: { userId: b.mentorId },
    data: { rating: agg._avg.rating || 0, totalSessions: agg._count },
  });
  res.json({ ok: true });
});

// ----- Mentor-side -----
router.post("/slots", requireAuth, requireApprovedMentor, async (req, res, next) => {
  try {
    const { slots } = req.body;
    if (!Array.isArray(slots) || !slots.length) return res.status(400).json({ error: "slots array required" });
    const created = [];
    for (const s of slots) {
      try {
        const r = await prisma.mentorSlot.create({
          data: {
            mentorId: req.userId,
            slotDate: String(s.date),
            startTime: String(s.startTime),
            endTime: String(s.endTime),
            durationMin: Number(s.durationMin) || 60,
            isRecurring: Boolean(s.isRecurring),
            recurrenceDay: s.recurrenceDay != null ? Number(s.recurrenceDay) : null,
          },
        });
        created.push(r);
      } catch (e) { /* skip duplicates */ }
    }
    res.status(201).json({ created: created.length, slots: created });
  } catch (e) { next(e); }
});

router.get("/slots/mine", requireAuth, requireApprovedMentor, async (req, res) => {
  const rows = await prisma.mentorSlot.findMany({ where: { mentorId: req.userId }, orderBy: [{ slotDate: "asc" }, { startTime: "asc" }] });
  res.json({ slots: rows });
});

router.delete("/slots/:id", requireAuth, requireApprovedMentor, async (req, res) => {
  const s = await prisma.mentorSlot.findUnique({ where: { id: req.params.id } });
  if (!s || s.mentorId !== req.userId) return res.status(404).json({ error: "Not found" });
  if (s.isBooked) return res.status(409).json({ error: "Slot already booked" });
  await prisma.mentorSlot.delete({ where: { id: s.id } });
  res.json({ ok: true });
});

router.get("/bookings/mine", requireAuth, requireApprovedMentor, async (req, res) => {
  const rows = await prisma.mentorBooking.findMany({
    where: { mentorId: req.userId },
    include: { slot: true, student: { select: { id: true, fullName: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ bookings: rows });
});

router.put("/bookings/:id/complete", requireAuth, requireApprovedMentor, async (req, res) => {
  const b = await prisma.mentorBooking.findUnique({ where: { id: req.params.id } });
  if (!b || b.mentorId !== req.userId) return res.status(404).json({ error: "Not found" });
  if (b.status !== "confirmed") return res.status(409).json({ error: `Not completable in ${b.status}` });
  await prisma.mentorBooking.update({ where: { id: b.id }, data: { status: "completed" } });
  await audit({ actorId: req.userId, entity: "booking", entityId: b.id, action: "complete" });

  const pct = await getSetting("mentor_commission_percent", 15);
  const payment = b.paymentId ? await prisma.payment.findUnique({ where: { id: b.paymentId } }) : null;
  if (payment && payment.status === "captured") {
    const platformFee = Math.round(payment.amount * pct / 100);
    const providerPayout = payment.amount - platformFee;
    await prisma.platformEarning.create({
      data: {
        paymentId: payment.id,
        grossAmount: payment.amount,
        platformFee, providerPayout, feePercent: pct,
        earningType: "mentor_commission", status: "pending",
      },
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "released" } });
  }
  res.json({ ok: true });
});

function httpErr(status, msg) { const e = new Error(msg); e.status = status; return e; }

export default router;
