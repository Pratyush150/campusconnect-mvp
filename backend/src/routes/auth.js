import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { signAccess, requireAuth } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";

const router = Router();
const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.HTTPS === "1",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

const ME_FIELDS = {
  id: true, email: true, role: true, fullName: true, phone: true,
  avatarUrl: true, isActive: true, isVerified: true, createdAt: true,
};

async function createUser({ email, password, role, fullName, phone }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error("Email already registered"); err.status = 409; throw err;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: { email, passwordHash, role, fullName, phone: phone || null },
  });
}

function setSession(res, user) {
  res.cookie("token", signAccess(user.id, user.role), cookieOpts);
}

router.post("/register/client", authLimiter, async (req, res, next) => {
  try {
    const { email, password, fullName, phone } = req.body;
    if (!email || !password || !fullName) return res.status(400).json({ error: "Missing fields" });
    const user = await createUser({ email, password, role: "client", fullName, phone });
    setSession(res, user);
    await audit({ actorId: user.id, entity: "user", entityId: user.id, action: "register_client" });
    const picked = Object.fromEntries(Object.keys(ME_FIELDS).map((k) => [k, user[k]]));
    res.status(201).json({ user: picked });
  } catch (e) { next(e); }
});

router.post("/register/doer", authLimiter, async (req, res, next) => {
  try {
    const { email, password, fullName, phone, skills, bio, education, portfolioUrls } = req.body;
    if (!email || !password || !fullName || !skills?.length) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const user = await createUser({ email, password, role: "doer", fullName, phone });
    await prisma.doerProfile.create({
      data: {
        userId: user.id,
        skills: Array.isArray(skills) ? skills.join(",") : String(skills),
        bio: bio || null,
        education: education || null,
        portfolioUrls: Array.isArray(portfolioUrls) ? portfolioUrls.join("|") : (portfolioUrls || null),
      },
    });
    setSession(res, user);
    await audit({ actorId: user.id, entity: "user", entityId: user.id, action: "register_doer" });
    const picked = Object.fromEntries(Object.keys(ME_FIELDS).map((k) => [k, user[k]]));
    res.status(201).json({ user: picked, note: "Awaiting admin approval before you can bid." });
  } catch (e) { next(e); }
});

router.post("/register/mentor", authLimiter, async (req, res, next) => {
  try {
    const { token, email, password, fullName, phone, headline, institution, bio, expertiseAreas, yearsExperience, linkedinUrl, hourlyRate, monthlySubRate } = req.body;
    if (!token) return res.status(400).json({ error: "Invite token required" });
    const invite = await prisma.mentorInvite.findUnique({ where: { token } });
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invalid or expired invite" });
    }
    if (!email || !password || !fullName || !headline || !institution || !bio || !hourlyRate) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const user = await createUser({ email, password, role: "mentor", fullName, phone });
    await prisma.mentorProfile.create({
      data: {
        userId: user.id,
        headline, institution, bio,
        expertiseAreas: Array.isArray(expertiseAreas) ? expertiseAreas.join(",") : String(expertiseAreas || ""),
        yearsExperience: Number(yearsExperience) || 0,
        linkedinUrl: linkedinUrl || null,
        hourlyRate: Number(hourlyRate),
        monthlySubRate: monthlySubRate ? Number(monthlySubRate) : null,
      },
    });
    await prisma.mentorInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
    setSession(res, user);
    await audit({ actorId: user.id, entity: "user", entityId: user.id, action: "register_mentor" });
    const picked = Object.fromEntries(Object.keys(ME_FIELDS).map((k) => [k, user[k]]));
    res.status(201).json({ user: picked, note: "Awaiting admin approval." });
  } catch (e) { next(e); }
});

router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  setSession(res, user);
  const picked = Object.fromEntries(Object.keys(ME_FIELDS).map((k) => [k, user[k]]));
  res.json({ user: picked });
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token").json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: ME_FIELDS });
  if (!user) {
    res.clearCookie("token");
    return res.status(401).json({ error: "Session no longer valid" });
  }
  let profile = null;
  if (user.role === "doer") profile = await prisma.doerProfile.findUnique({ where: { userId: user.id } });
  if (user.role === "mentor") profile = await prisma.mentorProfile.findUnique({ where: { userId: user.id } });
  res.json({ user, profile });
});

export default router;
