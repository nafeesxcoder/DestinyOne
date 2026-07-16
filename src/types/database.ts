export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  first_name: string;
  birth_date: string;
  city: string;
  profession: string;
  height_cm: number | null;
  religion: string | null;
  community: string | null;
  bio: string | null;
  verified: boolean;
  onboarding_complete: boolean;
  voice_intro_path: string | null;
  created_at: string;
  updated_at: string;
};

export type PreferenceRow = {
  user_id: string;
  intent: 'long_term' | 'marriage' | 'long_term_to_marriage';
  vibes: string[];
  marriage_timeline: string | null;
  children: string | null;
  family_involvement: string | null;
  relocation: string | null;
  smart_discovery: boolean;
  crossed_paths: boolean;
  updated_at: string;
};

export type MatchRow = {
  id: string;
  user_a: string;
  user_b: string;
  label: 'strong' | 'great' | 'exceptional';
  score_internal: number;
  status: 'suggested' | 'mutual' | 'passed' | 'blocked';
  matched_at: string | null;
  created_at: string;
};

export type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  kind: 'text' | 'image' | 'gif' | 'gift' | 'date' | 'snap' | 'sticker' | 'voice' | 'location';
  body: string | null;
  media_path: string | null;
  metadata: Json;
  read_at: string | null;
  created_at: string;
};

