import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { createServer } from "node:http";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { Server } from "socket.io";
import { databaseMode, query } from "./config/db.js";
import { verifySessionToken } from "./middleware/auth.js";
import authRouter from "./routes/auth.js";
import datesRouter from "./routes/dates.js";
import matchesRouter from "./routes/matches.js";
import membershipRouter from "./routes/membership.js";
import messagesRouter, { markPreviewMessagesDelivered } from "./routes/messages.js";
import placesRouter from "./routes/places.js";
import profilesRouter from "./routes/profiles.js";
import safetyRouter from "./routes/safety.js";
import notificationsRouter from "./routes/notifications.js";
import adminRouter from "./routes/admin.js";
import analyticsRouter from "./routes/analytics.js";
import { dispatchPushToUser } from "./services/pushNotifications.js";

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const allowedOrigins = frontendOrigin.split(",").map((origin) => origin.trim()).filter(Boolean);
const allowOrigin = (origin) => !origin || allowedOrigins.includes(origin) || (databaseMode === "preview" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
const corsOrigin = (origin, callback) => callback(allowOrigin(origin) ? null : new Error("Origin not allowed"), allowOrigin(origin));
if (databaseMode === "mysql" && !process.env.JWT_SECRET) throw new Error("JWT_SECRET is required when MySQL is configured.");
const io = new Server(httpServer, { cors: { origin: corsOrigin, credentials: true } });

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }));

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "destinyone-api",
    database: databaseMode,
  });
});

app.use("/api/auth", authRouter);
app.use("/api/dates", datesRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/matches", matchesRouter);
app.use("/api/messages", messagesRouter(io));
app.use("/api/places", rateLimit({ windowMs: 60 * 1000, limit: 45, standardHeaders: "draft-7", legacyHeaders: false }), placesRouter);
app.use("/api/membership", membershipRouter);
app.use("/api/safety", safetyRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/analytics", rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false }), analyticsRouter);

app.use((_request, response) => response.status(404).json({ message: "API route not found." }));

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    message: "Something went wrong. Please try again.",
  });
});

const roomPresence = new Map();
const activeCallTimers = new Map();
const cookieValue = (header, name) => String(header || "").split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
const validConversationId = (value) => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;

async function socketCanAccess(conversationId, userId) {
  if (databaseMode === "preview") return true;
  const rows = await query(
    `SELECT c.id FROM conversations c JOIN matches m ON m.id = c.match_id
     WHERE c.id = ? AND (m.user_id = ? OR m.matched_user_id = ?) AND m.status <> 'blocked' LIMIT 1`,
    [conversationId, userId, userId],
  );
  return rows.length > 0;
}

async function conversationRecipient(conversationId, userId) {
  if (databaseMode === "preview") return Number(userId) === 1 ? 102 : 1;
  const rows = await query(
    `SELECT CASE WHEN m.user_id=? THEN m.matched_user_id ELSE m.user_id END AS recipientUserId
     FROM conversations c JOIN matches m ON m.id=c.match_id WHERE c.id=? LIMIT 1`,
    [userId, conversationId],
  );
  return rows[0]?.recipientUserId || null;
}

function addPresence(conversationId, userId, socketId) {
  const conversation = roomPresence.get(conversationId) || new Map();
  const sockets = conversation.get(userId) || new Set();
  const wasOffline = sockets.size === 0;
  sockets.add(socketId); conversation.set(userId, sockets); roomPresence.set(conversationId, conversation);
  return wasOffline;
}

function removePresence(conversationId, userId, socketId) {
  const conversation = roomPresence.get(conversationId); const sockets = conversation?.get(userId);
  if (!conversation || !sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) conversation.delete(userId);
  if (conversation.size === 0) roomPresence.delete(conversationId);
  return sockets.size === 0;
}

