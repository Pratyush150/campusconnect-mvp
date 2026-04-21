import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";

const router = Router();

router.get("/earnings", requireAuth, async (req, res) => {
  const whereField = req.userRole === "doer" ? "earningType" : "earningType";
  const type = req.userRole === "mentor" ? "mentor_commission" : "assignment_commission";
  const rows = await prisma.platformEarning.findMany({
    where: {
      earningType: type,
      payment: req.userRole === "doer"
        ? { assignment: { assignedDoerId: req.userId } }
        : { referenceType: "booking" },
    },
    include: { payment: true },
    orderBy: { createdAt: "desc" },
  });
  const availableForPayout = rows
    .filter((e) => e.status === "pending")
    .reduce((s, e) => s + e.providerPayout, 0);
  res.json({ earnings: rows, availableForPayout });
});

router.post("/request", requireAuth, async (req, res) => {
  if (!["doer", "mentor"].includes(req.userRole)) return res.status(403).json({ error: "Only doer/mentor can payout" });
  const bank = await prisma.bankAccount.findFirst({ where: { userId: req.userId, isPrimary: true } });
  if (!bank) return res.status(400).json({ error: "Add bank account first" });
  const amount = Number(req.body.amount);
  if (!amount || amount < 100) return res.status(400).json({ error: "Minimum ₹100" });
  const p = await prisma.payout.create({
    data: { userId: req.userId, amount, bankDetails: JSON.stringify({ accountNumber: bank.accountNumber, ifsc: bank.ifscCode, name: bank.accountName, upi: bank.upiId }) },
  });
  await audit({ actorId: req.userId, entity: "payout", entityId: p.id, action: "request" });
  res.status(201).json({ payout: p });
});

router.get("/history", requireAuth, async (req, res) => {
  const rows = await prisma.payout.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ payouts: rows });
});

router.put("/bank-account", requireAuth, async (req, res) => {
  if (!["doer", "mentor"].includes(req.userRole)) return res.status(403).json({ error: "Forbidden" });
  const { accountName, accountNumber, ifscCode, upiId } = req.body;
  if (!accountName || !accountNumber || !ifscCode) return res.status(400).json({ error: "Missing bank fields" });
  await prisma.bankAccount.updateMany({ where: { userId: req.userId }, data: { isPrimary: false } });
  const b = await prisma.bankAccount.create({
    data: { userId: req.userId, accountName, accountNumber, ifscCode, upiId: upiId || null, isPrimary: true },
  });
  res.json({ bankAccount: b });
});

export default router;
