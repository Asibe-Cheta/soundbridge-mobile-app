-- Add headline and gradient_preset columns to posts table for Headline Post feature
alter table public.posts
  add column if not exists headline text,
  add column if not exists gradient_preset integer default 1;
