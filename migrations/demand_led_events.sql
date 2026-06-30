-- Demand-Led Event Creation System
-- See DEMAND_LED_EVENT_CREATION.MD

-- ─── poll_campaigns ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.poll_campaigns (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_body      text        NOT NULL,
  date_options      text[]      NOT NULL,
  location_options  text[]      NOT NULL,
  combined_options  jsonb       NOT NULL DEFAULT '[]',
  total_recipients  integer     NOT NULL DEFAULT 0,
  total_responses   integer     NOT NULL DEFAULT 0,
  sent_at           timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL,  -- 14 days after sent_at
  status            text        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','expired','completed')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_poll_campaigns_creator
  ON public.poll_campaigns(creator_id);

CREATE INDEX IF NOT EXISTS idx_poll_campaigns_status
  ON public.poll_campaigns(status, expires_at);

-- ─── poll_responses ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.poll_responses (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       uuid        NOT NULL REFERENCES public.poll_campaigns(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_option   text        NOT NULL,  -- the full "Location — Date" combo string
  selected_date     text        NOT NULL,
  selected_location text        NOT NULL,
  responded_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id)             -- one response per user per campaign
);

CREATE INDEX IF NOT EXISTS idx_poll_responses_campaign
  ON public.poll_responses(campaign_id);

CREATE INDEX IF NOT EXISTS idx_poll_responses_user
  ON public.poll_responses(user_id);

-- ─── live_interest_push_sent ──────────────────────────────────────────────────
-- Tracks which (user, track) pairs have already received the "listen again"
-- push notification — so it is never sent twice.

CREATE TABLE IF NOT EXISTS public.live_interest_push_sent (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id   uuid        NOT NULL REFERENCES public.audio_tracks(id) ON DELETE CASCADE,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id)
);

-- ─── interest_threshold_notifications ─────────────────────────────────────────
-- Prevents re-notifying the same creator within 30 days.

CREATE TABLE IF NOT EXISTS public.interest_threshold_notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notified_at  timestamptz NOT NULL DEFAULT now(),
  yes_count    integer     NOT NULL DEFAULT 0,
  UNIQUE (creator_id)  -- upsert: update notified_at when re-triggered after 30 days
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.poll_campaigns              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_responses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_interest_push_sent     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_threshold_notifications ENABLE ROW LEVEL SECURITY;

-- poll_campaigns: creator reads/writes their own
DROP POLICY IF EXISTS poll_campaigns_creator ON public.poll_campaigns;
CREATE POLICY poll_campaigns_creator ON public.poll_campaigns
  FOR ALL USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- poll_responses: users insert and read their own
DROP POLICY IF EXISTS poll_responses_insert_own ON public.poll_responses;
CREATE POLICY poll_responses_insert_own ON public.poll_responses
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS poll_responses_read_own ON public.poll_responses;
CREATE POLICY poll_responses_read_own ON public.poll_responses
  FOR SELECT USING (user_id = auth.uid());

-- poll_responses: creator reads all responses to their campaigns
DROP POLICY IF EXISTS poll_responses_creator_read ON public.poll_responses;
CREATE POLICY poll_responses_creator_read ON public.poll_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.poll_campaigns pc
      WHERE pc.id = poll_responses.campaign_id
        AND pc.creator_id = auth.uid()
    )
  );

-- live_interest_push_sent: user inserts/reads their own
DROP POLICY IF EXISTS lips_own ON public.live_interest_push_sent;
CREATE POLICY lips_own ON public.live_interest_push_sent
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- interest_threshold_notifications: service role only (backend cron)
-- No authenticated user policy — read/write via service role key only.

-- ─── dispatch_poll_campaign RPC ───────────────────────────────────────────────
-- Called by mobile on "Send Poll". Creates campaign + inserts a DM message
-- to every interested listener in a single transaction.
-- Returns the new campaign id.

