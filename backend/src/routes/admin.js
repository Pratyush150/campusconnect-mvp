import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { scanText } from "../lib/scanner.js";
import { audit } from "../lib/audit.js";
import { notifyUser } from "../lib/notify.js";
import { sendOtp } from "../lib/mailer.js";
import { releaseEscrow } from "./assignments.js";
import { getSetting } from "../lib/payments.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

// ---- Dashboard ----
router.get("/dashboard", async (_req, res) => {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    usersByRole, reqCounts, paymentsAgg, openFlags,
    pendingBids, pendingReviews, pendingPayouts, earningsSum,
    activeAssignments, capturedLast7d, earningsLast7d, requestsLast7d,
    flaggedQueue, pendingReviewQueue, pendingPayoutQueue,
    recentActivity,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.assignmentRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.payment.aggregate({ where: { status: "captured" }, _sum: { amount: true }, _count: true }),
    prisma.assignmentRequest.count({ where: { contactFlagged: true, status: "pending" } }),
    prisma.assignmentBid.count({ where: { status: "pending" } }),
    prisma.assignmentDelivery.count({ where: { adminReview: "pending" } }),
    prisma.payout.count({ where: { status: "pending" } }),
    prisma.platformEarning.aggregate({ _sum: { platformFee: true } }),
    prisma.assignmentRequest.count({ where: { status: { in: ["assigned", "in_progress", "review", "revision", "delivered"] } } }),
    prisma.payment.aggregate({ where: { status: "captured", createdAt: { gte: since7d } }, _sum: { amount: true } }),
    prisma.platformEarning.aggregate({ where: { createdAt: { gte: since7d } }, _sum: { platformFee: true } }),
    prisma.assignmentRequest.count({ where: { createdAt: { gte: since7d } } }),
    prisma.assignmentRequest.findMany({
      where: { contactFlagged: true, status: "pending" },
      orderBy: { createdAt: "desc" }, take: 5,
      select: { id: true, title: true, createdAt: true, contactFlags: true },
    }),
    prisma.assignmentDelivery.findMany({
      where: { adminReview: "pending" },
      orderBy: { createdAt: "asc" }, take: 5,
      select: { id: true, assignmentId: true, version: true, createdAt: true, assignment: { select: { title: true } } },
    }),
    prisma.payout.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" }, take: 5,
      select: { id: true, amount: true, createdAt: true, user: { select: { fullName: true } } },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" }, take: 20,
      select: { id: true, entity: true, entityId: true, action: true, newState: true, createdAt: true, actor: { select: { fullName: true, role: true } } },
    }),
  ]);
  res.json({
    usersByRole, requestsByStatus: reqCounts,
    payments: { capturedTotal: paymentsAgg._sum.amount || 0, count: paymentsAgg._count },
    openFlags, pendingBids, pendingReviews, pendingPayouts,
    platformEarningsTotal: earningsSum._sum.platformFee || 0,
    activeAssignments,
    last7d: {
      capturedAmount: capturedLast7d._sum.amount || 0,
      platformFee: earningsLast7d._sum.platformFee || 0,
      newRequests: requestsLast7d,
    },
    queues: {
      flagged: flaggedQueue,
      pendingReview: pendingReviewQueue,
      pendingPayout: pendingPayoutQueue,
    },
    recentActivity,
  });
});

// ---- Assignments ----
router.get("/assignments", async (req, res) => {
  const { status } = req.query;
  const rows = await prisma.assignmentRequest.findMany({
    where: status ? { status: String(status) } : {},
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, fullName: true, email: true } },
      assignedDoer: { select: { id: true, fullName: true, email: true } },
      bids: true,
    },
    take: 200,
  });
  res.json({ assignments: rows });
});

router.get("/assignments/:id", async (req, res) => {
  const r = await prisma.assignmentRequest.findUnique({
    where: { id: req.params.id },
    include: {
      client: { select: { id: true, fullName: true, email: true, phone: true } },
      assignedDoer: { select: { id: true, fullName: true, email: true, phone: true } },
      bids: { include: { doer: { select: { id: true, fullName: true, email: true, doerProfile: true } } }, orderBy: { createdAt: "asc" } },
      deliveries: { orderBy: { version: "asc" } },
      payments: true,
    },
  });
  if (!r) return res.status(404).json({ error: "Not found" });
  res.json({ assignment: r });
});

