import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();
const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.HTTPS === "1",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post("/signup", async (req, res) => {
  const { name, email, password, college } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hash, college: college || null },
    select: { id: true, name: true, email: true, college: true },
  });
  res.cookie("token", signToken(user.id), cookieOpts).json({ user });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  res.cookie("token", signToken(user.id), cookieOpts).json({
    user: { id: user.id, name: user.name, email: user.email, college: user.college },
  });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token").json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, college: true, bio: true, skills: true },
  });
  res.json({ user });
});

export default router;
