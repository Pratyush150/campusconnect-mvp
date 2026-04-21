import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export function signAccess(userId, role) {
  return jwt.sign({ sub: userId, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
}

export async function loadUser(req, _res, next) {
  const token = req.cookies?.token;
  const payload = token && verifyToken(token);
  if (payload) {
    req.userId = payload.sub;
    req.userRole = payload.role;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.userRole)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

export async function requireApprovedDoer(req, res, next) {
  if (req.userRole !== "doer") return res.status(403).json({ error: "Doer only" });
  const profile = await prisma.doerProfile.findUnique({ where: { userId: req.userId } });
  if (!profile?.isApproved) return res.status(403).json({ error: "Doer profile not yet approved" });
  next();
}

export async function requireApprovedMentor(req, res, next) {
  if (req.userRole !== "mentor") return res.status(403).json({ error: "Mentor only" });
  const profile = await prisma.mentorProfile.findUnique({ where: { userId: req.userId } });
  if (!profile?.isApproved) return res.status(403).json({ error: "Mentor profile not yet approved" });
  next();
}