router.put("/assignments/:id/publish", async (req, res) => {
  const r = await prisma.assignmentRequest.findUnique({ where: { id: req.params.id } });
  if (!r) return res.status(404).json({ error: "Not found" });
  if (r.status !== "pending") return res.status(409).json({ error: "Only pending can be published" });
  await prisma.assignmentRequest.update({ where: { id: r.id }, data: { status: "published" } });
  await audit({ actorId: req.userId, entity: "assignment", entityId: r.id, action: "publish", previousState: "pending", newState: "published" });
  await notifyUser(r.clientId, { title: "Your request is live", message: `"${r.title}" is open for bids`, type: "assignment_update", referenceId: r.id, referenceType: "assignment" });
  res.json({ ok: true });
});

router.put("/assignments/:id/reject", async (req, res) => {
  const r = await prisma.assignmentRequest.findUnique({ where: { id: req.params.id } });
  if (!r) return res.status(404).json({ error: "Not found" });
  if (!["pending", "published", "bidding"].includes(r.status)) return res.status(409).json({ error: "Cannot reject now" });
  await prisma.assignmentRequest.update({ where: { id: r.id }, data: { status: "cancelled", adminNotes: String(req.body.reason || "").slice(0, 2000) } });
  await audit({ actorId: req.userId, entity: "assignment", entityId: r.id, action: "reject", previousState: r.status, newState: "cancelled" });
  await notifyUser(r.clientId, { title: "Request closed by admin", message: String(req.body.reason || "No reason provided"), type: "assignment_update", referenceId: r.id, referenceType: "assignment" });
  res.json({ ok: true });
});

router.put("/assignments/:id/assign", async (req, res) => {
  const { bidId, finalPrice } = req.body;
  const price = Number(finalPrice);
  if (!bidId || !price) return res.status(400).json({ error: "bidId + finalPrice required" });
  const [r, bid] = await Promise.all([
    prisma.assignmentRequest.findUnique({ where: { id: req.params.id } }),
    prisma.assignmentBid.findUnique({ where: { id: bidId } }),
  ]);
  if (!r || !bid || bid.assignmentId !== r.id) return res.status(404).json({ error: "Not found" });
  if (!["published", "bidding"].includes(r.status)) return res.status(409).json({ error: "Not matchable" });

  await prisma.$transaction([
    prisma.assignmentBid.update({ where: { id: bid.id }, data: { status: "accepted" } }),
    prisma.assignmentBid.updateMany({
      where: { assignmentId: r.id, id: { not: bid.id }, status: "pending" },
      data: { status: "rejected" },
    }),
    prisma.assignmentRequest.update({
      where: { id: r.id },
      data: { status: "assigned", assignedDoerId: bid.doerId, finalPrice: price },
    }),
  ]);
  await audit({ actorId: req.userId, entity: "assignment", entityId: r.id, action: "assign", previousState: r.status, newState: "assigned", metadata: { bidId: bid.id, finalPrice: price } });
  await notifyUser(bid.doerId, { title: "You've been assigned a task", message: `"${r.title}" — ₹${price}`, type: "assignment_update", referenceId: r.id, referenceType: "assignment" });
  await notifyUser(r.clientId, { title: "Matched with an expert", message: `Please pay ₹${price} to start work.`, type: "assignment_update", referenceId: r.id, referenceType: "assignment" });
  res.json({ ok: true });
});

router.put("/assignments/:id/reassign", async (req, res) => {
  const { bidId, finalPrice } = req.body;
  const r = await prisma.assignmentRequest.findUnique({ where: { id: req.params.id } });
  if (!r) return res.status(404).json({ error: "Not found" });
  if (!["assigned", "in_progress", "revision"].includes(r.status)) return res.status(409).json({ error: "Not reassignable" });
  const newBid = await prisma.assignmentBid.findUnique({ where: { id: bidId } });
  if (!newBid || newBid.assignmentId !== r.id) return res.status(400).json({ error: "Invalid bid" });
  await prisma.$transaction([
    prisma.assignmentBid.update({ where: { id: newBid.id }, data: { status: "accepted" } }),
    prisma.assignmentRequest.update({ where: { id: r.id }, data: { assignedDoerId: newBid.doerId, finalPrice: Number(finalPrice) || r.finalPrice, status: "in_progress" } }),
  ]);
  await audit({ actorId: req.userId, entity: "assignment", entityId: r.id, action: "reassign", previousState: r.status, newState: "in_progress", metadata: { bidId: newBid.id } });
  res.json({ ok: true });
});

