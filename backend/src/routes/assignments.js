import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, requireApprovedDoer } from "../middleware/auth.js";
import { scanMany } from "../lib/scanner.js";
import { audit } from "../lib/audit.js";
import { getSetting } from "../lib/payments.js";
import { notifyUser } from "../lib/notify.js";

const router = Router();

// -------- Client: create + view own --------

router.post("/request", requireAuth, requireRole("client"), async (req, res, next) => {
  try {
    const { title, description, subject, assignmentType, deadline, budgetMin, budgetMax, attachments } = req.body;
    if (!title || !description || !deadline) return res.status(400).json({ error: "Missing fields" });
    const dl = new Date(deadline);
    if (isNaN(dl) || dl < new Date(Date.now() + 24 * 60 * 60 * 1000)) {
      return res.status(400).json({ error: "Deadline must be at least 24h in the future" });
    }

    const scan = scanMany(title, description);

    const reqRow = await prisma.assignmentRequest.create({
      data: {
        clientId: req.userId,
        title, description,
        subject: subject || null,
        assignmentType: assignmentType || null,
        deadline: dl,
        budgetMin: budgetMin ? Number(budgetMin) : null,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        attachments: attachments ? JSON.stringify(attachments) : null,
        status: "pending",
        contactFlagged: scan.flagged,
        contactFlags: scan.flagged ? scan.hits.join(",") : null,
      },
    });
    await audit({ actorId: req.userId, entity: "assignment", entityId: reqRow.id, action: "create", newState: "pending" });

    const admins = await prisma.user.findMany({ where: { role: "admin", isActive: true }, select: { id: true } });
    for (const a of admins) {
      await notifyUser(a.id, {
        title: "New assignment request",
        message: `${title}${scan.flagged ? " — contact-info flag: " + scan.hits.join(",") : ""}`,
        type: "assignment_update",
        referenceId: reqRow.id, referenceType: "assignment",
      });
    }
    res.status(201).json({ assignment: reqRow });
  } catch (e) { next(e); }
});