CREATE OR REPLACE FUNCTION public.dispatch_poll_campaign(
  p_creator_id      uuid,
  p_message_body    text,
  p_date_options    text[],
  p_location_options text[],
  p_combined_options jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id  uuid;
  v_recipient    uuid;
  v_count        integer := 0;
  v_dm_content   text;
BEGIN
  -- Count distinct recipients (users who said yes to any track by this creator)
  SELECT COUNT(DISTINCT lir.user_id) INTO v_count
  FROM live_interest_responses lir
  JOIN audio_tracks t ON t.id = lir.track_id
  WHERE t.creator_id = p_creator_id
    AND lir.responded_yes = true
    AND lir.user_id != p_creator_id;

  -- Create campaign record
  INSERT INTO poll_campaigns (
    creator_id, message_body, date_options, location_options,
    combined_options, total_recipients, expires_at
  ) VALUES (
    p_creator_id, p_message_body, p_date_options, p_location_options,
    p_combined_options, v_count, now() + interval '14 days'
  ) RETURNING id INTO v_campaign_id;

  -- Build DM body with options appended
  v_dm_content := p_message_body || chr(10) || chr(10) ||
    '📊 Poll options: ' || array_to_string(
      ARRAY(SELECT opt->>'label' FROM jsonb_array_elements(p_combined_options) opt),
      ' | '
    ) || chr(10) || '[poll:' || v_campaign_id::text || ']';

  -- Send a DM to each interested listener
  FOR v_recipient IN
    SELECT DISTINCT lir.user_id
    FROM live_interest_responses lir
    JOIN audio_tracks t ON t.id = lir.track_id
    WHERE t.creator_id = p_creator_id
      AND lir.responded_yes = true
      AND lir.user_id != p_creator_id
  LOOP
    INSERT INTO messages (sender_id, recipient_id, content, message_type, is_read)
    VALUES (p_creator_id, v_recipient, v_dm_content, 'poll', false);
  END LOOP;

  RETURN v_campaign_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dispatch_poll_campaign(uuid, text, text[], text[], jsonb)
  TO authenticated;

-- ─── respond_to_poll RPC ──────────────────────────────────────────────────────
-- Records a poll response and increments total_responses atomically.

CREATE OR REPLACE FUNCTION public.respond_to_poll(
  p_campaign_id     uuid,
  p_user_id         uuid,
  p_selected_option text,
  p_selected_date   text,
  p_selected_location text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert response (UNIQUE constraint prevents double-voting)
  INSERT INTO poll_responses (
    campaign_id, user_id, selected_option, selected_date, selected_location
  ) VALUES (
    p_campaign_id, p_user_id, p_selected_option, p_selected_date, p_selected_location
  ) ON CONFLICT (campaign_id, user_id) DO UPDATE
    SET selected_option   = EXCLUDED.selected_option,
        selected_date     = EXCLUDED.selected_date,
        selected_location = EXCLUDED.selected_location,
        responded_at      = now();

  -- Increment response counter
  UPDATE poll_campaigns
  SET total_responses = (
    SELECT COUNT(*) FROM poll_responses WHERE campaign_id = p_campaign_id
  )
  WHERE id = p_campaign_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_to_poll(uuid, uuid, text, text, text)
  TO authenticated;

-- ─── get_poll_results RPC ─────────────────────────────────────────────────────
-- Returns aggregated results for a poll campaign. Creator only.

CREATE OR REPLACE FUNCTION public.get_poll_results(p_campaign_id uuid)
RETURNS TABLE (
  selected_option   text,
  selected_date     text,
  selected_location text,
  vote_count        bigint,
  vote_pct          numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
BEGIN
  SELECT total_responses INTO v_total
  FROM poll_campaigns
  WHERE id = p_campaign_id AND creator_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found or access denied';
  END IF;

  RETURN QUERY
  SELECT
    pr.selected_option,
    pr.selected_date,
    pr.selected_location,
    COUNT(*) AS vote_count,
    ROUND(COUNT(*)::numeric / NULLIF(v_total, 0) * 100, 1) AS vote_pct
  FROM poll_responses pr
  WHERE pr.campaign_id = p_campaign_id
  GROUP BY pr.selected_option, pr.selected_date, pr.selected_location
  ORDER BY vote_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_poll_results(uuid) TO authenticated;
