import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { notifyUser } from "../lib/notify.js";

const router = Router();

// POST /api/reviews — write a review.
// Body: { type, referenceId, rating (1–5), text? }
//  type=assignment       → rater = client of completed assignment, ratee = assignedDoer
//  type=mentor_session   → rater = student of confirmed booking, ratee = mentor
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { type, referenceId, rating, text } = req.body;
    const r = Number(rating);
    if (!type || !referenceId || !Number.isFinite(r) || r < 1 || r > 5) {
      return res.status(400).json({ error: "type, referenceId, rating (1–5) required" });
    }
    const trimmedText = text ? String(text).slice(0, 1000) : null;

    let rateeId = null;
    if (type === "assignment") {
      const a = await prisma.assignmentRequest.findUnique({ where: { id: referenceId } });
      if (!a) return res.status(404).json({ error: "Assignment not found" });
      if (a.clientId !== req.userId) return res.status(403).json({ error: "Only the client can review the doer" });
      if (a.status !== "completed") return res.status(409).json({ error: "Review allowed only after completion" });
      if (!a.assignedDoerId) return res.status(409).json({ error: "No doer to review" });
      rateeId = a.assignedDoerId;
    } else if (type === "mentor_session") {
      const b = await prisma.mentorBooking.findUnique({ where: { id: referenceId } });
      if (!b) return res.status(404).json({ error: "Booking not found" });
      if (b.studentId !== req.userId) return res.status(403).json({ error: "Only the student can review the mentor" });
      if (!["confirmed", "completed"].includes(b.status)) return res.status(409).json({ error: "Review allowed only after a confirmed/completed session" });
      rateeId = b.mentorId;
    } else {
      return res.status(400).json({ error: "Unknown type" });
    }

    if (rateeId === req.userId) return res.status(400).json({ error: "Cannot review yourself" });

    let saved;
    try {
      saved = await prisma.$transaction(async (tx) => {
        const review = await tx.review.create({
          data: { raterId: req.userId, rateeId, rating: r, text: trimmedText, type, referenceId },
        });
        // Update rolling aggregate on the appropriate profile.
        const aggr = await tx.review.aggregate({
          where: { rateeId },
          _avg: { rating: true }, _count: { _all: true },
        });
        if (type === "assignment") {
          await tx.doerProfile.updateMany({
            where: { userId: rateeId },
            data: { rating: aggr._avg.rating || 0, totalCompleted: aggr._count._all },
          });
        } else {
          await tx.mentorProfile.updateMany({
            where: { userId: rateeId },
            data: { rating: aggr._avg.rating || 0, totalSessions: aggr._count._all },
          });
        }
        return review;
      });
    } catch (e) {
      if (e.code === "P2002") return res.status(409).json({ error: "You've already reviewed this" });
      throw e;
    }

    await audit({ actorId: req.userId, entity: "review", entityId: saved.id, action: "create", metadata: { type, rating: r } });
    await notifyUser(rateeId, {
      title: `New ${r}★ review`,
      message: trimmedText ? trimmedText.slice(0, 100) : "Someone reviewed you.",
      type: "system", referenceId, referenceType: type,
    });
    res.status(201).json({ review: saved });
  } catch (e) { next(e); }
});

// GET /api/reviews/user/:userId — public list of reviews + average for a user.
router.get("/user/:userId", async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const [reviews, aggr] = await Promise.all([
      prisma.review.findMany({
        where: { rateeId: userId },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true, rating: true, text: true, type: true, createdAt: true,
          rater: { select: { fullName: true, role: true } },
        },
      }),
      prisma.review.aggregate({
        where: { rateeId: userId },
        _avg: { rating: true }, _count: { _all: true },
      }),
    ]);
    res.json({
      reviews,
      average: aggr._avg.rating || 0,
      count: aggr._count._all,
    });
  } catch (e) { next(e); }
});

// GET /api/reviews/mine — what I've already reviewed (so client UI can hide button).
router.get("/mine", requireAuth, async (req, res) => {
  const rows = await prisma.review.findMany({
    where: { raterId: req.userId },
    select: { type: true, referenceId: true, rating: true },
  });
  res.json({ reviews: rows });
});

export default router;
