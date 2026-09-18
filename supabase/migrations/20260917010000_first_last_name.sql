-- Optional first_name / last_name fields, additive alongside display_name.
--
-- display_name stays the public-facing "how should people call you" field used
-- everywhere for display — it is NOT replaced. first_name/last_name are new,
-- separate, more formal fields for future personalization use cases (e.g. a real
-- name-based greeting). Genuinely optional for every user, no default needed.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;
