import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const PUBLIC_FIELDS = {
  id: true, name: true, email: true, college: true, bio: true, skills: true,
  avatarUrl: true, year: true, major: true, github: true, linkedin: true,
  verified: true, createdAt: true,
};

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: PUBLIC_FIELDS });
  res.json({ user });
});

router.patch("/me", requireAuth, async (req, res) => {
  const allowed = ["name", "college", "bio", "skills", "avatarUrl", "year", "major", "github", "linkedin"];
  const data = {};
  for (const k of allowed) if (k in req.body) data[k] = req.body[k];
  if (data.year != null) data.year = Number(data.year) || null;
  const user = await prisma.user.update({
    where: { id: req.userId }, data, select: PUBLIC_FIELDS,
  });
  res.json({ user });
});

router.get("/:id", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: PUBLIC_FIELDS });
  if (!user) return res.status(404).json({ error: "Not found" });

  const services = await prisma.service.findMany({
    where: { authorId: req.params.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const blockedByMe = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: req.userId, blockedId: req.params.id } },
  });

  res.json({ user, services, blockedByMe: Boolean(blockedByMe) });
});

export default router;
