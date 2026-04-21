import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { scanText } from "../lib/scanner.js";
import { notifyUser } from "../lib/notify.js";

const router = Router();

// Non-admin users: thread with admin for a given assignment.
router.get("/:assignmentId", requireAuth, async (req, res) => {
  const aid = req.params.assignmentId;
  const r = await prisma.assignmentRequest.findUnique({ where: { id: aid } });
  if (!r) return res.status(404).json({ error: "Not found" });
  const amIParticipant = (req.userRole === "client" && r.clientId === req.userId) ||
    (req.userRole === "doer" && r.assignedDoerId === req.userId) ||
    req.userRole === "admin";
  if (!amIParticipant) return res.status(403).json({ error: "Forbidden" });

  const msgs = await prisma.adminMessage.findMany({
    where: {
      assignmentId: aid,
      OR: [{ toUserId: req.userId }, { fromUserId: req.userId }],
    },
    orderBy: { createdAt: "asc" },
  });
  res.json({ messages: msgs });
});

router.post("/send", requireAuth, async (req, res) => {
  if (req.userRole === "admin") return res.status(400).json({ error: "Admins use /api/admin/messages/send" });
  const { assignmentId, message } = req.body;
  if (!assignmentId || !message) return res.status(400).json({ error: "Missing fields" });

  const r = await prisma.assignmentRequest.findUnique({ where: { id: assignmentId } });
  if (!r) return res.status(404).json({ error: "Not found" });
  const ok = (req.userRole === "client" && r.clientId === req.userId) ||
    (req.userRole === "doer" && r.assignedDoerId === req.userId);
  if (!ok) return res.status(403).json({ error: "Forbidden" });

  const admins = await prisma.user.findMany({ where: { role: "admin", isActive: true }, select: { id: true } });
  if (admins.length === 0) return res.status(500).json({ error: "No admin to route message" });

  const scan = scanText(message);
  const target = admins[0].id;
  const saved = await prisma.adminMessage.create({
    data: {
      assignmentId, fromAdmin: false, toUserId: target, fromUserId: req.userId, message,
    },
  });
  for (const a of admins) await notifyUser(a.id, {
    title: `Message from ${req.userRole}`,
    message: message.slice(0, 120) + (scan.flagged ? " — contact flag" : ""),
    type: "system", referenceId: assignmentId, referenceType: "assignment",
  });
  res.status(201).json({ message: saved, flagged: scan.flagged });
});

export default router;