router.put("/assignments/:id/approve-delivery", async (req, res) => {
  const { deliveryId } = req.body;
  const d = await prisma.assignmentDelivery.findUnique({ where: { id: deliveryId } });
  if (!d || d.assignmentId !== req.params.id) return res.status(404).json({ error: "Not found" });
  const r = await prisma.assignmentRequest.findUnique({ where: { id: req.params.id } });
  if (!r || r.status !== "review") return res.status(409).json({ error: "Not in review" });
  await prisma.$transaction([
    prisma.assignmentDelivery.update({ where: { id: d.id }, data: { adminReview: "approved" } }),
    prisma.assignmentRequest.update({ where: { id: r.id }, data: { status: "delivered" } }),
  ]);
  await audit({ actorId: req.userId, entity: "assignment", entityId: r.id, action: "approve_delivery", previousState: "review", newState: "delivered" });
  await notifyUser(r.clientId, { title: "Your delivery is ready", message: r.title, type: "assignment_update", referenceId: r.id, referenceType: "assignment" });
  res.json({ ok: true });
});

router.put("/assignments/:id/request-revision", async (req, res) => {
  const { deliveryId, feedback } = req.body;
  const d = await prisma.assignmentDelivery.findUnique({ where: { id: deliveryId } });
  if (!d || d.assignmentId !== req.params.id) return res.status(404).json({ error: "Not found" });
  const r = await prisma.assignmentRequest.findUnique({ where: { id: req.params.id } });
  if (!r || r.status !== "review") return res.status(409).json({ error: "Not in review" });
  const max = await getSetting("max_revision_count", 3);
  if (r.revisionCount >= max) return res.status(409).json({ error: "Max revisions reached — escalate or force-approve" });
  await prisma.$transaction([
    prisma.assignmentDelivery.update({ where: { id: d.id }, data: { adminReview: "revision_needed", adminFeedback: feedback || null } }),
    prisma.assignmentRequest.update({ where: { id: r.id }, data: { status: "revision", revisionCount: { increment: 1 } } }),
  ]);
  await audit({ actorId: req.userId, entity: "assignment", entityId: r.id, action: "request_revision", previousState: "review", newState: "revision" });
  await notifyUser(r.assignedDoerId, { title: "Revision requested", message: feedback || r.title, type: "assignment_update", referenceId: r.id, referenceType: "assignment" });
  res.json({ ok: true });
});

router.put("/assignments/:id/force-release", async (req, res) => {
  await releaseEscrow(req.params.id, req.userId, "admin_force_release");
  res.json({ ok: true });
});

// ---- Doer approval ----
router.get("/doers", async (_req, res) => {
  const rows = await prisma.user.findMany({
    where: { role: "doer" },
    include: { doerProfile: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ doers: rows });
});

router.put("/users/:id/approve-doer", async (req, res) => {
  await prisma.doerProfile.update({ where: { userId: req.params.id }, data: { isApproved: true } });
  await audit({ actorId: req.userId, entity: "doer", entityId: req.params.id, action: "approve" });
  await notifyUser(req.params.id, { title: "Profile approved", message: "You can now bid on assignments.", type: "system" });
  res.json({ ok: true });
});

router.put("/users/:id/activate", async (req, res) => {
  const { active } = req.body;
  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: Boolean(active) } });
  await audit({ actorId: req.userId, entity: "user", entityId: req.params.id, action: active ? "activate" : "deactivate" });
  res.json({ ok: true });
});

// ---- Mentor invites & approval ----
router.post("/mentors/invite", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const inv = await prisma.mentorInvite.create({
    data: { email, token, expiresAt, createdBy: req.userId },
  });
  const url = `${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}/register/mentor?token=${token}`;
  await sendOtp(email, `Your CampusConnect invite link: ${url}`);
  res.json({ inviteId: inv.id, url });
});

router.put("/mentors/:id/approve", async (req, res) => {
  await prisma.mentorProfile.update({ where: { userId: req.params.id }, data: { isApproved: true } });
  await audit({ actorId: req.userId, entity: "mentor", entityId: req.params.id, action: "approve" });
  await notifyUser(req.params.id, { title: "Mentor profile approved", message: "You're live on the mentor listing.", type: "system" });
  res.json({ ok: true });
});

router.put("/mentors/:id/deactivate", async (req, res) => {
  await prisma.mentorProfile.update({ where: { userId: req.params.id }, data: { isApproved: false } });
  res.json({ ok: true });
});

