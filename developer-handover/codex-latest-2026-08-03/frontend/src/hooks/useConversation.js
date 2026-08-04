import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export default function useConversation(conversationId, handlers = {}) {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);
  const [connected, setConnected] = useState(false);
  handlersRef.current = handlers;
  useEffect(() => {
    const canConnect = Boolean(process.env.NEXT_PUBLIC_SOCKET_URL) || ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (!canConnect) return undefined;
    const previewUserId = Number(new URLSearchParams(window.location.search).get("viewer")) || 1;
    const socket = io(socketUrl, { withCredentials: true, transports: ["websocket", "polling"], auth: { userId: previewUserId } });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("conversation:join", conversationId, (result) => setConnected(Boolean(result?.ok)));
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("message:new", (message) => handlersRef.current.onMessage?.(message));
    socket.on("typing:update", (payload) => handlersRef.current.onTyping?.(payload));
    socket.on("presence:update", (payload) => handlersRef.current.onPresence?.(payload));
    socket.on("message:receipt", (payload) => handlersRef.current.onReceipt?.(payload));
    socket.on("call:event", (payload) => handlersRef.current.onCallEvent?.(payload));
    return () => {
      socket.emit("conversation:leave", conversationId);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [conversationId]);
  const emitTyping = useCallback((typing) => socketRef.current?.emit(typing ? "typing:start" : "typing:stop", { conversationId }), [conversationId]);
  const markRead = useCallback((messageId) => socketRef.current?.emit("message:read", { conversationId, messageId }), [conversationId]);
  const emitCall = useCallback((event, payload = {}) => socketRef.current?.emit(`call:${event}`, { conversationId, ...payload }), [conversationId]);
  return { connected, emitTyping, markRead, emitCall };
}
