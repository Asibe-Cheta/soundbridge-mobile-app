-- Allow 'headline' as a valid post_type value.
-- The original posts_post_type_check constraint was created without this value.
alter table public.posts
  drop constraint if exists posts_post_type_check;

alter table public.posts
  add constraint posts_post_type_check
  check (post_type in ('update', 'opportunity', 'achievement', 'collaboration', 'event', 'headline'));