router.get("/mentors", async (_req, res) => {
  const rows = await prisma.user.findMany({
    where: { role: "mentor" },
    include: { mentorProfile: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ mentors: rows });
});

// ---- Users ----
router.get("/users", async (req, res) => {
  const where = req.query.role ? { role: String(req.query.role) } : {};
  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, role: true, fullName: true, isActive: true, isVerified: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ users });
});

// ---- Messages ----
router.get("/messages/:assignmentId", async (req, res) => {
  const msgs = await prisma.adminMessage.findMany({
    where: { assignmentId: req.params.assignmentId },
    orderBy: { createdAt: "asc" },
    include: {
      toUser: { select: { id: true, fullName: true, role: true } },
      fromUser: { select: { id: true, fullName: true, role: true } },
    },
  });
  res.json({ messages: msgs });
});

router.post("/messages/send", async (req, res) => {
  const { toUserId, assignmentId, message } = req.body;
  if (!toUserId || !message) return res.status(400).json({ error: "Missing fields" });
  const scan = scanText(message);
  const m = await prisma.adminMessage.create({
    data: {
      toUserId, assignmentId: assignmentId || null, fromAdmin: true,
      fromUserId: req.userId, message,
    },
  });
  await notifyUser(toUserId, { title: "Message from admin", message: message.slice(0, 120), type: "system", referenceId: assignmentId, referenceType: "assignment" });
  res.status(201).json({ message: m, flagged: scan.flagged });
});

// ---- Payouts ----
router.get("/payouts", async (_req, res) => {
  const rows = await prisma.payout.findMany({
    where: { status: "pending" },
    include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ payouts: rows.map((p) => ({ ...p, bankDetails: safeJson(p.bankDetails) })) });
});

router.put("/payouts/:id/approve", async (req, res) => {
  await prisma.payout.update({ where: { id: req.params.id }, data: { status: "completed", adminApproved: true, processedAt: new Date() } });
  await audit({ actorId: req.userId, entity: "payout", entityId: req.params.id, action: "approve" });
  res.json({ ok: true });
});

router.put("/payouts/:id/reject", async (req, res) => {
  await prisma.payout.update({ where: { id: req.params.id }, data: { status: "failed" } });
  res.json({ ok: true });
});

// ---- Settings ----
router.get("/settings", async (_req, res) => {
  const rows = await prisma.platformSetting.findMany();
  res.json({ settings: rows });
});

router.put("/settings/:key", async (req, res) => {
  const { value } = req.body;
  await prisma.platformSetting.upsert({
    where: { key: req.params.key },
    create: { key: req.params.key, value: JSON.stringify({ value }), updatedBy: req.userId },
    update: { value: JSON.stringify({ value }), updatedBy: req.userId },
  });
  res.json({ ok: true });
});

// ---- Cron endpoints (callable manually) ----
router.post("/cron/auto-complete", async (_req, res) => {
  const hold = await getSetting("escrow_hold_days", 3);
  const cutoff = new Date(Date.now() - hold * 86400 * 1000);
  const stale = await prisma.assignmentRequest.findMany({
    where: { status: "delivered", updatedAt: { lt: cutoff } },
    select: { id: true },
  });
  for (const r of stale) await releaseEscrow(r.id, null, "auto_complete_cron");
  res.json({ released: stale.length });
});

router.post("/cron/stale-review-alert", async (_req, res) => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stale = await prisma.assignmentRequest.findMany({
    where: { status: "review", updatedAt: { lt: cutoff } },
  });
  const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } });
  for (const r of stale) for (const a of admins) await notifyUser(a.id, {
    title: "Stale review (>24h)", message: r.title, type: "assignment_update", referenceId: r.id, referenceType: "assignment",
  });
  res.json({ alerted: stale.length });
});

router.post("/cron/release-unpaid-bookings", async (_req, res) => {
  const now = new Date();
  const stale = await prisma.mentorBooking.findMany({
    where: { status: "pending_payment", expiresAt: { lt: now } },
    select: { id: true, slotId: true },
  });
  let released = 0;
  for (const b of stale) {
    await prisma.$transaction([
      prisma.mentorBooking.update({ where: { id: b.id }, data: { status: "cancelled" } }),
      prisma.mentorSlot.update({ where: { id: b.slotId }, data: { isBooked: false } }),
    ]);
    released++;
  }
  res.json({ released });
});

router.post("/cron/reconcile-payments", async (_req, res) => {
  const oldPending = await prisma.payment.findMany({
    where: { status: "pending", createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  res.json({ note: "In prod, poll Razorpay for each order.", candidates: oldPending.length });
});

function safeJson(s) { try { return JSON.parse(s); } catch { return s; } }

export default router;
