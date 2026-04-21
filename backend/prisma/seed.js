import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

async function upsertUser({ email, password, role, fullName, phone }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, role, fullName, phone: phone || null, isVerified: true },
  });
}

async function main() {
  // Platform settings
  const settings = [
    ["assignment_commission_percent", 25],
    ["mentor_commission_percent", 15],
    ["min_bid_amount", 200],
    ["max_revision_count", 3],
    ["escrow_hold_days", 3],
    ["mentor_cancellation_window_hours", 4],
  ];
  for (const [k, v] of settings) {
    await prisma.platformSetting.upsert({
      where: { key: k },
      create: { key: k, value: JSON.stringify({ value: v }) },
      update: {},
    });
  }

  const admin = await upsertUser({ email: "admin@assignmentor.local", password: "admin123", role: "admin", fullName: "Platform Admin" });
  const client = await upsertUser({ email: "client@demo.local", password: "client123", role: "client", fullName: "Demo Client" });
  const client2 = await upsertUser({ email: "client2@demo.local", password: "client123", role: "client", fullName: "Riya Client" });
  const doer = await upsertUser({ email: "doer@demo.local", password: "doer123", role: "doer", fullName: "Demo Doer" });
  const doer2 = await upsertUser({ email: "doer2@demo.local", password: "doer123", role: "doer", fullName: "Aarav Doer" });
  const mentor = await upsertUser({ email: "mentor@demo.local", password: "mentor123", role: "mentor", fullName: "Prof. Rao" });

  await prisma.doerProfile.upsert({
    where: { userId: doer.id },
    create: { userId: doer.id, skills: "python,essay_writing,java", bio: "BTech CS, 3 years of writing experience", isApproved: true, rating: 4.6, totalCompleted: 12 },
    update: { isApproved: true },
  });
  await prisma.doerProfile.upsert({
    where: { userId: doer2.id },
    create: { userId: doer2.id, skills: "mathematics,ml,python", bio: "MSc Math; specialises in statistics assignments", isApproved: true, rating: 4.8, totalCompleted: 21 },
    update: { isApproved: true },
  });
  await prisma.mentorProfile.upsert({
    where: { userId: mentor.id },
    create: {
      userId: mentor.id,
      headline: "IIT Bombay | JEE Counsellor & Career Mentor",
      institution: "IIT Bombay",
      bio: "10+ years guiding students through JEE prep, resume building, and internship selection.",
      expertiseAreas: "jee_counselling,resume_review,internship_guidance",
      yearsExperience: 10,
      hourlyRate: 1500,
      monthlySubRate: 4999,
      isApproved: true,
      rating: 4.9,
      totalSessions: 84,
    },
    update: { isApproved: true },
  });

  console.log("Seeded:");
  console.log("  admin    admin@assignmentor.local / admin123");
  console.log("  client   client@demo.local        / client123");
  console.log("  client2  client2@demo.local       / client123");
  console.log("  doer     doer@demo.local          / doer123   (approved)");
  console.log("  doer2    doer2@demo.local         / doer123   (approved)");
  console.log("  mentor   mentor@demo.local        / mentor123 (approved)");
}

main().finally(() => prisma.$disconnect());
