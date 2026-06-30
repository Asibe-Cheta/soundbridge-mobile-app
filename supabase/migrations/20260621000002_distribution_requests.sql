-- distribution_requests: one record per paid distribution submission

create table if not exists public.distribution_requests (
  id                       uuid primary key default gen_random_uuid(),
  creator_id               uuid not null references public.profiles(id) on delete cascade,
  track_id                 uuid not null references public.audio_tracks(id) on delete cascade,
  artist_name              text not null,
  track_title              text not null,
  genre                    text,
  isrc_code                text,
  featured_artists         text,
  explicit_content         boolean not null default false,
  rights_confirmed         boolean not null default false,
  requested_release_date   date not null,
  creator_email            text not null,
  distribution_cover_art_url text,
  stripe_payment_id        text not null,
  amount_paid              decimal(10,2) not null default 15.79,
  payment_status           text not null default 'paid',
  email_sent_to_partner    boolean not null default false,
  email_sent_at            timestamptz,
  track_status             text not null default 'submitted',
  track_went_live_at       timestamptz,
  created_at               timestamptz not null default now()
);

alter table public.distribution_requests enable row level security;

-- Creators read their own
create policy "dist_req_creator_select" on public.distribution_requests
  for select using (creator_id = auth.uid());

-- Creators insert their own
create policy "dist_req_creator_insert" on public.distribution_requests
  for insert with check (creator_id = auth.uid());

-- Admins read all
create policy "dist_req_admin_select" on public.distribution_requests
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Admins update all (mark as live, update email_sent_to_partner, etc.)
create policy "dist_req_admin_update" on public.distribution_requests
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
