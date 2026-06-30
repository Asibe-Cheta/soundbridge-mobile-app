# Web Team: PPL ISRC Auto-Assignment Migration

## Summary

The mobile app now auto-assigns GB-KTZ ISRCs (PPL First Registrant Code: GXKTZ) to
original music tracks at upload time. ISRCs are sequential, year-scoped, and generated
atomically server-side via a Supabase RPC function to prevent duplicates under concurrent uploads.

## Required Migration

Run this SQL against the production Supabase instance **in order**:

### 1. Sequence table (single-row, row-locked for atomic increment)

```sql
CREATE TABLE IF NOT EXISTS isrc_sequence (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  year        VARCHAR(2) NOT NULL DEFAULT TO_CHAR(NOW(), 'YY'),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO isrc_sequence (id, last_sequence, year)
VALUES (1, 0, TO_CHAR(NOW(), 'YY'))
ON CONFLICT DO NOTHING;
```

### 2. New columns on audio_tracks

```sql
ALTER TABLE audio_tracks
  ADD COLUMN IF NOT EXISTS isrc_source TEXT
    CHECK (isrc_source IN ('acrcloud_detected', 'user_provided', 'soundbridge_generated')),
  ADD COLUMN IF NOT EXISTS is_cover     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visibility   TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'followers_only', 'private'));

-- Expand isrc_code to hold hyphenated generated codes (e.g. GB-KTZ-26-00001 = 15 chars)
ALTER TABLE audio_tracks
  ALTER COLUMN isrc_code TYPE VARCHAR(32);
```

### 3. RPC function (row-level locking, year-rollover safe)

```sql
CREATE OR REPLACE FUNCTION assign_soundbridge_isrc(p_track_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year     TEXT;
  v_sequence INTEGER;
  v_isrc     TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YY');

  -- Lock the single sequence row for the duration of this transaction
  UPDATE isrc_sequence
  SET
    last_sequence = CASE
                      WHEN year != v_year THEN 1
                      ELSE last_sequence + 1
                    END,
    year       = v_year,
    updated_at = NOW()
  WHERE id = 1
  RETURNING last_sequence INTO v_sequence;

  v_isrc := 'GB-KTZ-' || v_year || '-' || LPAD(v_sequence::TEXT, 5, '0');

  -- Only assign if the track still has no ISRC and is not a cover
  UPDATE audio_tracks
  SET
    isrc_code   = v_isrc,
    isrc_source = 'soundbridge_generated'
  WHERE id = p_track_id
    AND isrc_code IS NULL
    AND (is_cover = FALSE OR is_cover IS NULL);

  RETURN v_isrc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. RLS — allow authenticated users to call the RPC

The function is `SECURITY DEFINER` so it runs as the function owner and does not need
direct table-level INSERT/UPDATE grants. However, make sure the `anon` / `authenticated`
role can execute it:

```sql
GRANT EXECUTE ON FUNCTION assign_soundbridge_isrc(UUID) TO authenticated;
```

### 5. RLS on isrc_sequence (deny direct client access)

```sql
ALTER TABLE isrc_sequence ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE policies — only the SECURITY DEFINER function may touch it.
```

---

## Resulting ISRC Format

```
GB-KTZ-YY-NNNNN
```

- `GB`    — country (United Kingdom)
- `KTZ`   — registrant code (PPL First Registrant Code: GXKTZ → KTZ)
- `YY`    — 2-digit year (e.g. `26` for 2026)
- `NNNNN` — zero-padded 5-digit sequence, resets to `00001` each calendar year

Example: `GB-KTZ-26-00001` *(confirmed production: track `c3d8927b-84ff-4d01-8232-e22ad6fd0bcd`)*

**Validation regex (soundbridge_generated):** `^GB-KTZ-\d{2}-\d{5}$`

Note: `user_provided` and `acrcloud_detected` remain standard 12-character canonical ISRCs.
Do **not** assume `isrc_code` length is 12 — generated codes are 15 characters.

---

## When ISRCs Are Assigned

The mobile app assigns an ISRC at upload time when **all** of the following are true:

| Condition | Value |
|-----------|-------|
| Track content type | `music` |
| `is_cover` | `false` or not set |
| `isrc_code` | not provided by the user |
| ACRCloud fingerprint | no existing recording detected |

If the user provides their own ISRC, `isrc_source` is set to `'user_provided'` and the RPC
is not called.

If ACRCloud detects a cover, `is_cover` is set to `true`, `isrc_source` is set to
`'acrcloud_detected'`, and the original recording's ISRC is stored (not a new one assigned).

---

## No Additional Backend Changes Required

All logic runs client-side (mobile) via direct Supabase calls + the RPC above.
The only server requirements are the table, the new columns, and this function.
