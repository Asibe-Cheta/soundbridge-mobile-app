-- Pro Resource Analytics
-- Tracks who taps "Explore Courses" in the feed, views the Pro Resources screen,
-- and taps any Sound Academy / partner resource links.

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pro_resource_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  text        NOT NULL,
  -- event_type values:
  --   'explore_courses_tap'  — tapped the feed banner "Explore Courses" button
  --   'screen_view'          — opened the Pro Resources screen
  --   'resource_tap'         — tapped a specific partner resource/link
  resource    text,
  -- resource values (used when event_type = 'resource_tap'):
  --   'sa_module_1'     — Sound Academy Module 1 card
  --   'sa_module_2'     — Sound Academy Module 2 card
  --   'sa_booking'      — Sound Academy "Book a Free Appointment" (Calendly)
  --   't2d_t2d-1'       — Talk 2 Dan: Young People service card
  --   't2d_t2d-2'       — Talk 2 Dan: Universities & Colleges service card
  --   't2d_t2d-3'       — Talk 2 Dan: Media Companies service card
  --   't2d_t2d-4'       — Talk 2 Dan: Recruitment service card
  --   't2d_website'     — Talk 2 Dan main CTA button
  --   'herts_website'   — University of Hertfordshire CTA button
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pre_user_id    ON public.pro_resource_events (user_id);
CREATE INDEX IF NOT EXISTS idx_pre_type       ON public.pro_resource_events (event_type);
CREATE INDEX IF NOT EXISTS idx_pre_created_at ON public.pro_resource_events (created_at DESC);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.pro_resource_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own events only
CREATE POLICY "pre_insert_own" ON public.pro_resource_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only admin profiles (is_admin = true) can read — service role bypasses RLS by default
CREATE POLICY "pre_admin_select" ON public.pro_resource_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- ─── Admin summary view ───────────────────────────────────────────────────────
-- Web admin dashboard: aggregate breakdown by event + resource

CREATE OR REPLACE VIEW public.pro_resource_analytics_summary AS
SELECT
  event_type,
  resource,
  COUNT(*)                                                               AS total_events,
  COUNT(DISTINCT user_id)                                                AS unique_users,
  COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '7 days')       AS events_7d,
  COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '30 days')      AS events_30d,
  MAX(created_at)                                                        AS last_event_at
FROM public.pro_resource_events
GROUP BY event_type, resource
ORDER BY total_events DESC;

-- ─── Admin per-user view ──────────────────────────────────────────────────────
-- Web admin dashboard: per-event rows joined with user profile

CREATE OR REPLACE VIEW public.pro_resource_user_events AS
SELECT
  e.id,
  e.event_type,
  e.resource,
  e.created_at,
  e.user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.subscription_tier
FROM  public.pro_resource_events e
LEFT JOIN public.profiles p ON p.id = e.user_id
ORDER BY e.created_at DESC;
