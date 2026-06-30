-- tip_room_tips: records every tip paid through the /tip/{username} web page
-- Inserted by the web backend (service role) after Stripe payment succeeds.

create table if not exists public.tip_room_tips (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.profiles(id) on delete cascade,
  amount      decimal(10,2) not null,
  currency    text not null default 'gbp',
  tipped_at   timestamptz not null default now()
);

alter table public.tip_room_tips enable row level security;

-- Creators read their own tips (for the stats counter)
create policy "tip_room_creator_select" on public.tip_room_tips
  for select using (creator_id = auth.uid());

-- Web backend inserts via service role — no insert policy needed for anon/auth users
