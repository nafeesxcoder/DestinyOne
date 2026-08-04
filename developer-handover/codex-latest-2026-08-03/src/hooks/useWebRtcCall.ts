import { useCallback, useEffect, useRef, useState } from 'react';
import type { MatchRealtimeSession, RealtimeCallEvent, RealtimeCallSignal } from '../services/realtimeChat';

export type WebRtcCallState='permission'|'ringing'|'connecting'|'connected'|'blocked'|'ended';

function configuredIceServers(): RTCIceServer[] {
  const fallback:RTCIceServer[]=[{urls:['stun:stun.cloudflare.com:3478']}];
  try{
    const parsed=JSON.parse(process.env.EXPO_PUBLIC_WEBRTC_ICE_SERVERS??'null') as unknown;
    return Array.isArray(parsed)&&parsed.length?parsed as RTCIceServer[]:fallback;
  }catch{return fallback}
}

export function useWebRtcCall({mode,incomingCallId,session,callEvent,onRemoteEnded}:{mode:'audio'|'video'|null;incomingCallId:string|null;session:MatchRealtimeSession|null;callEvent:RealtimeCallEvent|null;onRemoteEnded?:()=>void}){
  const [state,setState]=useState<WebRtcCallState>('permission');
  const [error,setError]=useState('');
  const [muted,setMuted]=useState(false);
  const [camera,setCamera]=useState(mode==='video');
  const [localStream,setLocalStream]=useState<MediaStream|null>(null);
  const [remoteStream,setRemoteStream]=useState<MediaStream|null>(null);
  const callId=useRef(incomingCallId??`call-${Date.now()}-${Math.random().toString(36).slice(2,9)}`);
  const peer=useRef<RTCPeerConnection|null>(null);
  const localStreamRef=useRef<MediaStream|null>(null);
  const pendingIce=useRef<RTCIceCandidateInit[]>([]);
  const offered=useRef(false);
  const processedEvents=useRef(new Set<string>());

  const emit=useCallback(async(event:RealtimeCallEvent['event'],signal?:RealtimeCallSignal)=>{
    if(!session||!mode)return;
    await session.sendCall({event,mode,clientCallId:callId.current,signal});
  },[mode,session]);

  const stopMedia=useCallback(()=>{
    peer.current?.close();peer.current=null;
    localStreamRef.current?.getTracks().forEach(track=>track.stop());
    localStreamRef.current=null;setLocalStream(null);setRemoteStream(null);
  },[]);

  const makeOffer=useCallback(async()=>{
    if(!peer.current||offered.current)return;
    offered.current=true;setState('connecting');
    const offer=await peer.current.createOffer();
    await peer.current.setLocalDescription(offer);
    if(offer.sdp)await emit('signal',{type:'offer',sdp:offer.sdp});
  },[emit]);

  const start=useCallback(async()=>{
    if(!mode||!session)return;
    setError('');setState('permission');
    try{
      if(typeof window==='undefined'||!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)throw new Error('Live media calls require the DestinyOne web app or a native WebRTC development build.');
      stopMedia();offered.current=false;pendingIce.current=[];processedEvents.current.clear();
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:mode==='video'});
      const connection=new RTCPeerConnection({iceServers:configuredIceServers(),iceCandidatePoolSize:4});
      stream.getTracks().forEach(track=>connection.addTrack(track,stream));
      connection.ontrack=({streams})=>{if(streams[0])setRemoteStream(streams[0])};
      connection.onicecandidate=({candidate})=>{if(candidate)void emit('signal',{type:'ice',candidate:candidate.toJSON()}).catch(()=>undefined)};
      connection.onconnectionstatechange=()=>{
        if(connection.connectionState==='connected')setState('connected');
        if(connection.connectionState==='failed'||connection.connectionState==='disconnected'){setError('The secure call connection was interrupted.');setState('blocked')}
        if(connection.connectionState==='closed')setState('ended');
      };
      peer.current=connection;localStreamRef.current=stream;setLocalStream(stream);
      if(incomingCallId){setState('connecting');await emit('accept')}
      else{setState('ringing');await emit('invite')}
    }catch(cause){stopMedia();setState('blocked');setError(cause instanceof Error?cause.message:'Camera or microphone permission is required.')}
  },[emit,incomingCallId,mode,session,stopMedia]);

  useEffect(()=>{if(mode&&session)void start();return()=>stopMedia()},[mode,session,start,stopMedia]);
  useEffect(()=>{localStream?.getAudioTracks().forEach(track=>{track.enabled=!muted})},[localStream,muted]);
  useEffect(()=>{localStream?.getVideoTracks().forEach(track=>{track.enabled=camera})},[camera,localStream]);
  useEffect(()=>{
    if(state!=='ringing'||incomingCallId)return;
    const timer=setTimeout(()=>{void emit('missed').catch(()=>undefined);stopMedia();setState('ended');onRemoteEnded?.()},35000);
    return()=>clearTimeout(timer);
  },[emit,incomingCallId,onRemoteEnded,state,stopMedia]);
  useEffect(()=>{
    if(!callEvent||callEvent.clientCallId!==callId.current||!peer.current)return;
    const signal=callEvent.signal;
    const key=`${callEvent.event}:${callEvent.at??''}:${signal?.type??''}:${signal?.type==='ice'?signal.candidate.candidate:signal?.sdp??''}`;
    if(processedEvents.current.has(key))return;
    processedEvents.current.add(key);
    const connection=peer.current;
    const handle=async()=>{
      if(callEvent.event==='accept'&&!incomingCallId){await makeOffer();return}
      if(['reject','end','missed','failed'].includes(callEvent.event)){stopMedia();setState('ended');onRemoteEnded?.();return}
      if(callEvent.event!=='signal'||!signal)return;
      if(signal.type==='offer'){
        await connection.setRemoteDescription({type:'offer',sdp:signal.sdp});
        const answer=await connection.createAnswer();await connection.setLocalDescription(answer);
        if(answer.sdp)await emit('signal',{type:'answer',sdp:answer.sdp});
      }else if(signal.type==='answer')await connection.setRemoteDescription({type:'answer',sdp:signal.sdp});
      else if(signal.type==='ice'&&connection.remoteDescription)await connection.addIceCandidate(signal.candidate);
      else if(signal.type==='ice')pendingIce.current.push(signal.candidate);
      if(connection.remoteDescription&&pendingIce.current.length){const queued=pendingIce.current.splice(0);for(const candidate of queued)await connection.addIceCandidate(candidate)}
    };
    void handle().catch(cause=>{setError(cause instanceof Error?cause.message:'Secure call negotiation failed.');setState('blocked')});
  },[callEvent,emit,incomingCallId,makeOffer,onRemoteEnded,stopMedia]);

  const end=useCallback(()=>{void emit('end').catch(()=>undefined);stopMedia();setState('ended')},[emit,stopMedia]);
  return{state,error,muted,setMuted,camera,setCamera,localStream,remoteStream,retry:start,end};
}
