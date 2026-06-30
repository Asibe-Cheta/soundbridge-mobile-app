-- AI Career Adviser — Proactive monitoring tables

-- 1. Opportunity scouting opt-in on venue_notification_preferences
alter table public.venue_notification_preferences
  add column if not exists opportunity_scouting_enabled  boolean      not null default false,
  add column if not exists last_opportunity_search_at    timestamptz;

-- 2. Admin-curated external opportunities
create table if not exists public.curated_opportunities (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text not null,
  opportunity_type text not null,
    -- 'open_mic' | 'venue' | 'policy_change' | 'brand_partnership' | 'industry_news'
  genre_tags       text[]        not null default '{}',
  location_city    text,
  source_url       text,
  expires_at       date,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz   not null default now()
);

alter table public.curated_opportunities enable row level security;

-- Admins full access; everyone else read-only (for matching)
create policy "curated_opps_admin_all" on public.curated_opportunities
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "curated_opps_auth_select" on public.curated_opportunities
  for select using (auth.role() = 'authenticated');

-- 3. Proactive signal records (cheap filter results + generated insights)
create table if not exists public.ai_proactive_signals (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid not null references public.profiles(id) on delete cascade,
  signal_type       text not null,
    -- 'quality_threshold' | 'live_interest' | 'curated_opportunity' | 'service_match'
  signal_data       jsonb not null default '{}',
  generated_insight text,
  shown_to_user     boolean not null default false,
  notified_at       timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.ai_proactive_signals enable row level security;

create policy "proactive_signals_creator_select" on public.ai_proactive_signals
  for select using (creator_id = auth.uid());

create policy "proactive_signals_creator_update" on public.ai_proactive_signals
  for update using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

create index if not exists idx_proactive_signals_creator_unshown
  on public.ai_proactive_signals (creator_id, shown_to_user, created_at desc);

-- Track which opportunities have been surfaced to which creators (avoid re-surfacing)
create table if not exists public.curated_opportunity_surfaces (
  opportunity_id uuid not null references public.curated_opportunities(id) on delete cascade,
  creator_id     uuid not null references public.profiles(id) on delete cascade,
  primary key (opportunity_id, creator_id)
);

alter table public.curated_opportunity_surfaces enable row level security;

create policy "opp_surfaces_service_role" on public.curated_opportunity_surfaces
  for all using (true);
