import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const kind = req.query.kind;
  const where = kind === "OFFER" || kind === "REQUEST" ? { kind } : {};
  const services = await prisma.service.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true, college: true } } },
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
    include: { author: { select: { id: true, name: true, college: true, bio: true, skills: true } } },
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
