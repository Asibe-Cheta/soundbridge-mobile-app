-- Bridge First-Time Intro (AI_INTRO.MD)
--
-- One-time flag, independent of general onboarding status — everyone needs to see the
-- Bridge intro once, including existing users who've already used the AI Career Advisor
-- before this feature shipped. NOT NULL DEFAULT false backfills every existing row
-- automatically (same idiom as talent_category_prompted), not just new signups.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bridge_intro_seen boolean NOT NULL DEFAULT false;
