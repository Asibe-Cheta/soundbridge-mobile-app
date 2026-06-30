-- Discovery Intelligence (mobile + web shared schema)
-- See DISCOVERY_INTELLIGENCE_TIGHTENED_LOGIC.MD
-- This is the version that was successfully run in production.

ALTER TABLE public.audio_tracks
  ADD COLUMN IF NOT EXISTS mood_tags text[];

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_moods text[];

-- ---------------------------------------------------------------------------
-- live_interest_responses (source of truth for live_interest_rate)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_interest_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.audio_tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  responded_yes boolean NOT NULL DEFAULT false,
  availability_preference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_interest_responses_track
  ON public.live_interest_responses(track_id);

CREATE INDEX IF NOT EXISTS idx_live_interest_responses_user
  ON public.live_interest_responses(user_id);

-- ---------------------------------------------------------------------------
-- play_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.play_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.audio_tracks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  played_at timestamptz NOT NULL DEFAULT now(),
  play_duration_seconds integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_play_sessions_track_user_played
  ON public.play_sessions(track_id, user_id, played_at DESC);

CREATE INDEX IF NOT EXISTS idx_play_sessions_track_played
  ON public.play_sessions(track_id, played_at DESC);

-- ---------------------------------------------------------------------------
-- track_quality_signals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.track_quality_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL UNIQUE REFERENCES public.audio_tracks(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_plays integer NOT NULL DEFAULT 0,
  unique_listeners integer NOT NULL DEFAULT 0,
  repeat_listens integer NOT NULL DEFAULT 0,
  tip_count integer NOT NULL DEFAULT 0,
  tip_total_amount numeric(12, 2) NOT NULL DEFAULT 0,
  tip_rate numeric(8, 6) NOT NULL DEFAULT 0,
  live_interest_yes_count integer NOT NULL DEFAULT 0,
  live_interest_rate numeric(8, 6) NOT NULL DEFAULT 0,
  share_count integer NOT NULL DEFAULT 0,
  bookmark_count integer NOT NULL DEFAULT 0,
  quality_score numeric(6, 2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_track_quality_signals_creator
  ON public.track_quality_signals(creator_id);

CREATE INDEX IF NOT EXISTS idx_track_quality_signals_score
  ON public.track_quality_signals(quality_score DESC);

-- ---------------------------------------------------------------------------
-- listener_genre_affinity
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listener_genre_affinity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  affinity_score numeric(8, 4) NOT NULL DEFAULT 0,
  tips_sent integer NOT NULL DEFAULT 0,
  repeat_listens integer NOT NULL DEFAULT 0,
  live_interest_expressed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_listener_genre_affinity_creator
  ON public.listener_genre_affinity(creator_id);

CREATE INDEX IF NOT EXISTS idx_listener_genre_affinity_user
  ON public.listener_genre_affinity(user_id);

-- Monthly snapshots for growth signals (Unlimited tier)
CREATE TABLE IF NOT EXISTS public.track_quality_monthly_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.audio_tracks(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month_start date NOT NULL,
  quality_score numeric(6, 2) NOT NULL DEFAULT 0,
  repeat_listen_rate numeric(8, 6) NOT NULL DEFAULT 0,
  tip_rate numeric(8, 6) NOT NULL DEFAULT 0,
  total_plays integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, month_start)
);

-- ---------------------------------------------------------------------------
-- Ensure signal row exists for a track
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_track_quality_signals(p_track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
BEGIN
  SELECT creator_id INTO v_creator_id FROM public.audio_tracks WHERE id = p_track_id;
  IF v_creator_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.track_quality_signals (track_id, creator_id)
  VALUES (p_track_id, v_creator_id)
  ON CONFLICT (track_id) DO NOTHING;
END;
$$;

-- ---------------------------------------------------------------------------
-- recalculate_quality_score — do not rename (mobile references this name)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_quality_score(p_track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signals public.track_quality_signals%ROWTYPE;
  v_score numeric := 0;
  v_repeat_component numeric := 0;
  v_social_component numeric := 0;
BEGIN
  PERFORM public.ensure_track_quality_signals(p_track_id);

  SELECT * INTO v_signals FROM public.track_quality_signals WHERE track_id = p_track_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_signals.total_plays > 0 THEN
    v_repeat_component := (v_signals.repeat_listens::numeric / v_signals.total_plays::numeric) * 40;
  END IF;

  v_score := v_repeat_component
    + (COALESCE(v_signals.tip_rate, 0) * 35)
    + (COALESCE(v_signals.live_interest_rate, 0) * 15);

  IF v_signals.unique_listeners > 0 THEN
    v_social_component :=
      ((v_signals.share_count + v_signals.bookmark_count)::numeric / v_signals.unique_listeners::numeric) * 10;
  END IF;

  v_score := LEAST(100, GREATEST(0, v_score + v_social_component));

  UPDATE public.track_quality_signals
  SET quality_score = round(v_score, 2),
      updated_at = now()
  WHERE track_id = p_track_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Sync live interest aggregates from live_interest_responses
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_track_quality_live_interest(p_track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_yes integer;
  v_total integer;
  v_rate numeric;
BEGIN
  PERFORM public.ensure_track_quality_signals(p_track_id);

  SELECT
    COUNT(*) FILTER (WHERE responded_yes = true),
    COUNT(*)
  INTO v_yes, v_total
  FROM public.live_interest_responses
  WHERE track_id = p_track_id;

  v_rate := CASE WHEN v_total > 0 THEN v_yes::numeric / v_total::numeric ELSE 0 END;

  UPDATE public.track_quality_signals
  SET live_interest_yes_count = COALESCE(v_yes, 0),
      live_interest_rate = COALESCE(v_rate, 0),
      updated_at = now()
  WHERE track_id = p_track_id;

  PERFORM public.recalculate_quality_score(p_track_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Record a valid play (≥30s or ≥50% duration) — called by mobile
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_valid_play_session(
  p_track_id uuid,
  p_user_id uuid,
  p_play_duration_seconds integer,
  p_completed boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
  v_is_repeat boolean := false;
BEGIN
  SELECT creator_id INTO v_creator_id FROM public.audio_tracks WHERE id = p_track_id;
  IF v_creator_id IS NULL THEN
    RETURN;
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.play_sessions ps
      WHERE ps.track_id = p_track_id
        AND ps.user_id = p_user_id
        AND ps.played_at > now() - interval '30 days'
    ) INTO v_is_repeat;
  END IF;

  INSERT INTO public.play_sessions (track_id, user_id, play_duration_seconds, completed)
  VALUES (p_track_id, p_user_id, GREATEST(0, COALESCE(p_play_duration_seconds, 0)), COALESCE(p_completed, false));

  PERFORM public.ensure_track_quality_signals(p_track_id);

  UPDATE public.track_quality_signals tqs
  SET
    total_plays = total_plays + 1,
    unique_listeners = (
      SELECT COUNT(DISTINCT user_id)::integer
      FROM public.play_sessions
      WHERE track_id = p_track_id AND user_id IS NOT NULL
    ),
    repeat_listens = repeat_listens + CASE WHEN v_is_repeat THEN 1 ELSE 0 END,
    updated_at = now()
  WHERE track_id = p_track_id;

  IF p_user_id IS NOT NULL AND v_is_repeat THEN
    INSERT INTO public.listener_genre_affinity (user_id, creator_id, repeat_listens, affinity_score, updated_at)
    VALUES (p_user_id, v_creator_id, 1, 1, now())
    ON CONFLICT (user_id, creator_id) DO UPDATE
    SET repeat_listens = public.listener_genre_affinity.repeat_listens + 1,
        affinity_score = public.listener_genre_affinity.affinity_score + 1,
        updated_at = now();
  END IF;

  PERFORM public.recalculate_quality_score(p_track_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Tip processed for a track — called by web tip handler
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_track_quality_from_tip(
  p_track_id uuid,
  p_tipper_id uuid,
  p_tip_amount numeric DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
  v_unique integer;
BEGIN
  SELECT creator_id INTO v_creator_id FROM public.audio_tracks WHERE id = p_track_id;
  IF v_creator_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.ensure_track_quality_signals(p_track_id);

  UPDATE public.track_quality_signals
  SET
    tip_count = tip_count + 1,
    tip_total_amount = tip_total_amount + COALESCE(p_tip_amount, 0),
    updated_at = now()
  WHERE track_id = p_track_id;

  SELECT unique_listeners INTO v_unique FROM public.track_quality_signals WHERE track_id = p_track_id;

  UPDATE public.track_quality_signals
  SET tip_rate = CASE
    WHEN COALESCE(v_unique, 0) > 0 THEN tip_count::numeric / v_unique::numeric
    ELSE 0
  END
  WHERE track_id = p_track_id;

  IF p_tipper_id IS NOT NULL THEN
    INSERT INTO public.listener_genre_affinity (user_id, creator_id, tips_sent, affinity_score, updated_at)
    VALUES (p_tipper_id, v_creator_id, 1, 2, now())
    ON CONFLICT (user_id, creator_id) DO UPDATE
    SET tips_sent = public.listener_genre_affinity.tips_sent + 1,
        affinity_score = public.listener_genre_affinity.affinity_score + 2,
        updated_at = now();
  END IF;

  PERFORM public.recalculate_quality_score(p_track_id);
END;
$$;

-- Trigger: live interest response → sync signals automatically
CREATE OR REPLACE FUNCTION public.trg_live_interest_sync_quality()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_track_quality_live_interest(NEW.track_id);

  IF NEW.responded_yes AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.listener_genre_affinity (
      user_id, creator_id, live_interest_expressed, affinity_score, updated_at
    )
    SELECT NEW.user_id, t.creator_id, true, 3, now()
    FROM public.audio_tracks t
    WHERE t.id = NEW.track_id
    ON CONFLICT (user_id, creator_id) DO UPDATE
    SET live_interest_expressed = true,
        affinity_score = GREATEST(public.listener_genre_affinity.affinity_score, 3),
        updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_interest_sync_quality ON public.live_interest_responses;
CREATE TRIGGER trg_live_interest_sync_quality
  AFTER INSERT OR UPDATE ON public.live_interest_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_live_interest_sync_quality();

-- Auto-create quality row when track is published
CREATE OR REPLACE FUNCTION public.trg_audio_track_quality_signals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_track_quality_signals(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audio_track_quality_signals ON public.audio_tracks;
CREATE TRIGGER trg_audio_track_quality_signals
  AFTER INSERT ON public.audio_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_audio_track_quality_signals();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.play_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_quality_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listener_genre_affinity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_interest_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_quality_monthly_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS play_sessions_insert_own ON public.play_sessions;
CREATE POLICY play_sessions_insert_own ON public.play_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS play_sessions_select_own ON public.play_sessions;
CREATE POLICY play_sessions_select_own ON public.play_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS track_quality_signals_creator_read ON public.track_quality_signals;
CREATE POLICY track_quality_signals_creator_read ON public.track_quality_signals
  FOR SELECT TO authenticated
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS listener_affinity_own_read ON public.listener_genre_affinity;
CREATE POLICY listener_affinity_own_read ON public.listener_genre_affinity
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR creator_id = auth.uid());

DROP POLICY IF EXISTS live_interest_insert_own ON public.live_interest_responses;
CREATE POLICY live_interest_insert_own ON public.live_interest_responses
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS live_interest_update_own ON public.live_interest_responses;
CREATE POLICY live_interest_update_own ON public.live_interest_responses
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS live_interest_select_own ON public.live_interest_responses;
CREATE POLICY live_interest_select_own ON public.live_interest_responses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS live_interest_creator_read ON public.live_interest_responses;
CREATE POLICY live_interest_creator_read ON public.live_interest_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audio_tracks t
      WHERE t.id = live_interest_responses.track_id AND t.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS quality_snapshots_creator_read ON public.track_quality_monthly_snapshots;
CREATE POLICY quality_snapshots_creator_read ON public.track_quality_monthly_snapshots
  FOR SELECT TO authenticated
  USING (creator_id = auth.uid());

COMMENT ON FUNCTION public.recalculate_quality_score(uuid) IS 'Discovery intelligence quality score (0-100). Mobile references this name.';
COMMENT ON COLUMN public.audio_tracks.mood_tags IS 'Up to 3 mood tags for discovery matching';
COMMENT ON COLUMN public.profiles.preferred_moods IS 'Listener mood preferences for discovery feed';
