-- ============================================================
-- event_bookmarks
-- ============================================================
create table if not exists public.event_bookmarks (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  event_id     uuid        not null references public.events(id) on delete cascade,
  bookmarked_at timestamptz not null default now(),
  unique(user_id, event_id)
);

alter table public.event_bookmarks enable row level security;

create policy "Users can manage their own bookmarks"
  on public.event_bookmarks for all
  using (auth.uid() = user_id);

create index if not exists event_bookmarks_user_id_idx   on public.event_bookmarks(user_id);
create index if not exists event_bookmarks_event_id_idx  on public.event_bookmarks(event_id);

-- ============================================================
-- event_analytics
-- ============================================================
create table if not exists public.event_analytics (
  id                    uuid        primary key default gen_random_uuid(),
  event_id              uuid        not null unique references public.events(id) on delete cascade,
  creator_id            uuid        not null references public.profiles(id) on delete cascade,

  -- Reach
  notifications_sent    integer     not null default 0,
  notifications_opened  integer     not null default 0,
  event_page_views      integer     not null default 0,

  -- Engagement
  bookmarks_count       integer     not null default 0,
  shares_link_count     integer     not null default 0,
  shares_card_count     integer     not null default 0,

  -- Conversion
  ticket_sales_count    integer     not null default 0,
  ticket_sales_revenue  decimal     not null default 0,

  -- Advanced (Unlimited tier only)
  views_by_city         jsonb,
  views_by_genre_match  jsonb,
  notification_open_rate decimal,
  peak_view_hour        integer,

  updated_at            timestamptz not null default now()
);

alter table public.event_analytics enable row level security;

-- Creators can read analytics for their own events
create policy "Creators can read own event analytics"
  on public.event_analytics for select
  using (auth.uid() = creator_id);

create index if not exists event_analytics_event_id_idx   on public.event_analytics(event_id);
create index if not exists event_analytics_creator_id_idx on public.event_analytics(creator_id);

-- ============================================================
-- RPC: track_event_action
-- Called from mobile/web to increment counters without exposing
-- direct write access on event_analytics to non-creators.
-- ============================================================
create or replace function public.track_event_action(
  p_event_id uuid,
  p_action   text   -- 'view' | 'bookmark' | 'unbookmark' | 'share_link' | 'share_card'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator_id uuid;
begin
  -- Look up the event's creator to populate creator_id on first insert
  select creator_id into v_creator_id from events where id = p_event_id;
  if not found then return; end if;

  -- Ensure an analytics row exists for this event
  insert into event_analytics (event_id, creator_id)
  values (p_event_id, v_creator_id)
  on conflict (event_id) do nothing;

  -- Increment the relevant counter
  case p_action
    when 'view' then
      update event_analytics
        set event_page_views = event_page_views + 1,
            updated_at       = now()
        where event_id = p_event_id;

    when 'bookmark' then
      update event_analytics
        set bookmarks_count = bookmarks_count + 1,
            updated_at      = now()
        where event_id = p_event_id;

    when 'unbookmark' then
      update event_analytics
        set bookmarks_count = greatest(0, bookmarks_count - 1),
            updated_at      = now()
        where event_id = p_event_id;

    when 'share_link' then
      update event_analytics
        set shares_link_count = shares_link_count + 1,
            updated_at        = now()
        where event_id = p_event_id;

    when 'share_card' then
      update event_analytics
        set shares_card_count = shares_card_count + 1,
            updated_at        = now()
        where event_id = p_event_id;

    else null;
  end case;
end;
$$;

-- Allow any authenticated user to call the RPC
grant execute on function public.track_event_action(uuid, text) to authenticated;
