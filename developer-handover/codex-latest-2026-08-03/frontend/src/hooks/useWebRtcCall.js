import { useCallback, useEffect, useRef, useState } from "react";

function configuredIceServers() {
  const fallback = [{ urls: ["stun:stun.cloudflare.com:3478"] }];
  try {
    const parsed = JSON.parse(process.env.NEXT_PUBLIC_WEBRTC_ICE_SERVERS || "null");
    return Array.isArray(parsed) && parsed.length ? parsed : fallback;
  } catch { return fallback; }
}

export default function useWebRtcCall({ mode, incomingCallId, emitCall, callEvent, onRemoteEnded }) {
  const [state, setState] = useState("permission");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(mode === "video");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const callId = useRef(incomingCallId || `call-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const peer = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingIce = useRef([]);
  const offered = useRef(false);
  const processedEvents = useRef(new Set());

  const stopMedia = useCallback(() => {
    peer.current?.close(); peer.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const makeOffer = useCallback(async () => {
    if (!peer.current || offered.current) return;
    offered.current = true; setState("connecting");
    const offer = await peer.current.createOffer();
    await peer.current.setLocalDescription(offer);
    emitCall("signal", { mode, clientCallId: callId.current, signal: { type: "offer", sdp: offer.sdp } });
  }, [emitCall, mode]);

  const start = useCallback(async () => {
    setError(""); setState("permission");
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error("WebRTC is not available on this device.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" });
      const connection = new RTCPeerConnection({ iceServers: configuredIceServers(), iceCandidatePoolSize: 4 });
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
      connection.ontrack = ({ streams }) => { if (streams[0]) { remoteStreamRef.current = streams[0]; setRemoteStream(streams[0]); } };
      connection.onicecandidate = ({ candidate }) => {
        if (candidate) emitCall("signal", { mode, clientCallId: callId.current, signal: { type: "ice", candidate: candidate.toJSON() } });
      };
      connection.onconnectionstatechange = () => {
        if (["connected"].includes(connection.connectionState)) setState("connected");
        if (["failed", "disconnected"].includes(connection.connectionState)) { setError("The secure call connection was interrupted."); setState("blocked"); }
        if (connection.connectionState === "closed") setState("ended");
      };
      peer.current = connection; localStreamRef.current = stream; setLocalStream(stream);
      if (incomingCallId) { setState("connecting"); emitCall("accept", { mode, clientCallId: callId.current }); }
      else { setState("ringing"); emitCall("invite", { mode, clientCallId: callId.current }); }
    } catch (cause) {
      setState("blocked");
      setError(cause instanceof Error ? cause.message : `${mode === "video" ? "Camera and microphone" : "Microphone"} permission is required.`);
    }
  }, [emitCall, incomingCallId, mode]);

  useEffect(() => { void start(); return () => { peer.current?.close(); }; }, [start]);
  useEffect(() => { localStream?.getAudioTracks().forEach((track) => { track.enabled = !muted; }); }, [localStream, muted]);
  useEffect(() => { localStream?.getVideoTracks().forEach((track) => { track.enabled = camera; }); }, [camera, localStream]);

  useEffect(() => {
    if (!callEvent || callEvent.clientCallId !== callId.current || !peer.current) return;
    const eventKey = `${callEvent.event}:${callEvent.at || ""}:${callEvent.signal?.type || ""}:${callEvent.signal?.sdp || callEvent.signal?.candidate?.candidate || ""}`;
    if (processedEvents.current.has(eventKey)) return;
    processedEvents.current.add(eventKey);
    const connection = peer.current;
    const handle = async () => {
      if (callEvent.event === "accept" && !incomingCallId) { await makeOffer(); return; }
      if (["reject", "end", "missed"].includes(callEvent.event)) {
        stopMedia(); setState("ended"); onRemoteEnded?.(callEvent.event); return;
      }
      const signal = callEvent.event === "signal" ? callEvent.signal : null;
      if (!signal) return;
      if (signal.type === "offer") {
        await connection.setRemoteDescription({ type: "offer", sdp: signal.sdp });
        const answer = await connection.createAnswer(); await connection.setLocalDescription(answer);
        emitCall("signal", { mode, clientCallId: callId.current, signal: { type: "answer", sdp: answer.sdp } });
      } else if (signal.type === "answer") {
        await connection.setRemoteDescription({ type: "answer", sdp: signal.sdp });
      } else if (signal.type === "ice" && signal.candidate) {
        if (connection.remoteDescription) await connection.addIceCandidate(signal.candidate);
        else pendingIce.current.push(signal.candidate);
      }
      if (connection.remoteDescription && pendingIce.current.length) {
        const queued = pendingIce.current.splice(0); for (const candidate of queued) await connection.addIceCandidate(candidate);
      }
    };
    void handle().catch((cause) => { setError(cause instanceof Error ? cause.message : "Secure call negotiation failed."); setState("blocked"); });
  }, [callEvent, emitCall, incomingCallId, makeOffer, mode, onRemoteEnded, stopMedia]);

  const end = useCallback(() => { emitCall("end", { mode, clientCallId: callId.current, reason: "member_ended" }); stopMedia(); setState("ended"); }, [emitCall, mode, stopMedia]);
  return { state, error, muted, setMuted, camera, setCamera, localStream, remoteStream, retry: start, end, callId: callId.current };
}
