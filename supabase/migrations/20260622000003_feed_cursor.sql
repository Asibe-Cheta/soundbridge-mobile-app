-- Feed seen/unseen tracking cursor
alter table public.profiles
  add column if not exists last_feed_caught_up_at timestamptz;
