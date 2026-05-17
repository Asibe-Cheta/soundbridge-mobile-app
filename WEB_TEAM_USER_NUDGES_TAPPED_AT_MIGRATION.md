# Web Team — user_nudges: Add tapped_at Column

## What and Why

The nudge notification system now repeats each nudge every 3 days
until the user taps through to the info screen. When they open the
screen, mobile writes `tapped_at` to stop the nudge repeating.

This requires a new nullable column on `user_nudges`.

## Migration SQL

```sql
ALTER TABLE user_nudges
  ADD COLUMN IF NOT EXISTS tapped_at TIMESTAMPTZ;
```

That's it. No default, no NOT NULL, no index required.

## Impact

- Existing rows: `tapped_at` will be NULL — nudges that already fired
  will re-fire after 3 days until the user taps through. This is the
  correct behaviour for existing users.
- RLS: no change — mobile already has write access to user_nudges for
  its own rows (the upsert is already live).
- The `UPDATE ... WHERE tapped_at IS NULL` query mobile runs is safe
  against the existing RLS policy.

## No Other Changes Needed

No new tables, no FK constraints, no enum values. The nudge_id column
remains unconstrained TEXT as confirmed previously.
