-- Additive creator role upgrade (Item 19 — ADDITIVE_CREATOR_ROLE.MD)
--
-- Today `profiles.role` is a single exclusive value ('creator' | 'listener').
-- Flipping it destructively overwrites Audio Lover status, breaking every
-- `role === 'listener'` check that gates tipping/referral/engagement UI.
--
-- This migration adds an ADDITIVE creator flag instead: `is_creator`.
-- `role` is left untouched by the upgrade flow going forward — an Audio
-- Lover who becomes a creator keeps role = 'listener' forever, and creator
-- access is granted purely via is_creator = true. Existing creators are
-- backfilled so isCreator() checks (role === 'creator' OR is_creator) hold
-- for both old and new accounts.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_creator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS creator_agreement_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS creator_agreement_version text,
  ADD COLUMN IF NOT EXISTS creator_upgraded_at timestamptz;

UPDATE public.profiles
SET is_creator = true
WHERE role = 'creator'::user_role
  AND is_creator IS DISTINCT FROM true;
