import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { createOrder, verifyPayment, webhookVerify } from "../lib/payments.js";
import { audit } from "../lib/audit.js";
import { notifyUser } from "../lib/notify.js";

const router = Router();

router.post("/create-order", requireAuth, async (req, res) => {
  const { assignmentId, bookingId } = req.body;
  if (assignmentId) {
    const r = await prisma.assignmentRequest.findUnique({ where: { id: assignmentId } });
    if (!r || r.clientId !== req.userId) return res.status(404).json({ error: "Not found" });
    if (r.status !== "assigned") return res.status(409).json({ error: "Not awaiting payment" });
    if (!r.finalPrice) return res.status(500).json({ error: "No finalPrice set" });
    const order = await createOrder({ amount: r.finalPrice, receipt: `asg-${r.id}` });
    const payment = await prisma.payment.create({
      data: {
        payerId: req.userId,
        amount: r.finalPrice,
        paymentType: "assignment_escrow",
        referenceId: r.id,
        referenceType: "assignment",
        assignmentId: r.id,
        orderId: order.orderId,
        status: "pending",
      },
    });
    return res.json({ order, paymentId: payment.id });
  }
  if (bookingId) {
    const b = await prisma.mentorBooking.findUnique({ where: { id: bookingId }, include: { mentor: { include: { mentorProfile: true } } } });
    if (!b || b.studentId !== req.userId) return res.status(404).json({ error: "Not found" });
    const amount = b.mentor.mentorProfile.hourlyRate;
    const order = await createOrder({ amount, receipt: `bk-${b.id}` });
    const payment = await prisma.payment.create({
      data: {
        payerId: req.userId,
        amount,
        paymentType: "mentor_booking",
        referenceId: b.id,
        referenceType: "booking",
        orderId: order.orderId,
        status: "pending",
      },
    });
    await prisma.mentorBooking.update({ where: { id: b.id }, data: { paymentId: payment.id } });
    return res.json({ order, paymentId: payment.id });
  }
  res.status(400).json({ error: "Missing assignmentId or bookingId" });
});

router.post("/verify", requireAuth, async (req, res) => {
  const { orderId, paymentId, signature } = req.body;
  const ok = await verifyPayment({ orderId, paymentId, signature });
  if (!ok) return res.status(400).json({ error: "Signature invalid" });
  await capturePaymentByOrder(orderId, { paymentId, signature }, req.userId);
  res.json({ ok: true });
});

// Dev helper — skips Razorpay front-end dance
router.post("/mock-capture", requireAuth, async (req, res) => {
  const { paymentId } = req.body;
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p || p.payerId !== req.userId) return res.status(404).json({ error: "Not found" });
  if (p.status !== "pending") return res.status(409).json({ error: `Status ${p.status}` });
  await capturePaymentByOrder(p.orderId, { paymentId: "mock_pay_" + Date.now(), signature: "MOCK_OK" }, req.userId);
  res.json({ ok: true });
});

router.post("/webhook", async (req, res) => {
  const raw = JSON.stringify(req.body);
  const sig = req.headers["x-razorpay-signature"] || req.headers["x-mock-signature"] || "";
  if (!(await webhookVerify({ body: raw, signature: String(sig) }))) {
    return res.status(400).json({ error: "Bad signature" });
  }
  const event = req.body.event;
  const payload = req.body.payload || {};
  if (event === "payment.captured") {
    const entity = payload.payment?.entity || {};
    await capturePaymentByOrder(entity.order_id, { paymentId: entity.id, signature: String(sig) }, null);
  }
  res.json({ ok: true });
});

async function capturePaymentByOrder(orderId, { paymentId, signature }, actorId) {
  const p = await prisma.payment.findUnique({ where: { orderId } });
  if (!p) return;
  if (p.status === "captured") return;
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: p.id },
      data: { status: "captured", providerPaymentId: paymentId, providerSignature: signature },
    }),
    ...(p.paymentType === "assignment_escrow"
      ? [
          prisma.assignmentRequest.update({
            where: { id: p.assignmentId },
            data: { status: "in_progress", clientPaid: true },
          }),
        ]
      : []),
    ...(p.paymentType === "mentor_booking"
      ? [
          prisma.mentorBooking.update({
            where: { id: p.referenceId },
            data: { status: "confirmed", meetingLink: `https://meet.assignmentor.local/${p.referenceId}` },
          }),
        ]
      : []),
  ]);
  await audit({ actorId, entity: "payment", entityId: p.id, action: "capture", previousState: "pending", newState: "captured", assignmentId: p.assignmentId });
  if (p.paymentType === "assignment_escrow") {
    const r = await prisma.assignmentRequest.findUnique({ where: { id: p.assignmentId } });
    if (r?.assignedDoerId) {
      await notifyUser(r.assignedDoerId, { title: "Payment received", message: `Start work on "${r.title}"`, type: "payment", referenceId: r.id, referenceType: "assignment" });
    }
  }
  if (p.paymentType === "mentor_booking") {
    const b = await prisma.mentorBooking.findUnique({ where: { id: p.referenceId } });
    if (b) {
      await notifyUser(b.mentorId, { title: "New session booked", message: `By a ${b.studentRole}`, type: "mentor_booking", referenceId: b.id, referenceType: "booking" });
      await notifyUser(b.studentId, { title: "Booking confirmed", message: b.meetingLink || "Session booked", type: "mentor_booking", referenceId: b.id, referenceType: "booking" });
    }
  }
}

router.get("/history", requireAuth, async (req, res) => {
  const rows = await prisma.payment.findMany({
    where: { payerId: req.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ payments: rows });
});

export default router;
