import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

export async function isParticipantWithAcceptedConn(userId, conversationId) {
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: { select: { id: true } } },
  });
  if (!convo) return false;
  const ids = convo.participants.map((p) => p.id);
  if (!ids.includes(userId)) return false;
  const [a, b] = ids;
  const accepted = await prisma.connectionRequest.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { senderId: a, receiverId: b },
        { senderId: b, receiverId: a },
      ],
    },
  });
  return Boolean(accepted);
}

router.get("/", requireAuth, async (req, res) => {
  const convos = await prisma.conversation.findMany({
    where: { participants: { some: { id: req.userId } } },
    include: {
      participants: { select: { id: true, name: true, college: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ conversations: convos });
});

router.get("/:id/messages", requireAuth, async (req, res) => {
  const allowed = await isParticipantWithAcceptedConn(req.userId, req.params.id);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  const messages = await prisma.message.findMany({
    where: { conversationId: req.params.id },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, name: true } } },
  });
  res.json({ messages });
});

export default router;
