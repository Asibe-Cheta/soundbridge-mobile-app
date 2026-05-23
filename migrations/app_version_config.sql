-- App Version Config table
-- Single-row table (id=1). Justice updates values directly in Supabase dashboard.

create table if not exists public.app_version_config (
  id                              integer primary key default 1,
  min_supported_version_ios       text    not null default '1.0.0',
  min_supported_version_android   text    not null default '1.0.0',
  latest_version_ios              text    not null default '1.7.0',
  latest_version_android          text    not null default '1.7.0',
  force_update_message            text    not null default 'A new version of SoundBridge is available with features you do not want to miss. Please update to continue.',
  soft_update_message             text    not null default 'A new version of SoundBridge is available. Update now to access the latest features.',
  -- Feature flag minimum versions
  min_version_creator_card_ios        text not null default '1.5.0',
  min_version_creator_card_android    text not null default '1.5.0',
  min_version_ai_adviser_ios          text not null default '1.5.0',
  min_version_ai_adviser_android      text not null default '1.5.0',
  min_version_audio_trimmer_ios       text not null default '1.5.0',
  min_version_audio_trimmer_android   text not null default '1.5.0',
  min_version_request_room_ios        text not null default '1.5.0',
  min_version_request_room_android    text not null default '1.5.0',
  updated_at                      timestamptz not null default now(),
  -- Enforce single row
  constraint single_row check (id = 1)
);

-- Seed initial row (noop if already exists)
insert into public.app_version_config (
  id,
  min_supported_version_ios,
  min_supported_version_android,
  latest_version_ios,
  latest_version_android,
  force_update_message,
  soft_update_message,
  min_version_creator_card_ios,
  min_version_creator_card_android,
  min_version_ai_adviser_ios,
  min_version_ai_adviser_android,
  min_version_audio_trimmer_ios,
  min_version_audio_trimmer_android,
  min_version_request_room_ios,
  min_version_request_room_android
)
values (
  1,
  '1.0.0',
  '1.0.0',
  '1.7.0',
  '1.7.0',
  'A new version of SoundBridge is available with features you do not want to miss. Please update to continue.',
  'A new version of SoundBridge is available. Update now to access the latest features.',
  '1.5.0',
  '1.5.0',
  '1.5.0',
  '1.5.0',
  '1.5.0',
  '1.5.0',
  '1.5.0',
  '1.5.0'
)
on conflict (id) do nothing;

-- RLS: public read-only (anyone can fetch version config, including unauthenticated users)
alter table public.app_version_config enable row level security;

drop policy if exists "version_config_public_read" on public.app_version_config;
create policy "version_config_public_read"
  on public.app_version_config
  for select
  using (true);
