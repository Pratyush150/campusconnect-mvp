import express from "express";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import pinoHttp from "pino-http";
import { Server } from "socket.io";
import cookie from "cookie";

import { verifyToken, loadUser } from "./middleware/auth.js";
import { setIo } from "./lib/notify.js";

import authRoutes from "./routes/auth.js";
import assignmentRoutes from "./routes/assignments.js";
import adminRoutes from "./routes/admin.js";
import messageRoutes from "./routes/messages.js";
import paymentRoutes from "./routes/payments.js";
import mentorRoutes from "./routes/mentors.js";
import notificationRoutes from "./routes/notifications.js";
import uploadRoutes from "./routes/uploads.js";
import payoutRoutes from "./routes/payouts.js";
import reviewRoutes from "./routes/reviews.js";

dotenv.config();

const app = express();

const useHttps = process.env.HTTPS === "1" && process.env.SSL_KEY && process.env.SSL_CERT;
const server = useHttps
  ? https.createServer(
      { key: fs.readFileSync(process.env.SSL_KEY), cert: fs.readFileSync(process.env.SSL_CERT) },
      app
    )
  : http.createServer(app);

app.use(pinoHttp({ autoLogging: { ignore: (req) => req.url === "/" || req.url?.startsWith("/uploads") } }));
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(loadUser);

app.use("/uploads", express.static(path.resolve("uploads")));
app.get("/", (_req, res) => res.json({ ok: true, service: "campusconnect-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/reviews", reviewRoutes);

app.use((err, req, res, _next) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  req.log?.error({ err: { message: err.message, stack: err.stack } }, "unhandled");
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
  socket.userRole = payload.role;
  next();
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.userId}`);
  if (socket.userRole === "admin") socket.join("admins");
});

const PORT = Number(process.env.PORT) || 4000;
const scheme = useHttps ? "https" : "http";
server.listen(PORT, () => console.log(`🚀 CampusConnect API on ${scheme}://localhost:${PORT}`));