const safeCallId = (value) => /^[A-Za-z0-9][A-Za-z0-9._:-]{7,79}$/.test(String(value || "")) ? String(value) : null;
const safeCallMode = (value) => value === "video" ? "video" : value === "audio" ? "audio" : null;
function safeSignal(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!["offer", "answer", "ice"].includes(value.type)) return null;
  try { return JSON.stringify(value).length <= 65536 ? value : null; } catch { return null; }
}

io.use((socket, next) => {
  if (databaseMode === "preview") { socket.data.user = { id: Number(socket.handshake.auth?.userId || 1), email: "preview@destinyone.app" }; return next(); }
  const bearer = String(socket.handshake.auth?.token || "");
  const token = bearer || cookieValue(socket.handshake.headers.cookie, "destinyone_session");
  if (!token) return next(new Error("Authentication required"));
  try { socket.data.user = verifySessionToken(token); return next(); }
  catch { return next(new Error("Session expired")); }
});

io.on("connection", (socket) => {
  socket.data.conversations = new Set();
  socket.on("conversation:join", async (value, acknowledge) => {
    try {
      const conversationId = validConversationId(value);
      if (!conversationId || !(await socketCanAccess(conversationId, socket.data.user.id))) return acknowledge?.({ ok: false, error: "Conversation unavailable" });
      const room = `conversation:${conversationId}`;
      socket.join(room); socket.data.conversations.add(conversationId);
      const firstSocketForMember = addPresence(conversationId, socket.data.user.id, socket.id);
      let deliveredReceipts = [];
      if (databaseMode === "preview") deliveredReceipts = markPreviewMessagesDelivered(conversationId, socket.data.user.id);
      else {
        const pending = await query(
          "SELECT id, client_id AS clientId FROM messages WHERE conversation_id = ? AND sender_id <> ? AND delivery_status = 'sent'",
          [conversationId, socket.data.user.id],
        );
        if (pending.length) {
          await query(
            "UPDATE messages SET delivery_status = 'delivered', delivered_at = NOW() WHERE conversation_id = ? AND sender_id <> ? AND delivery_status = 'sent'",
            [conversationId, socket.data.user.id],
          );
          const deliveredAt = new Date().toISOString();
          deliveredReceipts = pending.map((message) => ({ conversationId, messageId: message.id, clientId: message.clientId || null, status: "delivered", at: deliveredAt }));
        }
      }
      deliveredReceipts.forEach((receipt) => io.to(room).emit("message:receipt", receipt));
      if (firstSocketForMember) socket.to(room).emit("presence:update", { conversationId, userId: socket.data.user.id, online: true, at: new Date().toISOString() });
      return acknowledge?.({ ok: true });
    } catch { return acknowledge?.({ ok: false, error: "Join failed" }); }
  });
  socket.on("conversation:leave", (value) => {
    const conversationId = validConversationId(value); if (!conversationId) return;
    const room = `conversation:${conversationId}`; socket.leave(room); socket.data.conversations.delete(conversationId);
    const wentOffline = removePresence(conversationId, socket.data.user.id, socket.id);
    if (wentOffline) socket.to(room).emit("presence:update", { conversationId, userId: socket.data.user.id, online: false, at: new Date().toISOString() });
  });
  const publishTyping = (typing) => ({ conversationId: value }) => {
    const conversationId = validConversationId(value); if (!conversationId || !socket.data.conversations.has(conversationId)) return;
    socket.to(`conversation:${conversationId}`).emit("typing:update", { conversationId, userId: socket.data.user.id, typing, at: new Date().toISOString() });
  };
  socket.on("typing:start", publishTyping(true));
  socket.on("typing:stop", publishTyping(false));
  socket.on("message:read", async ({ conversationId: value, messageId }) => {
    const conversationId = validConversationId(value); const id = validConversationId(messageId);
    if (!conversationId || !id || !socket.data.conversations.has(conversationId)) return;
    if (databaseMode === "mysql") await query("UPDATE messages SET delivery_status = 'read', delivered_at = COALESCE(delivered_at, NOW()), read_at = NOW() WHERE id = ? AND conversation_id = ? AND sender_id <> ?", [id, conversationId, socket.data.user.id]);
    io.to(`conversation:${conversationId}`).emit("message:receipt", { conversationId, messageId: id, status: "read", byUserId: socket.data.user.id, at: new Date().toISOString() });
  });
  for (const event of ["invite", "accept", "reject", "end", "signal"]) {
    socket.on(`call:${event}`, async ({ conversationId: value, ...payload } = {}) => {
      const conversationId = validConversationId(value); if (!conversationId || !socket.data.conversations.has(conversationId)) return;
      const clientCallId = safeCallId(payload.clientCallId); if (!clientCallId) return;
      const mode = safeCallMode(payload.mode);
      const signal = event === "signal" ? safeSignal(payload.signal) : null;
      if (event === "invite" && !mode) return;
      if (event === "signal" && !signal) return;
      if (databaseMode === "mysql" && event === "invite") {
        await query(
          "INSERT INTO conversation_calls (client_call_id, conversation_id, caller_id, call_type, status) VALUES (?, ?, ?, ?, 'ringing')",
          [clientCallId, conversationId, socket.data.user.id, mode],
        );
      } else if (databaseMode === "mysql" && ["accept", "reject", "end"].includes(event)) {
        const status = event === "accept" ? "accepted" : event === "reject" ? "rejected" : "ended";
        const timestamps = event === "accept" ? ", answered_at = NOW()" : ", ended_at = NOW()";
        await query(`UPDATE conversation_calls SET status = ?${timestamps} WHERE client_call_id = ? AND conversation_id = ?`, [status, clientCallId, conversationId]);
      }
      if (["accept", "reject", "end"].includes(event)) { clearTimeout(activeCallTimers.get(clientCallId)); activeCallTimers.delete(clientCallId); }
      if (event === "invite") {
        const timer = setTimeout(async () => {
          activeCallTimers.delete(clientCallId);
          if (databaseMode === "mysql") await query("UPDATE conversation_calls SET status='missed', ended_at=NOW() WHERE client_call_id=? AND conversation_id=? AND status='ringing'", [clientCallId, conversationId]);
          io.to(`conversation:${conversationId}`).emit("call:event", { event: "missed", conversationId, clientCallId, at: new Date().toISOString() });
        }, 35000);
        activeCallTimers.set(clientCallId, timer);
        const recipientUserId = await conversationRecipient(conversationId, socket.data.user.id);
        if (recipientUserId) void dispatchPushToUser(recipientUserId, {
          title: `Incoming ${mode} call`, body: "A verified mutual match is calling on DestinyOne.",
          data: { type: "call", conversationId, clientCallId, mode }, url: `/messages?conversation=${conversationId}&call=${clientCallId}`,
          tag: `call-${clientCallId}`,
        }).catch((error) => console.warn("[push] call notification failed", error?.message || error));
      }
      socket.to(`conversation:${conversationId}`).emit("call:event", { event, conversationId, clientCallId, mode: mode || payload.mode, signal, fromUserId: socket.data.user.id, at: new Date().toISOString() });
    });
  }
  socket.on("disconnect", () => {
    for (const conversationId of socket.data.conversations) {
      const wentOffline = removePresence(conversationId, socket.data.user.id, socket.id);
      socket.to(`conversation:${conversationId}`).emit("typing:update", { conversationId, userId: socket.data.user.id, typing: false, at: new Date().toISOString() });
      if (wentOffline) socket.to(`conversation:${conversationId}`).emit("presence:update", { conversationId, userId: socket.data.user.id, online: false, at: new Date().toISOString() });
    }
  });
});

httpServer.listen(port, () => {
  console.log(`DestinyOne API running at http://localhost:${port} (${databaseMode} mode)`);
});
