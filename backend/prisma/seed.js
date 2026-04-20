import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const pw = await bcrypt.hash("password123", 10);
  const alice = await prisma.user.upsert({
    where: { email: "alice@campus.edu" },
    update: {},
    create: {
      name: "Alice",
      email: "alice@campus.edu",
      password: pw,
      college: "Demo College",
      bio: "3rd-year CS. Loves DSA.",
      skills: "DSA,Java,Graphs",
    },
  });
  const bob = await prisma.user.upsert({
    where: { email: "bob@campus.edu" },
    update: {},
    create: {
      name: "Bob",
      email: "bob@campus.edu",
      password: pw,
      college: "Demo College",
      bio: "2nd-year CS, learning web dev.",
      skills: "React,CSS,HTML",
    },
  });

  await prisma.service.createMany({
    data: [
      { kind: "REQUEST", title: "Need help with DSA trees", description: "Stuck on AVL rotations — need a short tutor session.", tags: "DSA,Trees", authorId: bob.id },
      { kind: "OFFER",   title: "Can teach React basics",   description: "Happy to help anyone picking up React/Vite.",       tags: "React,JS",    authorId: bob.id },
      { kind: "OFFER",   title: "DSA tutor — Graphs & DP",  description: "I tutor weekly — comfortable across Graphs and DP.", tags: "DSA,Graphs",  authorId: alice.id },
    ],
  });

  console.log("Seeded:", { alice: alice.email, bob: bob.email, password: "password123" });
}

main().finally(() => prisma.$disconnect());
