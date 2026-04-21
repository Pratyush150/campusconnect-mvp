import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = await prisma.notification.count({ where: { userId: req.userId, isRead: false } });
  res.json({ notifications, unread });
});

router.put("/:id/read", requireAuth, async (req, res) => {
  const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!n || n.userId !== req.userId) return res.status(404).json({ error: "Not found" });
  await prisma.notification.update({ where: { id: n.id }, data: { isRead: true } });
  res.json({ ok: true });
});

router.put("/read-all", requireAuth, async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.userId, isRead: false }, data: { isRead: true } });
  res.json({ ok: true });
});

export default router;
