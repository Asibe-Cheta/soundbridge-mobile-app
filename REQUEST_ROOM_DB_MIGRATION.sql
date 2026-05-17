-- Request Room Sessions
CREATE TABLE IF NOT EXISTS public.request_room_sessions (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_name            TEXT,
  minimum_tip_amount      NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at              TIMESTAMPTZ DEFAULT NOW(),
  ended_at                TIMESTAMPTZ,
  total_tips_collected    NUMERIC(10, 2) DEFAULT 0,
  total_requests_received INTEGER DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.request_room_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage own sessions"
  ON public.request_room_sessions FOR ALL
  USING (auth.uid() = creator_id);

CREATE POLICY "Anyone can read active sessions"
  ON public.request_room_sessions FOR SELECT
  USING (status = 'active');


-- Request Room Requests
CREATE TABLE IF NOT EXISTS public.request_room_requests (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id        UUID NOT NULL REFERENCES public.request_room_sessions(id) ON DELETE CASCADE,
  creator_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_request      TEXT NOT NULL,
  tipper_name       TEXT NOT NULL DEFAULT 'Anonymous',
  tipper_user_id    UUID REFERENCES public.profiles(id),
  tip_amount        NUMERIC(10, 2) NOT NULL,
  payment_intent_id TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'done')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.request_room_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage requests in own sessions"
  ON public.request_room_requests FOR ALL
  USING (auth.uid() = creator_id);

CREATE POLICY "Anyone can read requests"
  ON public.request_room_requests FOR SELECT
  USING (true);


-- Request Room Leads (GDPR opt-in emails from non-registered tippers)
CREATE TABLE IF NOT EXISTS public.request_room_leads (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id   UUID NOT NULL REFERENCES public.request_room_sessions(id) ON DELETE CASCADE,
  creator_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  tip_amount   NUMERIC(10, 2),
  song_request TEXT,
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  converted    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.request_room_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators read own session leads"
  ON public.request_room_leads FOR SELECT
  USING (auth.uid() = creator_id);


-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_room_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_room_sessions;
