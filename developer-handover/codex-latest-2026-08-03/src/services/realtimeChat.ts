import type { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type RealtimeCallSignal =
  | { type: 'offer' | 'answer'; sdp: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit };

export type RealtimeCallEvent = {
  event: 'invite' | 'accept' | 'reject' | 'end' | 'missed' | 'failed' | 'signal';
  clientCallId: string;
  mode?: 'audio' | 'video';
  signal?: RealtimeCallSignal;
  userId?: string;
  at?: string;
};

export type MatchRealtimeHandlers = {
  onTyping?: (typing: boolean) => void;
  onPresence?: (online: boolean) => void;
  onReceipt?: (status: 'delivered' | 'read', at: string) => void;
  onCall?: (event: RealtimeCallEvent) => void;
  onConnection?: (connected: boolean) => void;
};

export type MatchRealtimeSession = {
  sendTyping: (typing: boolean) => Promise<void>;
  markDelivered: () => Promise<void>;
  markRead: () => Promise<void>;
  sendCall: (event: RealtimeCallEvent) => Promise<void>;
  close: () => Promise<void>;
};

const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function connectMatchRealtime(matchId: string, handlers: MatchRealtimeHandlers): Promise<MatchRealtimeSession | null> {
  if (!isSupabaseConfigured || !uuidPattern.test(matchId)) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw error ?? new Error('Sign in is required for realtime chat.');
  await supabase.realtime.setAuth();
  let connected=false;
  const channel: RealtimeChannel = supabase.channel(`chat:${matchId}`, {
    config: { private: true, broadcast: { ack: true, self: false }, presence: { key: user.id } },
  });
  channel
    .on('broadcast',{event:'typing'},({payload})=>{if(payload?.userId!==user.id)handlers.onTyping?.(payload?.typing===true)})
    .on('broadcast',{event:'receipt'},({payload})=>{if(payload?.userId!==user.id&&(payload?.status==='delivered'||payload?.status==='read'))handlers.onReceipt?.(payload.status,String(payload.at||new Date().toISOString()))})
    .on('broadcast',{event:'call'},({payload})=>{if(payload?.userId!==user.id)handlers.onCall?.(payload as RealtimeCallEvent)})
    .on('presence',{event:'sync'},()=>{
      const state=channel.presenceState();
      handlers.onPresence?.(Object.keys(state).some(key=>key!==user.id));
    })
    .on('presence',{event:'join'},({key})=>{if(key!==user.id)handlers.onPresence?.(true)})
    .on('presence',{event:'leave'},({key})=>{if(key!==user.id){const state=channel.presenceState();handlers.onPresence?.(Object.keys(state).some(id=>id!==user.id))}});
  await new Promise<void>((resolve,reject)=>{
    channel.subscribe(async(status,subscriptionError)=>{
      if(status==='SUBSCRIBED'){
        connected=true;handlers.onConnection?.(true);
        await channel.track({userId:user.id,onlineAt:new Date().toISOString()});resolve();
      }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')reject(subscriptionError??new Error(`Realtime ${status.toLowerCase()}`));
      else if(status==='CLOSED'){if(connected)handlers.onConnection?.(false);else reject(new Error('Realtime channel closed before it connected.'))}
    });
  });
  const broadcast=async(event:string,payload:Record<string,unknown>)=>{
    const response=await channel.send({type:'broadcast',event,payload:{...payload,userId:user.id,at:new Date().toISOString()}});
    if(response!=='ok')throw new Error(`Realtime ${event} was not acknowledged.`);
  };
  return {
    sendTyping:(typing)=>broadcast('typing',{typing}),
    markDelivered:async()=>{const {error:rpcError}=await supabase.rpc('mark_match_messages_delivered',{p_match_id:matchId});if(rpcError)throw rpcError;await broadcast('receipt',{status:'delivered'})},
    markRead:async()=>{const {error:rpcError}=await supabase.rpc('mark_match_messages_read',{p_match_id:matchId});if(rpcError)throw rpcError;await broadcast('receipt',{status:'read'})},
    sendCall:async(call)=>{
      if(call.event==='invite'){
        const {error:rpcError}=await supabase.rpc('start_match_call',{p_match_id:matchId,p_client_call_id:call.clientCallId,p_call_type:call.mode??'audio'});if(rpcError)throw rpcError;
      }else if(call.event==='accept'||call.event==='reject'||call.event==='end'||call.event==='missed'||call.event==='failed'){
        const status=call.event==='accept'?'accepted':call.event==='reject'?'rejected':call.event==='end'?'ended':call.event;
        const {error:rpcError}=await supabase.rpc('update_match_call',{p_match_id:matchId,p_client_call_id:call.clientCallId,p_status:status,p_failure_reason:call.event==='failed'?'Peer connection failed':null});if(rpcError)throw rpcError;
      }
      await broadcast('call',call as unknown as Record<string,unknown>);
    },
    close:async()=>{handlers.onConnection?.(false);await supabase.removeChannel(channel)},
  };
}
