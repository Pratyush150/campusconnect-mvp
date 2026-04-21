import { prisma } from "./prisma.js";

let io = null;
export function setIo(server) { io = server; }

export async function notifyUser(userId, { title, message, type, referenceId, referenceType }) {
  const n = await prisma.notification.create({
    data: {
      userId, title, message, type: type || "system",
      referenceId: referenceId || null, referenceType: referenceType || null,
    },
  });
  if (io) io.to(`user:${userId}`).emit("notification:new", n);
  return n;
}
