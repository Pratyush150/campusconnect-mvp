import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { kind, q, tag } = req.query;
  const AND = [];
  if (kind === "OFFER" || kind === "REQUEST") AND.push({ kind });
  if (tag) AND.push({ tags: { contains: String(tag) } });
  if (q) {
    const s = String(q);
    AND.push({ OR: [{ title: { contains: s } }, { description: { contains: s } }] });
  }

  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: req.userId }, { blockedId: req.userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const excludeIds = new Set();
  for (const b of blocks) {
    excludeIds.add(b.blockerId === req.userId ? b.blockedId : b.blockerId);
  }
  if (excludeIds.size) AND.push({ authorId: { notIn: Array.from(excludeIds) } });

  const services = await prisma.service.findMany({
    where: AND.length ? { AND } : {},
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true, college: true, avatarUrl: true } } },
    take: 100,
  });
  res.json({ services });
});

router.post("/", requireAuth, async (req, res) => {
  const { kind, title, description, tags } = req.body;
  if (!["OFFER", "REQUEST"].includes(kind)) return res.status(400).json({ error: "Invalid kind" });
  if (!title || !description) return res.status(400).json({ error: "Missing fields" });
  const service = await prisma.service.create({
    data: { kind, title, description, tags: tags || null, authorId: req.userId },
    include: { author: { select: { id: true, name: true, college: true } } },
  });
  res.status(201).json({ service });
});

router.get("/:id", requireAuth, async (req, res) => {
  const service = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: {
      author: {
        select: {
          id: true, name: true, college: true, bio: true, skills: true,
          avatarUrl: true, year: true, major: true,
        },
      },
    },
  });
  if (!service) return res.status(404).json({ error: "Not found" });
  res.json({ service });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const svc = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!svc) return res.status(404).json({ error: "Not found" });
  if (svc.authorId !== req.userId) return res.status(403).json({ error: "Forbidden" });
  await prisma.service.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
