import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const { receiverId, serviceId, message } = req.body;
  if (!receiverId) return res.status(400).json({ error: "receiverId required" });
  if (receiverId === req.userId) return res.status(400).json({ error: "Cannot connect to self" });

  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!receiver) return res.status(404).json({ error: "Receiver not found" });

  try {
    const cr = await prisma.connectionRequest.create({
      data: { senderId: req.userId, receiverId, serviceId: serviceId || null, message: message || null },
    });
    res.status(201).json({ request: cr });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Request already exists" });
    throw err;
  }
});

router.get("/incoming", requireAuth, async (req, res) => {
  const reqs = await prisma.connectionRequest.findMany({
    where: { receiverId: req.userId },
    orderBy: { createdAt: "desc" },
    include: { sender: { select: { id: true, name: true, college: true } } },
  });
  res.json({ requests: reqs });
});

router.get("/outgoing", requireAuth, async (req, res) => {
  const reqs = await prisma.connectionRequest.findMany({
    where: { senderId: req.userId },
    orderBy: { createdAt: "desc" },
    include: { receiver: { select: { id: true, name: true, college: true } } },
  });
  res.json({ requests: reqs });
});

async function respond(req, res, status) {
  const cr = await prisma.connectionRequest.findUnique({ where: { id: req.params.id } });
  if (!cr) return res.status(404).json({ error: "Not found" });
  if (cr.receiverId !== req.userId) return res.status(403).json({ error: "Forbidden" });
  if (cr.status !== "PENDING") return res.status(409).json({ error: "Already responded" });

  const updated = await prisma.connectionRequest.update({
    where: { id: cr.id },
    data: { status, respondedAt: new Date() },
  });

  let conversation = null;
  if (status === "ACCEPTED") {
    conversation = await prisma.conversation.create({
      data: {
        participants: { connect: [{ id: cr.senderId }, { id: cr.receiverId }] },
      },
    });
  }
  res.json({ request: updated, conversation });
}

router.post("/:id/accept", requireAuth, (req, res) => respond(req, res, "ACCEPTED"));
router.post("/:id/reject", requireAuth, (req, res) => respond(req, res, "REJECTED"));

export default router;
