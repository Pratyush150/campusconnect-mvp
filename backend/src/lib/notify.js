import { prisma } from "./prisma.js";

let io = null;
export function setIo(server) { io = server; }

export async function notify(userId, type, payload) {
  const n = await prisma.notification.create({
    data: { userId, type, payload: JSON.stringify(payload || {}) },
  });
  if (io) io.to(`user:${userId}`).emit("notification:new", serialize(n));
  return n;
}

export function serialize(n) {
  return { ...n, payload: safeParse(n.payload) };
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
