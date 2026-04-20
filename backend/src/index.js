import express from "express";
import http from "http";
import https from "https";
import fs from "fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Server } from "socket.io";
import cookie from "cookie";

import { prisma } from "./lib/prisma.js";
import { verifyToken } from "./middleware/auth.js";
import { notify, setIo } from "./lib/notify.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import serviceRoutes from "./routes/services.js";
import connectionRoutes from "./routes/connections.js";
import conversationRoutes, { isParticipantWithAcceptedConn } from "./routes/conversations.js";
import notificationRoutes from "./routes/notifications.js";
import blockRoutes from "./routes/blocks.js";

dotenv.config();

const app = express();

const useHttps = process.env.HTTPS === "1" && process.env.SSL_KEY && process.env.SSL_CERT;
const server = useHttps
  ? https.createServer(
      { key: fs.readFileSync(process.env.SSL_KEY), cert: fs.readFileSync(process.env.SSL_CERT) },
      app
    )
  : http.createServer(app);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => res.json({ ok: true, service: "campusconnect-backend" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/blocks", blockRoutes);

app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173", credentials: true },
});
setIo(io);

io.use((socket, next) => {
  const raw = socket.handshake.headers.cookie;
  const cookies = raw ? cookie.parse(raw) : {};
  const payload = cookies.token && verifyToken(cookies.token);
  if (!payload) return next(new Error("Unauthorized"));
  socket.userId = payload.sub;
  next();
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.userId}`);

  socket.on("join", async (conversationId, ack) => {
    const allowed = await isParticipantWithAcceptedConn(socket.userId, conversationId);
    if (!allowed) return ack?.({ ok: false, error: "Forbidden" });
    socket.join(conversationId);
    ack?.({ ok: true });
  });

  socket.on("sendMessage", async ({ conversationId, content }, ack) => {
    if (!conversationId || !content?.trim()) return ack?.({ ok: false, error: "Bad payload" });
    const allowed = await isParticipantWithAcceptedConn(socket.userId, conversationId);
    if (!allowed) return ack?.({ ok: false, error: "Forbidden" });
    const msg = await prisma.message.create({
      data: { conversationId, senderId: socket.userId, content: content.trim() },
      include: { sender: { select: { id: true, name: true } } },
    });
    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    io.to(conversationId).emit("receiveMessage", msg);

    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { select: { id: true } } },
    });
    for (const p of convo.participants) {
      if (p.id !== socket.userId) {
        await notify(p.id, "MESSAGE", {
          conversationId, senderId: socket.userId, senderName: msg.sender?.name,
          preview: msg.content.slice(0, 100),
        });
      }
    }
    ack?.({ ok: true, message: msg });
  });
});

const PORT = Number(process.env.PORT) || 4000;
const scheme = useHttps ? "https" : "http";
server.listen(PORT, () => console.log(`🚀 API + WS on ${scheme}://localhost:${PORT}`));
