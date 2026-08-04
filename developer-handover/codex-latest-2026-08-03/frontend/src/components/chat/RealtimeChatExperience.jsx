import {
  Bell, CalendarDays, Check, CheckCheck, ChevronLeft, FileText, Image as ImageIcon,
  MapPin, MoreVertical, Phone, Search, Settings, ShieldCheck, Video, Wifi, WifiOff, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatComposer from "./ChatComposer";
import useConversation from "../../hooks/useConversation";
import useWebRtcCall from "../../hooks/useWebRtcCall";
import { api } from "../../services/api";
import { registerBrowserPush } from "../../services/push";

const people = [
  { id: 1, name: "Anika", initial: "A", preview: "That sounds perfect 😊", verified: true, online: true },
  { id: 2, name: "Maya", initial: "M", preview: "You shared a date idea", verified: true, online: false },
  { id: 3, name: "Riya", initial: "R", preview: "Voice note · 0:18", verified: true, online: true },
];

const fallback = {
  1: [
    { id: "seed-1", senderId: 102, body: "Your ideal first date: a quiet café or something outdoors?", createdAt: Date.now() - 9 * 60000, status: "read", type: "text" },
    { id: "seed-2", senderId: 1, body: "A café first, then a walk if the conversation is flowing.", createdAt: Date.now() - 7 * 60000, status: "read", type: "text" },
    { id: "seed-3", senderId: 102, body: "That sounds perfect 😊", createdAt: Date.now() - 5 * 60000, status: "read", type: "text" },
  ],
  2: [{ id: "seed-4", senderId: 1, body: "Date idea · Saturday, 7:30 PM", createdAt: Date.now() - 86400000, status: "delivered", type: "text" }],
  3: [{ id: "seed-5", senderId: 103, body: "I would love to hear your travel story.", createdAt: Date.now() - 3600000, status: "read", type: "text" }],
};

const replyPool = [
  "I like that. Tell me a little more?",
  "That sounds thoughtful — I’d be open to it 😊",
  "Yes, that pace feels comfortable to me.",
];

function uid(prefix = "msg") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function Receipt({ status }) {
  const title = status === "sent" ? "Sent · one tick" : status === "delivered" ? "Delivered · two ticks" : "Read · blue ticks";
  return <span className={`pro-chat-receipt ${status}`} title={title} aria-label={title}>{status === "sent" ? <Check size={15} /> : <CheckCheck size={15} />}</span>;
}

function CallDialog({ person, mode, onClose, emitCall, callEvent, incomingCallId = null }) {
  const [seconds, setSeconds] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const call = useWebRtcCall({ mode, incomingCallId, emitCall, callEvent, onRemoteEnded: onClose });
  const { state, error, muted, setMuted, camera, setCamera } = call;
  useEffect(() => { if (localVideoRef.current) localVideoRef.current.srcObject = call.localStream; }, [call.localStream]);
  useEffect(() => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = call.remoteStream; }, [call.remoteStream]);
  useEffect(() => {
    if (state !== "connected") return undefined;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);
  function end() {
    call.end();
    onClose();
  }
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const status = state === "permission" ? "Checking device permissions…" : state === "ringing" ? `Ringing ${person.name}…` : state === "connecting" ? "Creating secure connection…" : state === "blocked" ? "Permission needed" : `Secure ${mode} call · ${time}`;
  return <div className="pro-chat-modal pro-call-modal" role="dialog" aria-modal="true" aria-label={`${mode} call with ${person.name}`}>
    <div className="pro-call-security"><ShieldCheck size={16} /> Mutual-match encrypted call</div>
    <div className={`pro-call-avatar ${state === "connected" ? "connected" : ""}`}>{person.initial}</div>
    <h2>{person.name}</h2><p>{status}</p>
    {mode === "video" && state !== "blocked" && <div className="pro-call-video">{call.remoteStream ? <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" /> : <div className="pro-call-remote">{person.initial}<span>{state === "connected" ? "Connected" : "Securing video"}</span></div>}<video ref={localVideoRef} autoPlay muted playsInline className={camera ? "" : "camera-off"} /></div>}
    {error && <div className="pro-call-error">{error}<button onClick={call.retry}>Retry</button></div>}
    <div className="pro-call-actions">
      <button onClick={() => setMuted((value) => !value)} className={muted ? "active" : ""}>{muted ? "Unmute" : "Mute"}</button>
      {mode === "video" && <button onClick={() => setCamera((value) => !value)} className={!camera ? "active" : ""}>{camera ? "Camera on" : "Camera off"}</button>}
      <button className="end" onClick={end}>End call</button>
    </div>
    <small>Ringing, permission, media-track and signaling lifecycle are active.</small>
  </div>;
}

function DateDialog({ onClose, onSend }) {
  const [form, setForm] = useState({ venue: "Juniper & Ivy", area: "Little Italy", date: "2026-08-08", time: "19:30", safety: true });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  return <div className="pro-chat-modal pro-date-modal" role="dialog" aria-modal="true" aria-label="Plan a date">
    <button className="pro-chat-modal-close" onClick={onClose} aria-label="Close date planner"><X size={19} /></button>
    <div className="pro-chat-modal-icon"><CalendarDays /></div><p className="eyebrow">PRIVATE DATE PLAN</p><h2>Plan something thoughtful.</h2>
    <div className="pro-date-grid"><label>Venue<input value={form.venue} onChange={update("venue")} /></label><label>Area<input value={form.area} onChange={update("area")} /></label><label>Date<input type="date" value={form.date} onChange={update("date")} /></label><label>Time<input type="time" value={form.time} onChange={update("time")} /></label></div>
    <label className="pro-date-safety"><input type="checkbox" checked={form.safety} onChange={update("safety")} /><ShieldCheck size={18} /><span><strong>Safety check-in</strong><small>Private reminder before and after the date.</small></span></label>
    <div className="pro-date-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={() => onSend(form)}>Send date proposal</button></div>
  </div>;
}

export default function RealtimeChatExperience() {
  const [activeId, setActiveId] = useState(1);
  const [currentUserId, setCurrentUserId] = useState(1);
  const [messagesByConversation, setMessagesByConversation] = useState(fallback);
  const [online, setOnline] = useState(true);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [presence, setPresence] = useState("online");
  const [nickname, setNickname] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState(null);
  const [callMode, setCallMode] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [incomingCallId, setIncomingCallId] = useState(null);
  const [lastCallEvent, setLastCallEvent] = useState(null);
  const [attachments, setAttachments] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const timers = useRef([]);
  const recorder = useRef(null);
  const chunks = useRef([]);
  const fileInput = useRef(null);
  const person = people.find((item) => item.id === activeId) || people[0];
  const messages = messagesByConversation[activeId] || [];

  const receive = useCallback((message) => {
    setMessagesByConversation((current) => {
      const items = current[activeId] || [];
      const existing = items.find((item) => item.id === message.id || (message.clientId && item.clientId === message.clientId));
      if (existing) return { ...current, [activeId]: items.map((item) => item === existing ? { ...message, id: item.id, senderId: item.senderId, status: item.status, type: message.type || item.type || "text" } : item) };
      return { ...current, [activeId]: [...items, { ...message, status: message.status || "delivered", type: message.type || "text" }] };
    });
  }, [activeId]);
  const realtime = useConversation(activeId, {
    onMessage: (message) => { receive(message); if (message.senderId !== currentUserId) setTimeout(() => realtime.markRead(message.id), 250); },
    onTyping: (payload) => setPartnerTyping(Boolean(payload?.typing)),
    onPresence: (payload) => setPresence(payload?.online ? "online" : "offline"),
    onReceipt: ({ messageId, clientId, status }) => setMessagesByConversation((current) => ({ ...current, [activeId]: (current[activeId] || []).map((item) => String(item.id) === String(messageId) || (clientId && item.clientId === clientId) ? { ...item, status } : item) })),
    onCallEvent: (payload) => {
      setLastCallEvent(payload);
      if (payload.event === "invite") setIncomingCall(payload);
      if (payload.event === "reject") { setCallMode(null); setNotice(`${person.name} could not take the call`); }
      if (["end", "missed"].includes(payload.event)) { setCallMode(null); setIncomingCall(null); setNotice(payload.event === "missed" ? "Call was not answered" : "Call ended securely"); }
    },
  });

  useEffect(() => {
    const previewViewer = Number(new URLSearchParams(window.location.search).get("viewer"));
    if (previewViewer > 0) setCurrentUserId(previewViewer);
    else api.get("/auth/me").then((payload) => payload?.user?.id && setCurrentUserId(Number(payload.user.id))).catch(() => {});
  }, []);
  useEffect(() => {
    const saved = localStorage.getItem(`destinyone:nickname:${activeId}`) || "";
    setNickname(saved); setNicknameDraft(saved);
    api.get(`/messages/${activeId}`).then((items) => items?.length && setMessagesByConversation((current) => ({ ...current, [activeId]: items.map((item) => ({ ...item, type: item.type || "text", status: item.status || "delivered" })) }))).catch(() => {});
  }, [activeId]);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync(); window.addEventListener("online", sync); window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  useEffect(() => {
    if (!online || realtime.connected) return;
    setMessagesByConversation((current) => ({ ...current, [activeId]: (current[activeId] || []).map((item) => item.senderId === currentUserId && item.status === "sent" ? { ...item, status: "delivered" } : item) }));
  }, [activeId, currentUserId, online, realtime.connected]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function updateStatus(id, status) {
    setMessagesByConversation((current) => ({ ...current, [activeId]: (current[activeId] || []).map((item) => item.id === id ? { ...item, status } : item) }));
  }
  function scheduleLifecycle(message) {
    if (!online) return;
    timers.current.push(setTimeout(() => { updateStatus(message.id, "delivered"); setPartnerTyping(true); }, 650));
    timers.current.push(setTimeout(() => { updateStatus(message.id, "read"); setPartnerTyping(false); }, 2100));
    timers.current.push(setTimeout(() => {
      const reply = { id: uid("reply"), senderId: currentUserId === 1 ? 102 : 1, body: replyPool[Math.floor(Math.random() * replyPool.length)], createdAt: Date.now(), status: "read", type: "text" };
      receive(reply); setNotice(`${person.name} replied`);
      if ("Notification" in window && Notification.permission === "granted" && document.hidden) new Notification(`${person.name} · DestinyOne`, { body: reply.body });
    }, 3100));
  }
  async function send(body, extra = {}) {
    const optimistic = { id: uid(), clientId: uid("client"), senderId: currentUserId, body, createdAt: Date.now(), status: "sent", type: extra.type || "text", ...extra };
    receive(optimistic); if (!realtime.connected) scheduleLifecycle(optimistic); setAttachments(false); setEmojiOpen(false);
    try {
      const stored = await api.post(`/messages/${activeId}`, { body, clientId: optimistic.clientId, type: optimistic.type, payload: extra.payload });
      if (stored) receive(stored);
    } catch { setNotice(online ? "Preview mode · realtime behavior is running locally" : "Offline · message queued with one tick"); }
  }
  function sendDate(form) {
    send(`${form.venue} · ${form.area}`, { type: "date", payload: { ...form, status: "proposed" } }); setPanel(null);
  }
  function saveNickname() {
    const value = nicknameDraft.trim(); setNickname(value); localStorage.setItem(`destinyone:nickname:${activeId}`, value); setNotice(value ? `Chat name saved as ${value}` : "Custom name removed"); setPanel(null);
  }
  async function enableNotifications() {
    try { await registerBrowserPush(); setNotice("Real message and call notifications enabled"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Notifications were not enabled"); }
  }
  async function voiceNote() {
    if (recording) { recorder.current?.stop(); setRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = []; recorder.current = new MediaRecorder(stream);
      recorder.current.ondataavailable = (event) => chunks.current.push(event.data);
      recorder.current.onstop = () => { const url = URL.createObjectURL(new Blob(chunks.current, { type: "audio/webm" })); stream.getTracks().forEach((track) => track.stop()); send("Voice note", { type: "voice", payload: { url } }); };
      recorder.current.start(); setRecording(true);
    } catch { setNotice("Microphone permission is needed for a voice note"); }
  }
  function shareLocation() {
    navigator.geolocation?.getCurrentPosition((position) => send("Live location shared", { type: "location", payload: { latitude: position.coords.latitude, longitude: position.coords.longitude } }), () => setNotice("Location permission is needed"));
  }
  function selectPhoto(event) {
    const file = event.target.files?.[0]; if (!file) return;
    send(file.name, { type: "image", payload: { url: URL.createObjectURL(file) } }); event.target.value = "";
  }
  const filteredMessages = useMemo(() => messages.filter((item) => !search.trim() || item.body.toLowerCase().includes(search.trim().toLowerCase())), [messages, search]);

  return <div className="pro-chat-shell">
    <aside className="pro-chat-sidebar"><div className="pro-chat-sidebar-head"><div><small>MESSAGES</small><h2>Conversations</h2></div><button aria-label="Search conversations"><Search size={18} /></button></div>{people.map((item) => <button key={item.id} onClick={() => setActiveId(item.id)} className={`pro-chat-person ${item.id === activeId ? "active" : ""}`}><span className="pro-chat-person-avatar">{item.initial}<i className={item.online ? "online" : ""} /></span><span><strong>{item.id === activeId && nickname ? nickname : item.name}</strong><small>{item.preview}</small></span><time>{item.id === 1 ? "now" : "1h"}</time></button>)}</aside>
    <section className="pro-chat-main">
      <header className="pro-chat-header"><button className="pro-chat-back" aria-label="Back to conversations"><ChevronLeft /></button><span className="pro-chat-person-avatar large">{person.initial}<i className={(online && presence !== "offline") ? "online" : ""} /></span><button className="pro-chat-identity" onClick={() => setPanel("settings")}><strong>{nickname || person.name}{person.verified && <ShieldCheck size={14} />}</strong><small className={partnerTyping ? "typing" : ""}>{partnerTyping ? `${person.name} is typing…` : !online ? "Waiting for connection" : realtime.connected ? "Online · realtime connected" : "Online now"}</small></button><div className="pro-chat-header-actions"><button onClick={() => { setIncomingCallId(null); setCallMode("audio"); }} aria-label="Audio call"><Phone /></button><button onClick={() => { setIncomingCallId(null); setCallMode("video"); }} aria-label="Video call"><Video /></button><button onClick={() => setPanel("date")} aria-label="Plan a date"><CalendarDays /></button><button onClick={() => setPanel("settings")} aria-label="Chat settings"><MoreVertical /></button></div></header>
      <div className="pro-chat-toolbar"><span><ShieldCheck size={15} /> Private, mutual-match conversation</span><button onClick={() => setPanel("date")}><CalendarDays size={15} /> Plan date</button><button onClick={enableNotifications}><Bell size={15} /> Notifications</button><label><Search size={15} /><input aria-label="Search this conversation" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" /></label></div>
      {notice && <button className="pro-chat-notice" onClick={() => setNotice("")}><span>{notice}</span><X size={16} /></button>}
      <div className="pro-chat-messages"><div className="pro-chat-day">TODAY</div>{filteredMessages.map((message) => <div key={message.id} className={`pro-message-row ${message.senderId === currentUserId ? "mine" : "theirs"}`}><div className={`pro-message ${message.type}`}>
        {message.type === "date" && <div className="pro-message-date"><CalendarDays size={19} /><span><small>DATE PROPOSAL</small><strong>{message.payload?.venue || message.body}</strong><em>{message.payload?.date} · {message.payload?.time}</em></span></div>}
        {message.type === "image" && message.payload?.url && <img src={message.payload.url} alt={message.body} />}
        {message.type === "location" && <div className="pro-message-location"><MapPin /><span><strong>Live location</strong><small>Shared securely</small></span></div>}
        {message.type === "voice" && <audio controls src={message.payload?.url} />}
        {!["date", "image", "location", "voice"].includes(message.type) && <p>{message.body}</p>}
        <div className="pro-message-meta"><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>{message.senderId === currentUserId && <Receipt status={message.status} />}</div>
      </div></div>)}{partnerTyping && <div className="pro-chat-typing"><span>{person.initial}</span><div><i /><i /><i /></div><small>{person.name} is typing</small></div>}</div>
      {attachments && <div className="pro-chat-attachments"><button onClick={() => fileInput.current?.click()}><ImageIcon />Photo</button><button onClick={shareLocation}><MapPin />Location</button><button onClick={() => setPanel("date")}><CalendarDays />Date plan</button><button onClick={() => send("Relationship values.pdf", { type: "document", payload: { name: "Relationship values.pdf" } })}><FileText />Document</button></div>}
      {emojiOpen && <div className="pro-chat-emojis">{["❤️", "😊", "😂", "😍", "🙏", "✨", "🌹", "☕", "💍", "🥰"].map((emoji) => <button aria-label={`Send ${emoji}`} key={emoji} onClick={() => send(emoji)}>{emoji}</button>)}</div>}
      <input ref={fileInput} hidden type="file" accept="image/*" onChange={selectPhoto} />
      <ChatComposer onSend={send} onTyping={realtime.emitTyping} onAttach={() => { setAttachments((value) => !value); setEmojiOpen(false); }} onEmoji={() => { setEmojiOpen((value) => !value); setAttachments(false); }} onVoice={voiceNote} recording={recording} online={online} />
    </section>
    {panel && <div className="pro-chat-overlay" onMouseDown={(event) => event.target === event.currentTarget && setPanel(null)}>{panel === "date" ? <DateDialog onClose={() => setPanel(null)} onSend={sendDate} /> : <div className="pro-chat-modal pro-settings-modal" role="dialog" aria-modal="true" aria-label="Chat settings"><button className="pro-chat-modal-close" onClick={() => setPanel(null)}><X /></button><div className="pro-chat-modal-icon"><Settings /></div><p className="eyebrow">CHAT SETTINGS</p><h2>Make this conversation yours.</h2><label>Custom name for {person.name}<input value={nicknameDraft} onChange={(event) => setNicknameDraft(event.target.value)} placeholder="e.g. Sunshine" maxLength={32} /></label><small>Only you see this nickname. The other person’s real identity stays unchanged.</small><button className="primary-button" onClick={saveNickname}>Save custom name</button></div>}</div>}
    {incomingCall && !callMode && <div className="pro-incoming-call" role="alert"><span className="pro-chat-person-avatar">{person.initial}</span><div><strong>Incoming {incomingCall.mode || "audio"} call</strong><small>{person.name} · Mutual match</small></div><button className="decline" onClick={() => { realtime.emitCall("reject", { clientCallId: incomingCall.clientCallId }); setIncomingCall(null); }}>Decline</button><button className="accept" onClick={() => { setIncomingCallId(incomingCall.clientCallId); setCallMode(incomingCall.mode || "audio"); setIncomingCall(null); }}>Accept</button></div>}
    {callMode && <div className="pro-chat-overlay"><CallDialog person={person} mode={callMode} incomingCallId={incomingCallId} callEvent={lastCallEvent} onClose={() => { setCallMode(null); setIncomingCallId(null); }} emitCall={realtime.emitCall} /></div>}
    <div className="pro-chat-connection">{online ? <Wifi size={14} /> : <WifiOff size={14} />}{online ? "Connected" : "Offline"}</div>
  </div>;
}
