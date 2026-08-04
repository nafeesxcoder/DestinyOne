import { Router } from "express";
import { databaseMode, query } from "../config/db.js";
import { previewMessages } from "../data/mockData.js";
import { requireAuth } from "../middleware/auth.js";
import { positiveId } from "../utils/validation.js";
import { dispatchPushToUser } from "../services/pushNotifications.js";

const messageTypes = new Set(["text", "image", "voice", "location", "document", "date", "gift", "gif", "sticker"]);
const receiptStatuses = new Set(["sent", "delivered", "read"]);
const previewStore = previewMessages.map((message) => ({ ...message, type: "text", status: message.senderId === 1 ? "read" : "delivered", payload: null }));
const previewPreferences = new Map();
const previewReactions = new Map();
const previewStars = new Set();

export function markPreviewMessagesDelivered(conversationId, recipientUserId) {
  const deliveredAt = new Date().toISOString();
  return previewStore
    .filter((message) => message.conversationId === conversationId && message.senderId !== recipientUserId && message.status === "sent")
    .map((message) => {
      message.status = "delivered";
      message.deliveredAt = deliveredAt;
      return { conversationId, messageId: message.id, clientId: message.clientId || null, status: "delivered", at: deliveredAt };
    });
}

function safeJson(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function normalizeMessage(row) {
  let payload = row.payload ?? row.payloadJson ?? null;
  if (typeof payload === "string") { try { payload = JSON.parse(payload); } catch { payload = null; } }
  return {
    id: row.id,
    clientId: row.clientId || null,
    conversationId: row.conversationId,
    senderId: row.senderId,
    body: row.body,
    type: row.type || "text",
    payload,
    status: row.status || "sent",
    createdAt: row.createdAt,
    deliveredAt: row.deliveredAt || null,
    readAt: row.readAt || null,
  };
}

async function canAccessConversation(conversationId, userId) {
  if (databaseMode === "preview") return true;
  const rows = await query(
    `SELECT c.id FROM conversations c JOIN matches m ON m.id = c.match_id
     WHERE c.id = ? AND (m.user_id = ? OR m.matched_user_id = ?) AND m.status <> 'blocked' LIMIT 1`,
    [conversationId, userId, userId],
  );
  return rows.length > 0;
}

export default function messagesRouter(io) {
  const router = Router();
  router.use(requireAuth);

  router.get("/:conversationId", async (request, response, next) => {
    try {
      const conversationId = positiveId(request.params.conversationId);
      if (!conversationId) return response.status(400).json({ message: "Invalid conversation." });
      if (!(await canAccessConversation(conversationId, request.user.id))) return response.status(403).json({ message: "You cannot access this conversation." });
      if (databaseMode === "preview") return response.json(previewStore.filter((item) => item.conversationId === conversationId).map(normalizeMessage));
      const rows = await query(
        `SELECT msg.id, msg.client_id AS clientId, msg.conversation_id AS conversationId, msg.sender_id AS senderId,
         msg.body, msg.message_type AS type, msg.payload_json AS payloadJson, msg.delivery_status AS status,
         msg.created_at AS createdAt, msg.delivered_at AS deliveredAt, msg.read_at AS readAt
         FROM messages msg WHERE msg.conversation_id = ? ORDER BY msg.created_at ASC LIMIT 200`,
        [conversationId],
      );
      return response.json(rows.map(normalizeMessage));
    } catch (error) { return next(error); }
  });

  router.post("/:conversationId", async (request, response, next) => {
    try {
      const conversationId = positiveId(request.params.conversationId);
      const body = String(request.body?.body || "").trim();
      const type = messageTypes.has(request.body?.type) ? request.body.type : "text";
      const clientId = String(request.body?.clientId || "").trim().slice(0, 80) || null;
      const payload = safeJson(request.body?.payload);
      if (!conversationId) return response.status(400).json({ message: "Invalid conversation." });
      if (!body || body.length > 2000) return response.status(400).json({ message: "Message must be between 1 and 2,000 characters." });
      if (!(await canAccessConversation(conversationId, request.user.id))) return response.status(403).json({ message: "You cannot access this conversation." });
      let message;
      let recipientUserId = null;
      if (databaseMode === "preview") {
        recipientUserId = request.user.id === 1 ? 102 : 1;
        message = normalizeMessage({ id: previewStore.length + 1, clientId, conversationId, senderId: request.user.id, body, type, payload, status: "sent", createdAt: new Date().toISOString() });
        previewStore.push(message);
      } else {
        const recipientRows = await query(
          `SELECT CASE WHEN m.user_id=? THEN m.matched_user_id ELSE m.user_id END AS recipientUserId
           FROM conversations c JOIN matches m ON m.id=c.match_id WHERE c.id=? LIMIT 1`,
          [request.user.id, conversationId],
        );
        recipientUserId = recipientRows[0]?.recipientUserId || null;
        const result = await query(
          "INSERT INTO messages (client_id, conversation_id, sender_id, body, message_type, payload_json, delivery_status) VALUES (?, ?, ?, ?, ?, ?, 'sent')",
          [clientId, conversationId, request.user.id, body, type, payload ? JSON.stringify(payload) : null],
        );
        message = normalizeMessage({ id: result.insertId, clientId, conversationId, senderId: request.user.id, body, type, payload, status: "sent", createdAt: new Date().toISOString() });
      }
      io.to(`conversation:${conversationId}`).emit("message:new", message);
      const roomSockets = await io.in(`conversation:${conversationId}`).fetchSockets();
      const recipientIsConnected = roomSockets.some((socket) => Number(socket.data.user?.id) !== Number(request.user.id));
      if (recipientIsConnected) {
        const deliveredAt = new Date().toISOString();
        message.status = "delivered"; message.deliveredAt = deliveredAt;
        if (databaseMode === "preview") {
          const stored = previewStore.find((item) => String(item.id) === String(message.id));
          if (stored) { stored.status = "delivered"; stored.deliveredAt = deliveredAt; }
        } else await query("UPDATE messages SET delivery_status = 'delivered', delivered_at = NOW() WHERE id = ?", [message.id]);
        io.to(`conversation:${conversationId}`).emit("message:receipt", { conversationId, messageId: message.id, clientId: message.clientId, status: "delivered", at: deliveredAt });
      }
      if (recipientUserId) {
        void dispatchPushToUser(recipientUserId, {
          title: "New DestinyOne message",
          body: "A private message is waiting in your mutual-match conversation.",
          data: { type: "message", conversationId, messageId: message.id },
          url: `/messages?conversation=${conversationId}`,
          tag: `conversation-${conversationId}`,
        }).catch((error) => console.warn("[push] message notification failed", error?.message || error));
      }
      return response.status(201).json(message);
    } catch (error) { return next(error); }
  });

  router.patch("/:conversationId/:messageId/receipt", async (request, response, next) => {
    try {
      const conversationId = positiveId(request.params.conversationId);
      const messageId = positiveId(request.params.messageId);
      const status = String(request.body?.status || "");
      if (!conversationId || !messageId || !receiptStatuses.has(status)) return response.status(400).json({ message: "Invalid receipt update." });
      if (!(await canAccessConversation(conversationId, request.user.id))) return response.status(403).json({ message: "You cannot access this conversation." });
      const now = new Date().toISOString();
      if (databaseMode === "preview") {
        const item = previewStore.find((message) => Number(message.id) === messageId && message.conversationId === conversationId);
        if (item) { item.status = status; if (status === "delivered") item.deliveredAt = now; if (status === "read") { item.deliveredAt ||= now; item.readAt = now; } }
      } else {
        const sql = status === "read"
          ? "UPDATE messages SET delivery_status = 'read', delivered_at = COALESCE(delivered_at, NOW()), read_at = NOW() WHERE id = ? AND conversation_id = ?"
          : status === "delivered"
            ? "UPDATE messages SET delivery_status = 'delivered', delivered_at = NOW() WHERE id = ? AND conversation_id = ? AND delivery_status = 'sent'"
            : "UPDATE messages SET delivery_status = 'sent' WHERE id = ? AND conversation_id = ?";
        await query(sql, [messageId, conversationId]);
      }
      const receipt = { conversationId, messageId, status, at: now, byUserId: request.user.id };
      io.to(`conversation:${conversationId}`).emit("message:receipt", receipt);
      return response.json(receipt);
    } catch (error) { return next(error); }
  });

  router.get("/:conversationId/search", async (request, response, next) => {
    try {
      const conversationId = positiveId(request.params.conversationId);
      const term = String(request.query.q || "").trim().slice(0, 80);
      if (!conversationId || term.length < 2) return response.status(400).json({ message: "Enter at least two characters." });
      if (!(await canAccessConversation(conversationId, request.user.id))) return response.status(403).json({ message: "You cannot access this conversation." });
      if (databaseMode === "preview") return response.json(previewStore.filter((item) => item.conversationId === conversationId && item.body.toLowerCase().includes(term.toLowerCase())).map(normalizeMessage));
      const rows = await query(
        `SELECT id,client_id AS clientId,conversation_id AS conversationId,sender_id AS senderId,body,message_type AS type,
         payload_json AS payloadJson,delivery_status AS status,created_at AS createdAt,delivered_at AS deliveredAt,read_at AS readAt
         FROM messages WHERE conversation_id=? AND body LIKE ? ORDER BY created_at DESC LIMIT 50`,
        [conversationId, `%${term.replace(/[%_]/g, "\\$&")}%`],
      );
      return response.json(rows.map(normalizeMessage));
    } catch (error) { return next(error); }
  });

  router.put("/:conversationId/:messageId/reaction", async (request, response, next) => {
    try {
      const conversationId = positiveId(request.params.conversationId);
      const messageId = positiveId(request.params.messageId);
      const emoji = String(request.body?.emoji || "").trim().slice(0, 16);
      if (!conversationId || !messageId || !emoji) return response.status(400).json({ message: "Choose a reaction." });
      if (!(await canAccessConversation(conversationId, request.user.id))) return response.status(403).json({ message: "You cannot access this conversation." });
      if (databaseMode === "preview") previewReactions.set(`${messageId}:${request.user.id}`, emoji);
      else await query("INSERT INTO message_reactions (message_id,user_id,emoji) VALUES (?,?,?) ON DUPLICATE KEY UPDATE emoji=VALUES(emoji)", [messageId, request.user.id, emoji]);
      const event = { conversationId, messageId, userId: request.user.id, emoji };
      io.to(`conversation:${conversationId}`).emit("message:reaction", event);
      return response.json(event);
    } catch (error) { return next(error); }
  });

  router.put("/:conversationId/:messageId/star", async (request, response, next) => {
    try {
      const conversationId = positiveId(request.params.conversationId);
      const messageId = positiveId(request.params.messageId);
      const starred = request.body?.starred !== false;
      if (!conversationId || !messageId) return response.status(400).json({ message: "Invalid message." });
      if (!(await canAccessConversation(conversationId, request.user.id))) return response.status(403).json({ message: "You cannot access this conversation." });
      const key = `${messageId}:${request.user.id}`;
      if (databaseMode === "preview") starred ? previewStars.add(key) : previewStars.delete(key);
      else if (starred) await query("INSERT IGNORE INTO starred_messages (message_id,user_id) VALUES (?,?)", [messageId, request.user.id]);
      else await query("DELETE FROM starred_messages WHERE message_id=? AND user_id=?", [messageId, request.user.id]);
      return response.json({ conversationId, messageId, starred });
    } catch (error) { return next(error); }
  });

  router.get("/:conversationId/starred", async (request, response, next) => {
    try {
      const conversationId = positiveId(request.params.conversationId);
      if (!conversationId || !(await canAccessConversation(conversationId, request.user.id))) return response.status(403).json({ message: "You cannot access this conversation." });
      if (databaseMode === "preview") return response.json(previewStore.filter((item) => item.conversationId === conversationId && previewStars.has(`${item.id}:${request.user.id}`)).map(normalizeMessage));
      const rows = await query(
        `SELECT msg.id,msg.client_id AS clientId,msg.conversation_id AS conversationId,msg.sender_id AS senderId,msg.body,
         msg.message_type AS type,msg.payload_json AS payloadJson,msg.delivery_status AS status,msg.created_at AS createdAt,
         msg.delivered_at AS deliveredAt,msg.read_at AS readAt FROM starred_messages s JOIN messages msg ON msg.id=s.message_id
         WHERE s.user_id=? AND msg.conversation_id=? ORDER BY s.created_at DESC`,
        [request.user.id, conversationId],
      );
      return response.json(rows.map(normalizeMessage));
    } catch (error) { return next(error); }
  });

  router.get("/:conversationId/preferences/me", async (request, response, next) => {
    try {
      const conversationId = positiveId(request.params.conversationId);
      if (!conversationId || !(await canAccessConversation(conversationId, request.user.id))) return response.status(403).json({ message: "You cannot access this conversation." });
      if (databaseMode === "preview") return response.json(previewPreferences.get(`${conversationId}:${request.user.id}`) || { nickname: "", theme: "Ruby Velvet", notifications: true });
      const rows = await query("SELECT nickname, theme, notifications_enabled AS notifications FROM conversation_preferences WHERE conversation_id = ? AND user_id = ? LIMIT 1", [conversationId, request.user.id]);
      return response.json(rows[0] || { nickname: "", theme: "Ruby Velvet", notifications: true });
    } catch (error) { return next(error); }
  });

  router.put("/:conversationId/preferences/me", async (request, response, next) => {
    try {
      const conversationId = positiveId(request.params.conversationId);
      if (!conversationId || !(await canAccessConversation(conversationId, request.user.id))) return response.status(403).json({ message: "You cannot access this conversation." });
      const preference = { nickname: String(request.body?.nickname || "").trim().slice(0, 32), theme: String(request.body?.theme || "Ruby Velvet").trim().slice(0, 40), notifications: request.body?.notifications !== false };
      if (databaseMode === "preview") previewPreferences.set(`${conversationId}:${request.user.id}`, preference);
      else await query(
        `INSERT INTO conversation_preferences (conversation_id, user_id, nickname, theme, notifications_enabled)
         VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nickname = VALUES(nickname), theme = VALUES(theme), notifications_enabled = VALUES(notifications_enabled)`,
        [conversationId, request.user.id, preference.nickname, preference.theme, preference.notifications],
      );
      return response.json(preference);
    } catch (error) { return next(error); }
  });

  return router;
}