router.get("/my-requests", requireAuth, requireRole("client"), async (req, res) => {
  const rows = await prisma.assignmentRequest.findMany({
    where: { clientId: req.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ assignments: rows.map(clientView) });
});

router.get("/my-requests/:id", requireAuth, requireRole("client"), async (req, res) => {
  const r = await prisma.assignmentRequest.findUnique({
    where: { id: req.params.id },
    include: { deliveries: true },
  });
  if (!r || r.clientId !== req.userId) return res.status(404).json({ error: "Not found" });
  const view = clientView(r);
  const approved = r.deliveries.filter((d) => d.adminReview === "approved");
  view.deliveries = approved.map((d) => ({ id: d.id, files: safeJson(d.files, []), version: d.version, createdAt: d.createdAt }));
  res.json({ assignment: view });
});

router.post("/my-requests/:id/confirm", requireAuth, requireRole("client"), async (req, res, next) => {
  try {
    const r = await prisma.assignmentRequest.findUnique({ where: { id: req.params.id } });
    if (!r || r.clientId !== req.userId) return res.status(404).json({ error: "Not found" });
    if (r.status !== "delivered") return res.status(409).json({ error: `Cannot confirm in status ${r.status}` });
    await releaseEscrow(r.id, req.userId, "client_confirmed");
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/my-requests/:id/dispute", requireAuth, requireRole("client"), async (req, res, next) => {
  try {
    const r = await prisma.assignmentRequest.findUnique({ where: { id: req.params.id } });
    if (!r || r.clientId !== req.userId) return res.status(404).json({ error: "Not found" });
    if (!["delivered", "completed"].includes(r.status)) return res.status(409).json({ error: "Not disputable now" });
    await prisma.assignmentRequest.update({ where: { id: r.id }, data: { status: "disputed", adminNotes: String(req.body.reason || "").slice(0, 2000) } });
    await audit({ actorId: req.userId, entity: "assignment", entityId: r.id, action: "dispute", previousState: r.status, newState: "disputed" });
    const admins = await prisma.user.findMany({ where: { role: "admin", isActive: true }, select: { id: true } });
    for (const a of admins) await notifyUser(a.id, {
      title: "Dispute raised", message: r.title, type: "assignment_update", referenceId: r.id, referenceType: "assignment",
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// -------- Doer: browse + bid + deliver --------

router.get("/available", requireAuth, requireApprovedDoer, async (req, res) => {
  const rows = await prisma.assignmentRequest.findMany({
    where: { status: { in: ["published", "bidding"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ assignments: rows.map(doerView) });
});

router.get("/available/:id", requireAuth, requireApprovedDoer, async (req, res) => {
  const r = await prisma.assignmentRequest.findUnique({ where: { id: req.params.id } });
  if (!r || !["published", "bidding"].includes(r.status)) return res.status(404).json({ error: "Not available" });
  const existingBid = await prisma.assignmentBid.findUnique({
    where: { assignmentId_doerId: { assignmentId: r.id, doerId: req.userId } },
  });
  res.json({ assignment: doerView(r), myBid: existingBid });
});

router.post("/:id/bid", requireAuth, requireApprovedDoer, async (req, res, next) => {
  try {
    const { bidAmount, estimatedHours, coverNote } = req.body;
    const amt = Number(bidAmount);
    const minBid = await getSetting("min_bid_amount", 200);
    if (!amt || amt < minBid) return res.status(400).json({ error: `Bid must be at least ₹${minBid}` });

    const r = await prisma.assignmentRequest.findUnique({ where: { id: req.params.id } });
    if (!r || !["published", "bidding"].includes(r.status)) return res.status(409).json({ error: "Not open for bids" });

    const scan = scanMany(coverNote);

    try {
      const bid = await prisma.assignmentBid.create({
        data: {
          assignmentId: r.id,
          doerId: req.userId,
          bidAmount: amt,
          estimatedHours: estimatedHours ? Number(estimatedHours) : null,
          coverNote: coverNote || null,
          contactFlagged: scan.flagged,
        },
      });
      if (r.status === "published") {
        await prisma.assignmentRequest.update({ where: { id: r.id }, data: { status: "bidding" } });
        await audit({ actorId: req.userId, entity: "assignment", entityId: r.id, action: "auto_move_to_bidding", previousState: "published", newState: "bidding" });
      }
      await audit({ actorId: req.userId, entity: "bid", entityId: bid.id, action: "create", assignmentId: r.id });
      const admins = await prisma.user.findMany({ where: { role: "admin", isActive: true }, select: { id: true } });
      for (const a of admins) await notifyUser(a.id, {
        title: "New bid", message: `₹${amt} on "${r.title}"${scan.flagged ? " — contact-info flag" : ""}`,
        type: "assignment_update", referenceId: r.id, referenceType: "assignment",
      });
      res.status(201).json({ bid });
    } catch (e) {
      if (e.code === "P2002") return res.status(409).json({ error: "You already bid on this assignment" });
      throw e;
    }
  } catch (e) { next(e); }
});

router.get("/my-bids", requireAuth, requireApprovedDoer, async (req, res) => {
  const bids = await prisma.assignmentBid.findMany({
    where: { doerId: req.userId },
    orderBy: { createdAt: "desc" },
    include: { assignment: true },
  });
  res.json({ bids: bids.map((b) => ({
    id: b.id, bidAmount: b.bidAmount, status: b.status, createdAt: b.createdAt,
    assignment: doerView(b.assignment),
  })) });
});

router.get("/my-tasks", requireAuth, requireApprovedDoer, async (req, res) => {
  const tasks = await prisma.assignmentRequest.findMany({
    where: { assignedDoerId: req.userId },
    orderBy: { updatedAt: "desc" },
    include: { deliveries: { orderBy: { createdAt: "desc" } } },
  });
  res.json({ tasks: tasks.map((t) => ({
    ...doerView(t),
    finalPrice: t.finalPrice,
    clientPaid: t.clientPaid,
    revisionCount: t.revisionCount,
    deliveries: t.deliveries.map((d) => ({
      id: d.id, files: safeJson(d.files, []), version: d.version,
      adminReview: d.adminReview, adminFeedback: d.adminFeedback, createdAt: d.createdAt,
    })),
  })) });
});

router.post("/:id/deliver", requireAuth, requireApprovedDoer, async (req, res, next) => {
  try {
    const { files, doerNotes } = req.body;
    if (!Array.isArray(files) || files.length === 0) return res.status(400).json({ error: "No files" });
    const r = await prisma.assignmentRequest.findUnique({ where: { id: req.params.id } });
    if (!r || r.assignedDoerId !== req.userId) return res.status(404).json({ error: "Not your task" });
    if (!["in_progress", "revision"].includes(r.status)) return res.status(409).json({ error: `Cannot deliver in status ${r.status}` });

    const scan = scanMany(doerNotes);
    const version = (await prisma.assignmentDelivery.count({ where: { assignmentId: r.id } })) + 1;

    const d = await prisma.assignmentDelivery.create({
      data: {
        assignmentId: r.id,
        doerId: req.userId,
        files: JSON.stringify(files),
        version,
        doerNotes: doerNotes || null,
        adminReview: "pending",
      },
    });
    await prisma.assignmentRequest.update({ where: { id: r.id }, data: { status: "review" } });
    await audit({ actorId: req.userId, entity: "assignment", entityId: r.id, action: "deliver", previousState: r.status, newState: "review", metadata: { version, scan } });

    const admins = await prisma.user.findMany({ where: { role: "admin", isActive: true }, select: { id: true } });
    for (const a of admins) await notifyUser(a.id, {
      title: "Delivery submitted", message: `${r.title} v${version}${scan.flagged ? " — contact flag" : ""}`,
      type: "assignment_update", referenceId: r.id, referenceType: "assignment",
    });
    res.status(201).json({ delivery: { id: d.id, version } });
  } catch (e) { next(e); }
});

// ---- helpers ----
function clientView(r) {
  const assignedTo = r.assignedDoerId ? "Expert" : null;
  const { clientId: _clientId, assignedDoerId: _adid, adminNotes: _an, ...rest } = r;
  return { ...rest, assignedTo, attachments: safeJson(r.attachments, []) };
}

function doerView(r) {
  if (!r) return null;
  const { clientId: _c, client: _cl, adminNotes: _an, assignedDoerId: _adid, contactFlagged: _cf, contactFlags: _cfs, ...rest } = r;
  return { ...rest, attachments: safeJson(r.attachments, []) };
}

function safeJson(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }

// shared with admin routes
export async function releaseEscrow(assignmentId, actorId, reason) {
  const r = await prisma.assignmentRequest.findUnique({
    where: { id: assignmentId },
    include: { payments: true },
  });
  if (!r || !["delivered", "completed"].includes(r.status)) return;
  if (r.status === "completed") return;
  const capturedPayment = r.payments.find((p) => p.status === "captured" && p.paymentType === "assignment_escrow");
  if (!capturedPayment) return;

  const pct = Number((await getSetting("assignment_commission_percent", 25)));
  const gross = r.finalPrice || capturedPayment.amount;
  const platformFee = Math.round(gross * pct / 100);
  const providerPayout = gross - platformFee;

  await prisma.$transaction([
    prisma.platformEarning.create({
      data: {
        paymentId: capturedPayment.id,
        grossAmount: gross,
        platformFee,
        providerPayout,
        feePercent: pct,
        earningType: "assignment_commission",
        status: "pending",
      },
    }),
    prisma.payment.update({ where: { id: capturedPayment.id }, data: { status: "released" } }),
    prisma.assignmentRequest.update({ where: { id: r.id }, data: { status: "completed" } }),
  ]);

  await audit({ actorId, entity: "assignment", entityId: r.id, action: "release_escrow", previousState: "delivered", newState: "completed", metadata: { reason, platformFee, providerPayout } });
  await notifyUser(r.assignedDoerId, {
    title: "Payment released", message: `₹${providerPayout} added to your payouts`,
    type: "payment", referenceId: r.id, referenceType: "assignment",
  });
}

export { doerView, clientView, safeJson };
export default router;
