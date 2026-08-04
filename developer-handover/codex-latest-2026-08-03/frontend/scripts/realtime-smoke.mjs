import { io } from "socket.io-client";

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const conversationId = 1;
const waitFor = (socket, event, timeoutMs = 4000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`${event} timed out`)), timeoutMs);
  socket.once(event, (payload) => { clearTimeout(timer); resolve(payload); });
});
const connect = (userId) => new Promise((resolve, reject) => {
  const socket = io(socketUrl, { transports: ["websocket"], auth: { userId } });
  const timer = setTimeout(() => { socket.disconnect(); reject(new Error(`User ${userId} connection timed out`)); }, 4000);
  socket.once("connect", () => { clearTimeout(timer); socket.emit("conversation:join", conversationId, (result) => result?.ok ? resolve(socket) : reject(new Error(result?.error || "Join failed"))); });
  socket.once("connect_error", reject);
});

const sender = await connect(1);
let recipient = await connect(102);
try {
  const typing = waitFor(recipient, "typing:update");
  sender.emit("typing:start", { conversationId });
  const typingPayload = await typing;

  const callInvite = waitFor(recipient, "call:event");
  sender.emit("call:invite", { conversationId, mode: "audio", clientCallId: "smoke-call" });
  const invitePayload = await callInvite;

  const callAccept = waitFor(sender, "call:event");
  recipient.emit("call:accept", { conversationId, mode: "audio", clientCallId: "smoke-call" });
  const acceptPayload = await callAccept;

  const callOffer = waitFor(recipient, "call:event");
  sender.emit("call:signal", { conversationId, mode: "audio", clientCallId: "smoke-call", signal: { type: "offer", sdp: "v=0\r\ns=DestinyOne smoke\r\n" } });
  const offerPayload = await callOffer;
  const callAnswer = waitFor(sender, "call:event");
  recipient.emit("call:signal", { conversationId, mode: "audio", clientCallId: "smoke-call", signal: { type: "answer", sdp: "v=0\r\ns=DestinyOne answer\r\n" } });
  const answerPayload = await callAnswer;

  const messageEvent = waitFor(recipient, "message:new");
  const receiptEvent = waitFor(sender, "message:receipt");
  const response = await fetch(`${apiUrl}/messages/${conversationId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: "Realtime smoke message", clientId: `smoke-${Date.now()}`, type: "text" }) });
  if (!response.ok) throw new Error(`Message API returned ${response.status}`);
  const [messagePayload, receiptPayload] = await Promise.all([messageEvent, receiptEvent]);

  recipient.disconnect();
  const offlineClientId = `offline-${Date.now()}`;
  const offlineResponse = await fetch(`${apiUrl}/messages/${conversationId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: "Queued while recipient offline", clientId: offlineClientId, type: "text" }) });
  if (!offlineResponse.ok) throw new Error(`Offline message API returned ${offlineResponse.status}`);
  const joinReceipt = waitFor(sender, "message:receipt");
  recipient = await connect(102);
  const joinReceiptPayload = await joinReceipt;

  console.log(JSON.stringify({
    typing: typingPayload.typing === true,
    callInvite: invitePayload.event === "invite",
    callAccept: acceptPayload.event === "accept",
    callOffer: offerPayload.signal?.type === "offer",
    callAnswer: answerPayload.signal?.type === "answer",
    message: messagePayload.body === "Realtime smoke message",
    delivered: receiptPayload.status === "delivered",
    deliveredOnReconnect: joinReceiptPayload.clientId === offlineClientId && joinReceiptPayload.status === "delivered",
  }));
} finally {
  sender.disconnect(); recipient.disconnect();
}
