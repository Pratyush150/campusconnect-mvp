import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

export async function isBlockedBetween(userA, userB) {
  const hit = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    },
  });
  return Boolean(hit);
}

router.get("/", requireAuth, async (req, res) => {
  const blocks = await prisma.block.findMany({
    where: { blockerId: req.userId },
    include: { blocked: { select: { id: true, name: true, college: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ blocks });
});

router.post("/", requireAuth, async (req, res) => {
  const { userId } = req.body;
  if (!userId || userId === req.userId) return res.status(400).json({ error: "Bad target" });
  try {
    await prisma.block.create({ data: { blockerId: req.userId, blockedId: userId } });
  } catch (e) {
    if (e.code !== "P2002") throw e;
  }
  res.json({ ok: true });
});

router.delete("/:userId", requireAuth, async (req, res) => {
  await prisma.block.deleteMany({
    where: { blockerId: req.userId, blockedId: req.params.userId },
  });
  res.json({ ok: true });
});

export default router;
