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
  client_message_id: string | null;
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
      date_proposals: Table<{ id: string; match_id: string; proposer_id: string; venue_name: string; area_label: string; proposed_at: string; status: 'pending' | 'accepted' | 'declined' | 'countered' | 'completed'; safety_check_in: boolean; responded_by: string | null; responded_at: string | null; completed_at: string | null; created_at: string }>;
      relationship_reflections: Table<{ id: string; date_proposal_id: string; user_id: string; choice: 'continue' | 'pause' | 'close'; use_for_matching: boolean; created_at: string; updated_at: string }, { date_proposal_id: string; user_id: string; choice: 'continue' | 'pause' | 'close'; use_for_matching?: boolean; updated_at?: string }>;
      relationship_learning_signals: Table<{ id: string; user_id: string; source_reflection_id: string; signal: 'positive' | 'neutral' | 'negative'; active: boolean; created_at: string; updated_at: string }>;
      relationship_reminders: Table<{ id: string; date_proposal_id: string; user_id: string; enabled: boolean; reminder_at: string; delivered_at: string | null; created_at: string; updated_at: string }>;
      relationship_journey_events: Table<{ id: string; user_id: string; event_name: 'relationship_path_opened' | 'date_plan_status_changed' | 'private_reflection_saved' | 'relationship_learning_consent_changed' | 'date_reminder_changed'; properties: Json; occurred_at: string }>;
      trusted_vouches: Table<{ id: string; user_id: string; voucher_hash: string; qualities: string[]; status: 'pending' | 'complete' | 'revoked'; created_at: string }>;
      discovery_signals: Table<{ id: string; user_id: string; target_id: string; signal: 'view' | 'interested' | 'skip'; client_action_id: string | null; created_at: string }>;
      profile_match_attributes: Table<{
        user_id: string;
        gender: 'woman' | 'man' | 'nonbinary';
        family_priority: 'high' | 'balanced' | 'independent';
        children_intent: 'wants' | 'open' | 'does_not_want';
        marriage_timeline: '1_2_years' | '2_3_years' | 'later';
        relocation: 'open' | 'same_city' | 'not_open';
        languages: string[];
        updated_at: string;
      }>;
      matching_preferences: Table<{
        user_id: string;
        looking_for: 'women' | 'men' | 'everyone';
        min_age: number;
        max_age: number;
        cities: string[];
        intents: PreferenceRow['intent'][];
        must_have_vibes: string[];
        family_priority: 'any' | 'high' | 'balanced';
        children: 'any' | 'wants' | 'open' | 'does_not_want';
        marriage_timeline: 'any' | '1_2_years' | '2_3_years';
        relocation: 'any' | 'open' | 'same_city';
        distance_preference: 'anywhere' | 'selected_cities' | 'same_state' | 'open_to_relocate';
        smart_discovery: boolean;
        updated_at: string;
      }>;
      matching_model_versions: Table<{ version: string; status: 'active' | 'retired'; weights: Json; notes: string | null; activated_at: string | null; created_at: string }>;
      daily_match_recommendations: Table<{ id: string; user_id: string; target_id: string; match_id: string; recommendation_day: string; rank: number; label: MatchRow['label']; reasons: string[]; model_version: string; score_internal: number; created_at: string }>;
      match_feedback: Table<{ id: string; user_id: string; match_id: string; feedback: 'promising' | 'not_aligned' | 'met_in_person'; use_for_matching: boolean; client_action_id: string; created_at: string; updated_at: string }>;
      matching_model_events: Table<{ id: string; model_version: string; action: 'activated' | 'quality_snapshot' | 'rollback' | 'evaluation'; actor_id: string | null; metrics: Json; created_at: string }>;
      matching_model_guardrails: Table<{ model_version: string; minimum_recommendations: number; minimum_conversation_rate: number; minimum_date_acceptance_rate: number; maximum_report_rate: number; maximum_exposure_gap: number; minimum_precision_at_5: number; minimum_eligible_coverage_rate: number; minimum_safety_exclusion_recall: number; created_at: string; updated_at: string }>;
      matching_evaluation_runs: Table<{ id: string; model_version: string; dataset_version: string; evaluation_kind: 'offline' | 'shadow'; sample_size: number; metrics: Json; status: 'passed' | 'failed'; approved_by_role: string; change_ticket: string; created_at: string }>;
      subscriptions: Table<{ user_id: string; plan: 'free' | 'plus'; status: string; provider: string | null; provider_customer_id: string | null; expires_at: string | null; updated_at: string }>;
      coin_ledger: Table<{ id: string; user_id: string; amount: number; reason: string; reference_id: string | null; created_at: string }>;
      blocks: Table<{ blocker_id: string; blocked_id: string; created_at: string }>;
      reports: Table<{ id: string; reporter_id: string; reported_id: string; reason: string; details: string | null; client_action_id: string | null; severity: 'normal' | 'high' | 'critical'; triage_due_at: string | null; status: 'open' | 'reviewing' | 'resolved'; created_at: string }>;
      trust_ops_reviewers: Table<{ id: string; user_id: string; role: 'reviewer' | 'lead' | 'legal'; status: 'active' | 'inactive'; regions: string[]; created_at: string; updated_at: string }>;
      moderation_cases: Table<{ id: string; report_id: string; subject_id: string; category: 'identity' | 'harassment' | 'money_scam' | 'unsafe_meeting' | 'content' | 'support'; severity: 'normal' | 'high' | 'critical'; priority: number; status: 'new' | 'triage' | 'frozen' | 'escalated' | 'resolved' | 'dismissed'; assigned_reviewer_id: string | null; sla_due_at: string; evidence_hold_until: string; member_notice_status: 'pending' | 'sent' | 'not_required'; created_at: string; updated_at: string; resolved_at: string | null }>;
      moderation_case_events: Table<{ id: string; case_id: string; actor_kind: 'system' | 'reviewer' | 'member'; actor_id: string | null; action: 'case_created' | 'claimed' | 'frozen' | 'escalated' | 'resolved' | 'dismissed' | 'reopened' | 'appeal_submitted' | 'appeal_upheld' | 'appeal_overturned'; idempotency_key: string; note: string | null; metadata: Json; created_at: string }>;
      member_enforcement_states: Table<{ user_id: string; discovery_frozen: boolean; chat_frozen: boolean; gifts_frozen: boolean; payments_frozen: boolean; dates_frozen: boolean; reason_case_id: string | null; expires_at: string | null; updated_at: string }>;
      moderation_appeals: Table<{ id: string; case_id: string; appellant_id: string; reason: string; client_action_id: string; status: 'submitted' | 'reviewing' | 'upheld' | 'overturned'; reviewer_id: string | null; decision_note: string | null; created_at: string; resolved_at: string | null }>;
      safety_action_events: Table<{ id: string; actor_id: string; target_id: string | null; match_id: string | null; report_id: string | null; action: 'report_submitted' | 'member_blocked' | 'match_unmatched' | 'live_location_started'; client_action_id: string; metadata: Json; created_at: string }>;
      safety_checkins: Table<{ id: string; user_id: string; date_proposal_id: string; status: 'scheduled' | 'safe' | 'needs_help'; checked_in_at: string | null; created_at: string }>;
      deletion_requests: Table<{ id: string; user_id: string; status: 'requested' | 'processing' | 'complete' | 'rejected'; requested_at: string; completed_at: string | null }>;
      privacy_settings: Table<{
        user_id: string;
        last_seen_visible: boolean;
        online_status_visible: boolean;
        profile_view_notifications: boolean;
        private_mode: boolean;
        profile_view_threshold_seconds: number;
        analytics_consent: boolean;
        updated_at: string;
      }, { user_id: string } & Partial<{ last_seen_visible: boolean; online_status_visible: boolean; profile_view_notifications: boolean; private_mode: boolean; profile_view_threshold_seconds: number; analytics_consent: boolean; updated_at: string }>>;
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
        client_action_id: string | null;
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
      city_launch_markets: Table<{
        city_key: 'nyc' | 'bay_area' | 'dallas' | 'toronto' | 'chicago'; display_name: string; country_code: 'US' | 'CA';
        discovery_state: 'waitlist_only' | 'controlled_pilot' | 'healthy_pilot' | 'open'; verified_active_goal: number;
        adjacent_market: string | null; updated_at: string;
      }>;
      city_waitlist_entries: Table<{
        id: string; user_id: string; city_key: string; locality: string; region: string; country_code: 'US' | 'CA';
        source: 'member' | 'referral' | 'ambassador' | 'event'; status: 'waiting' | 'invited' | 'activated' | 'paused' | 'declined';
        consented_at: string; invited_at: string | null; activated_at: string | null; created_at: string; updated_at: string;
      }>;
      city_referral_invites: Table<{
        id: string; inviter_id: string; city_key: string; invite_code: string;
        status: 'created' | 'opened' | 'joined' | 'verified' | 'expired' | 'revoked';
        reward_status: 'locked' | 'eligible' | 'granted' | 'reversed'; expires_at: string; created_at: string; redeemed_by: string | null;
      }>;
      city_ambassador_applications: Table<{
        id: string; user_id: string; city_key: string; community_reach: string; hosting_experience: string; safety_commitment: boolean;
        status: 'submitted' | 'interview' | 'approved' | 'declined' | 'paused'; reviewer_id: string | null; reviewer_note: string | null;
        created_at: string; updated_at: string;
      }>;
      city_metric_runs: Table<{
        id: string; city_key: string; snapshot_week: string; source_name: string; source_job_id: string;
        consent_policy_version: string; idempotency_key: string; cohort_count: number; status: 'accepted' | 'rejected'; recorded_at: string;
      }>;
      city_ops_reviewers: Table<{
        id: string; user_id: string; role: 'growth_lead' | 'safety_lead' | 'executive'; status: 'active' | 'inactive'; created_at: string; updated_at: string;
      }>;
      city_expansion_decisions: Table<{
        id: string; city_key: string; from_state: 'waitlist_only' | 'controlled_pilot' | 'healthy_pilot' | 'open';
        to_state: 'waitlist_only' | 'controlled_pilot' | 'healthy_pilot' | 'open'; evidence_snapshot_week: string | null;
        primary_reviewer_id: string; secondary_reviewer_id: string; reason: string; decision_status: 'applied' | 'rolled_back';
        idempotency_key: string; evidence: Json; created_at: string;
      }>;
      marketplace_partner_compliance: Table<{
        partner_id: string; contract_status: 'missing' | 'review' | 'verified' | 'expired'; insurance_status: 'missing' | 'review' | 'verified' | 'expired';
        tax_status: 'missing' | 'review' | 'verified' | 'expired'; payout_status: 'missing' | 'review' | 'verified' | 'paused';
        safety_playbook_accepted: boolean; cancellation_policy_version: string | null; verified_at: string | null; updated_at: string;
      }>;
      marketplace_inventory_sync_runs: Table<{
        id: string; provider: string; provider_sync_id: string; offering_id: string; payload_hash: string; slot_count: number;
        status: 'accepted' | 'rejected'; received_at: string;
      }>;
      marketplace_inventory_holds: Table<{
        quote_id: string; slot_id: string; party_size: number; status: 'held' | 'converted' | 'released' | 'expired';
        expires_at: string; created_at: string; updated_at: string;
      }>;
      marketplace_refund_cases: Table<{
        id: string; order_id: string; requested_by: string; reason: string; eligible_amount_cents: number;
        status: 'requested' | 'provider_pending' | 'approved' | 'partially_refunded' | 'refunded' | 'denied' | 'support_required';
        idempotency_key: string; provider_refund_id: string | null; created_at: string; resolved_at: string | null;
      }>;
      marketplace_reconciliation_cases: Table<{
        id: string; order_id: string; case_type: 'amount_mismatch' | 'stale_confirmation' | 'missing_payment' | 'refund_mismatch' | 'inventory_mismatch' | 'provider_failure';
        severity: 'normal' | 'high' | 'critical'; status: 'open' | 'investigating' | 'resolved' | 'dismissed';
        evidence: Json; created_at: string; resolved_at: string | null;
      }>;
      growth_campaigns: Table<{
        campaign_key: string; channel: 'referral' | 'ambassador' | 'event' | 'partnership' | 'paid_search' | 'paid_social' | 'creator'; city_keys: string[];
        status: 'draft' | 'approved' | 'active' | 'paused' | 'completed' | 'cancelled'; spend_cap_cents: number; starts_at: string | null; ends_at: string | null;
        owner_id: string | null; created_at: string; updated_at: string;
      }>;
      growth_experiment_approvals: Table<{
        id: string; experiment_key: string; reviewer_id: string; reviewer_role: 'product' | 'data' | 'safety'; decision: 'approved' | 'rejected' | 'revoked';
        note: string; expires_at: string; created_at: string;
      }>;
      growth_experiment_metric_snapshots: Table<{
        id: string; experiment_key: string; source_run_id: string; sample_size: number; primary_metric_value: number; report_rate: number; block_rate: number;
        eight_week_retention: number; guardrail_breached: boolean; recorded_at: string; safe_metadata: Json;
      }>;
      growth_experiment_decisions: Table<{
        id: string; experiment_key: string; decision: 'ship' | 'stop' | 'inconclusive' | 'rollback'; reviewer_id: string; reason: string;
        evidence_snapshot_id: string | null; idempotency_key: string; created_at: string;
      }>;
      growth_referral_risk_reviews: Table<{
        id: string; conversion_id: string; reviewer_id: string; decision: 'cleared' | 'rejected' | 'manual_review'; shared_device: boolean;
        shared_payment_identity: boolean; velocity_risk: boolean; risk_evidence_hash: string; note: string; idempotency_key: string; created_at: string;
      }>;
      growth_cohort_ingestion_runs: Table<{
        id: string; snapshot_date: string; source_name: string; source_run_id: string; payload_hash: string; row_count: number; recorded_at: string;
      }>;
    };
    Views: Record<never, never>;
    Functions: {
      daily_matches: {
        Args: { result_limit?: number };
        Returns: Array<{
          profile_id: string;
          match_id: string;
          first_name: string;
          age: number;
          city: string;
          profession: string;
          bio: string | null;
          verified: boolean;
          gender: 'woman' | 'man' | 'nonbinary';
          intent: PreferenceRow['intent'];
          vibes: string[];
          family_priority: 'high' | 'balanced' | 'independent';
          children_intent: 'wants' | 'open' | 'does_not_want';
          marriage_timeline: '1_2_years' | '2_3_years' | 'later';
          relocation: 'open' | 'same_city' | 'not_open';
          languages: string[];
          vouch_count: number;
          photo_paths: string[];
          match_label: string;
          reasons: string[];
          model_version: string;
        }>;
      };
      get_matching_pool_status: { Args: Record<string, never>; Returns: Json };
      activate_matching_model: { Args: { p_version: string; p_metrics?: Json }; Returns: void };
      record_matching_quality_snapshot: { Args: { p_metrics: Json }; Returns: Json };
      record_matching_evaluation: { Args: { p_model_version: string; p_dataset_version: string; p_evaluation_kind: 'offline' | 'shadow'; p_sample_size: number; p_metrics: Json; p_approved_by_role: string; p_change_ticket: string }; Returns: Json };
      rollback_matching_model: { Args: { p_version: string; p_reason: string; p_change_ticket: string }; Returns: void };
      save_matching_preferences: { Args: { p_preferences: Json; p_attributes?: Json }; Returns: Json };
      submit_match_feedback: { Args: { p_match_id: string; p_feedback: 'promising' | 'not_aligned' | 'met_in_person'; p_use_for_matching: boolean; p_client_action_id: string }; Returns: Json };
      apply_moderation_action: { Args: { p_case_id: string; p_action: 'claim' | 'freeze' | 'escalate' | 'resolve' | 'dismiss' | 'reopen'; p_reviewer_id: string; p_note: string; p_idempotency_key: string; p_action_payload?: Json }; Returns: Json };
      submit_moderation_appeal: { Args: { p_case_id: string; p_reason: string; p_client_action_id: string }; Returns: Json };
      resolve_moderation_appeal: { Args: { p_appeal_id: string; p_decision: 'upheld' | 'overturned'; p_reviewer_id: string; p_note: string; p_idempotency_key: string }; Returns: Json };
      clear_matching_learning: { Args: Record<string, never>; Returns: void };
      record_discovery_signal: { Args: { p_target_id: string; p_signal: 'view' | 'interested' | 'skip'; p_client_action_id: string }; Returns: Json };
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
      respond_to_date_proposal: { Args: { p_date_proposal_id: string; p_response: 'accepted' | 'declined' | 'countered' }; Returns: Json };
      complete_date_proposal: { Args: { p_date_proposal_id: string }; Returns: Json };
      upsert_relationship_reflection: { Args: { p_date_proposal_id: string; p_choice: 'continue' | 'pause' | 'close'; p_use_for_matching?: boolean }; Returns: Json };
      set_relationship_reminder: { Args: { p_date_proposal_id: string; p_enabled: boolean }; Returns: Json };
      record_relationship_journey_event: { Args: { p_event_name: string; p_properties?: Json }; Returns: string | null };
      process_relationship_reminders: { Args: { p_limit?: number }; Returns: number };
      get_relationship_journey: { Args: { p_match_id: string }; Returns: Json };
      get_current_member_bootstrap: { Args: Record<string, never>; Returns: Json };
      block_member: { Args: { p_blocked_id: string }; Returns: void };
      submit_member_report: { Args: { p_reported_id: string; p_reason: string; p_details: string | null; p_client_action_id: string }; Returns: Json };
      unmatch_member: { Args: { p_match_id: string; p_client_action_id: string }; Returns: Json };
      start_live_location_share: {
        Args: {
          p_match_id: string;
          p_client_action_id: string;
          p_latitude: number;
          p_longitude: number;
          p_accuracy_m?: number | null;
          p_duration_minutes?: number;
        };
        Returns: Json;
      };
      save_current_member_profile: {
        Args: {
          p_profile: Json;
          p_preferences: Json;
          p_photo_paths?: string[] | null;
        };
        Returns: Json;
      };
      send_match_message: {
        Args: {
          p_match_id: string;
          p_client_message_id: string;
          p_kind: MessageRow['kind'];
          p_body?: string | null;
          p_media_path?: string | null;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      join_city_waitlist: {
        Args: { p_city_key: string; p_locality: string; p_region: string; p_country_code: 'US' | 'CA'; p_source?: 'member' | 'referral' | 'ambassador' | 'event' };
        Returns: Json;
      };
      create_city_referral: { Args: { p_city_key: string }; Returns: Json };
      apply_city_ambassador: {
        Args: { p_city_key: string; p_community_reach: string; p_hosting_experience: string; p_safety_commitment: boolean };
        Returns: Json;
      };
      record_city_density_week: {
        Args: { p_city_key: string; p_snapshot_week: string; p_metrics: Json; p_cohorts: Json; p_source_name: string; p_source_job_id: string; p_consent_policy_version: string; p_idempotency_key: string };
        Returns: Json;
      };
      evaluate_city_expansion: { Args: { p_city_key: string }; Returns: Json };
      apply_city_discovery_decision: {
        Args: { p_city_key: string; p_to_state: 'waitlist_only' | 'controlled_pilot' | 'healthy_pilot' | 'open'; p_primary_reviewer_id: string; p_secondary_reviewer_id: string; p_reason: string; p_idempotency_key: string };
        Returns: Json;
      };
      create_marketplace_quote: { Args: { p_offering_id: string; p_slot_id: string; p_party_size: number; p_idempotency_key: string }; Returns: Json };
      create_marketplace_reservation_order: { Args: { p_quote_id: string; p_match_id: string; p_idempotency_key: string }; Returns: Json };
      respond_marketplace_reservation_order: { Args: { p_order_id: string; p_accept: boolean; p_idempotency_key: string }; Returns: Json };
      cancel_marketplace_reservation_order: { Args: { p_order_id: string; p_reason: string; p_idempotency_key: string }; Returns: Json };
      expire_marketplace_inventory_holds: { Args: { p_limit?: number }; Returns: number };
      sync_marketplace_inventory: { Args: { p_provider: string; p_provider_sync_id: string; p_offering_id: string; p_slots: Json; p_payload_hash: string }; Returns: Json };
      request_marketplace_refund: { Args: { p_order_id: string; p_reason: string; p_idempotency_key: string }; Returns: Json };
      reconcile_marketplace_orders: { Args: { p_stale_minutes?: number }; Returns: number };
      record_growth_event: {
        Args: { p_event_id: string; p_session_id: string; p_event_name: string; p_properties?: Json };
        Returns: boolean;
      };
      record_growth_attribution_touch: {
        Args: { p_touch_id: string; p_channel: string; p_campaign_key?: string | null; p_city_key?: string | null };
        Returns: boolean;
      };
      redeem_growth_referral: {
        Args: { p_invite_code: string; p_idempotency_key: string };
        Returns: Json;
      };
      assign_growth_experiment: { Args: { p_experiment_key: string }; Returns: Json };
      record_growth_experiment_exposure: { Args: { p_experiment_key: string; p_variant_key: string }; Returns: boolean };
      withdraw_growth_analytics_consent: { Args: Record<string, never>; Returns: boolean };
      start_growth_experiment: { Args: { p_experiment_key: string; p_rollout_percent: number; p_starts_at: string; p_idempotency_key: string }; Returns: Json };
      record_growth_experiment_metric_snapshot: { Args: { p_experiment_key: string; p_source_run_id: string; p_sample_size: number; p_primary_metric_value: number; p_report_rate: number; p_block_rate: number; p_eight_week_retention: number; p_safe_metadata?: Json }; Returns: Json };
      decide_growth_experiment: { Args: { p_experiment_key: string; p_decision: 'ship' | 'stop' | 'inconclusive' | 'rollback'; p_reviewer_id: string; p_reason: string; p_evidence_snapshot_id: string; p_idempotency_key: string }; Returns: Json };
      review_growth_referral_risk: { Args: { p_conversion_id: string; p_reviewer_id: string; p_decision: 'cleared' | 'rejected' | 'manual_review'; p_shared_device: boolean; p_shared_payment_identity: boolean; p_velocity_risk: boolean; p_risk_evidence_hash: string; p_note: string; p_idempotency_key: string }; Returns: Json };
      reverse_growth_referral_reward: { Args: { p_conversion_id: string; p_reviewer_id: string; p_reason: string; p_idempotency_key: string }; Returns: boolean };
      record_growth_cohort_snapshot: { Args: { p_snapshot_date: string; p_source_name: string; p_source_run_id: string; p_payload_hash: string; p_rows: Json }; Returns: Json };
      get_current_entitlements: { Args: Record<string, never>; Returns: Json };
      restore_store_purchases: { Args: Record<string, never>; Returns: Json };
      prepare_store_purchase: {
        Args: { p_product_key: string; p_platform: 'apple_iap' | 'google_play'; p_idempotency_key: string };
        Returns: Json;
      };
      consume_billing_entitlement: {
        Args: { p_entitlement_key: string; p_units: number; p_idempotency_key: string };
        Returns: Json;
      };
      send_golden_spark: {
        Args: { p_recipient_id: string; p_note: string; p_idempotency_key: string };
        Returns: Json;
      };
      request_billing_refund: {
        Args: { p_receipt_id: string; p_reason: string; p_idempotency_key: string };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
