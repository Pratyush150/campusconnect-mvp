import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { serialize } from "../lib/notify.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const notifs = await prisma.notification.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = await prisma.notification.count({
    where: { userId: req.userId, readAt: null },
  });
  res.json({ notifications: notifs.map(serialize), unread });
});

router.post("/:id/read", requireAuth, async (req, res) => {
  const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!n || n.userId !== req.userId) return res.status(404).json({ error: "Not found" });
  if (!n.readAt) await prisma.notification.update({ where: { id: n.id }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

router.post("/read-all", requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});

export default router;