export type GiftOrderStatus =
  | 'recipient_pending'
  | 'recipient_accepted'
  | 'payment_authorized'
  | 'merchant_preparing'
  | 'courier_assigned'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, { id: string; first_name: string; birth_date: string; city: string; profession: string } & Partial<ProfileRow>>;
      user_preferences: Table<PreferenceRow, { user_id: string } & Partial<PreferenceRow>>;
      profile_photos: Table<{ id: string; user_id: string; storage_path: string; position: number; approved: boolean; created_at: string }>;
      matches: Table<MatchRow>;
      likes: Table<{ id: string; sender_id: string; recipient_id: string; decision: 'interested' | 'pass'; created_at: string }>;
      messages: Table<MessageRow, { match_id: string; sender_id: string; kind: MessageRow['kind'] } & Partial<MessageRow>>;
      icebreakers: Table<{ id: string; match_id: string; question: string; user_a_answer: string | null; user_b_answer: string | null; unlocked_at: string | null; created_at: string }>;
      gifts: Table<{ id: string; match_id: string; sender_id: string; recipient_id: string; gift_code: string; coins: number; created_at: string }>;
      gift_orders: Table<{
        id: string;
        match_id: string | null;
        sender_id: string;
        recipient_id: string;
        product_id: string;
        product_name: string;
        note: string | null;
        status: GiftOrderStatus;
        provider: string;
        provider_order_id: string | null;
        provider_quote_id: string | null;
        service_level: string | null;
        provider_recommendation: string | null;
        payment_policy: string | null;
        recipient_privacy: string | null;
        acceptance_window_minutes: number;
        acceptance_expires_at: string | null;
        item_subtotal_cents: number;
        delivery_fee_cents: number;
        service_fee_cents: number;
        estimated_tax_cents: number;
        total_cents: number;
        eta_minutes_min: number;
        eta_minutes_max: number;
        eta_label: string;
        tracking_url: string | null;
        recipient_address_token: string | null;
        recipient_accepted_at: string | null;
        payment_authorized_at: string | null;
        provider_submitted_at: string | null;
        delivered_at: string | null;
        cancelled_at: string | null;
        failure_reason: string | null;
        metadata: Json;
        created_at: string;
        updated_at: string;
      }>;
      gift_order_events: Table<{ id: string; gift_order_id: string; status: GiftOrderStatus; title: string; body: string | null; provider_payload: Json; created_at: string }>;
      date_proposals: Table<{ id: string; match_id: string; proposer_id: string; venue_name: string; area_label: string; proposed_at: string; status: 'pending' | 'accepted' | 'declined' | 'countered'; safety_check_in: boolean; created_at: string }>;
      trusted_vouches: Table<{ id: string; user_id: string; voucher_hash: string; qualities: string[]; status: 'pending' | 'complete' | 'revoked'; created_at: string }>;
      discovery_signals: Table<{ id: string; user_id: string; target_id: string; signal: 'view' | 'interested' | 'skip'; created_at: string }>;
      subscriptions: Table<{ user_id: string; plan: 'free' | 'plus'; status: string; provider: string | null; provider_customer_id: string | null; expires_at: string | null; updated_at: string }>;
      coin_ledger: Table<{ id: string; user_id: string; amount: number; reason: string; reference_id: string | null; created_at: string }>;
      blocks: Table<{ blocker_id: string; blocked_id: string; created_at: string }>;
      reports: Table<{ id: string; reporter_id: string; reported_id: string; reason: string; details: string | null; status: 'open' | 'reviewing' | 'resolved'; created_at: string }>;
      safety_checkins: Table<{ id: string; user_id: string; date_proposal_id: string; status: 'scheduled' | 'safe' | 'needs_help'; checked_in_at: string | null; created_at: string }>;
      deletion_requests: Table<{ id: string; user_id: string; status: 'requested' | 'processing' | 'complete' | 'rejected'; requested_at: string; completed_at: string | null }>;
      privacy_settings: Table<{
        user_id: string;
        last_seen_visible: boolean;
        online_status_visible: boolean;
        profile_view_notifications: boolean;
        private_mode: boolean;
        profile_view_threshold_seconds: number;
        updated_at: string;
      }, { user_id: string } & Partial<{ last_seen_visible: boolean; online_status_visible: boolean; profile_view_notifications: boolean; private_mode: boolean; profile_view_threshold_seconds: number; updated_at: string }>>;
      profile_views: Table<{
        id: string;
        viewer_id: string;
        viewed_id: string;
        duration_seconds: number;
        source: string;
        notified: boolean;
        created_at: string;
      }, { viewer_id: string; viewed_id: string; duration_seconds?: number; source?: string; notified?: boolean }>;
      member_notifications: Table<{
        id: string;
        user_id: string;
        type: string;
        title: string;
        body: string | null;
        metadata: Json;
        read_at: string | null;
        created_at: string;
      }>;
      support_tickets: Table<{
        id: string;
        user_id: string;
        topic: 'Safety' | 'Billing' | 'Account' | 'Report a bug' | 'Trust' | 'Gift order' | 'Other';
        message: string;
        status: 'open' | 'triaged' | 'waiting_on_member' | 'resolved' | 'closed';
        priority: 'low' | 'normal' | 'high' | 'urgent';
        source_screen: string | null;
        metadata: Json;
        created_at: string;
        updated_at: string;
      }, { user_id: string; topic: 'Safety' | 'Billing' | 'Account' | 'Report a bug' | 'Trust' | 'Gift order' | 'Other'; message: string; priority?: 'low' | 'normal' | 'high' | 'urgent'; source_screen?: string | null; metadata?: Json }>;
      support_ticket_events: Table<{ id: string; support_ticket_id: string; actor_id: string | null; event_type: string; body: string | null; metadata: Json; created_at: string }>;
      chat_settings: Table<{
        match_id: string;
        user_id: string;
        nickname: string | null;
        theme: string;
        updated_at: string;
      }, { match_id: string; user_id: string; nickname?: string | null; theme?: string; updated_at?: string }>;
      live_location_shares: Table<{
        id: string;
        match_id: string;
        sender_id: string;
        latitude: number;
        longitude: number;
        accuracy_m: number | null;
        live: boolean;
        expires_at: string;
        created_at: string;
      }, { match_id: string; sender_id: string; latitude: number; longitude: number; accuracy_m?: number | null; live?: boolean; expires_at: string }>;
      push_tokens: Table<{
        id: string;
        user_id: string;
        platform: 'ios' | 'android' | 'web';
        token: string;
        device_label: string | null;
        revoked_at: string | null;
        created_at: string;
        updated_at: string;
      }, { user_id: string; platform: 'ios' | 'android' | 'web'; token: string; device_label?: string | null; revoked_at?: string | null; updated_at?: string }>;
    };
    Views: Record<never, never>;
    Functions: {
      daily_matches: {
        Args: { result_limit?: number };
        Returns: Array<{ profile_id: string; match_id: string; match_label: string }>;
      };
      current_coin_balance: { Args: Record<string, never>; Returns: number };
      request_account_deletion: { Args: Record<string, never>; Returns: string };
      record_profile_view: { Args: { viewed_user_id: string; duration_seconds?: number; source?: string }; Returns: string | null };
      mark_notification_read: { Args: { notification_id: string }; Returns: void };
      submit_match_decision: { Args: { recipient_id: string; decision: 'interested' | 'pass' }; Returns: Json };
      submit_icebreaker_answer: { Args: { p_match_id: string; p_question: string; p_answer: string }; Returns: Json };
      create_date_proposal: {
        Args: {
          p_match_id: string;
          p_venue_name: string;
          p_area_label: string;
          p_proposed_at: string;
          p_safety_check_in?: boolean;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
