# SoundBridge Broadcast Playbook

A **broadcast** is an admin-initiated message sent to all users simultaneously. There are three delivery channels that work together:

| Channel | What it does | When to use |
|---|---|---|
| **DM broadcast** (SQL) | Inserts a message into every user's inbox from Justice's account | Always — this is the record in the app |
| **Push notification** (Node script) | Fires a push to every device that has a token | Always — drives open rates |
| **In-app banner** (BroadcastBanner.tsx) | Bottom sheet that appears on app open | When the message requires user action (e.g. turn on location) |

---

## Step 1 — DM Broadcast (SQL)

Run in the Supabase Dashboard → **SQL editor → New query**.

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- SoundBridge DM Broadcast Template
-- Replace:
--   JUSTICE_UUID    → bd8a455d-a54d-45c5-968d-e4cf5e8d928e (admin)
--   BROADCAST_SLUG  → unique keyword for the LIKE guard (no apostrophes)
--   message_text    → the full message body
-- Note: apostrophes inside TEXT literals must be doubled: don''t  you''re  we''ll
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  sender_uuid  UUID := 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';
  message_text TEXT := 'YOUR MESSAGE HERE

Second paragraph here.

— The SoundBridge Team';

BEGIN
  INSERT INTO messages (sender_id, recipient_id, content, message_type, created_at)
  SELECT
    sender_uuid,
    p.id,
    message_text,
    'text',
    now()
  FROM profiles p
  WHERE p.id != sender_uuid
    -- Guard: don't re-send if this exact broadcast was already sent
    AND NOT EXISTS (
      SELECT 1
      FROM messages m
      WHERE m.sender_id  = sender_uuid
        AND m.recipient_id = p.id
        AND m.content LIKE 'BROADCAST_SLUG%'
    );

  RAISE NOTICE 'Broadcast complete. Rows inserted: %', (
    SELECT COUNT(*) FROM messages
    WHERE sender_id = sender_uuid
      AND content LIKE 'BROADCAST_SLUG%'
  );
END $$;
```

**Apostrophe escaping cheatsheet** — any contraction in the message text must use `''`:

| Write this in SQL | Renders as |
|---|---|
| `don''t` | don't |
| `won''t` | won't |
| `you''re` | you're |
| `we''ll` | we'll |
| `here''s` | here's |

---

## Step 2 — Push Notification (Node script)

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
node scripts/broadcast-push.js
```

Or with a `.env` file:

```bash
npx dotenv -e .env -- node scripts/broadcast-push.js
```

The script:
- Fetches all profiles with an `expo_push_token` (paginated, 1000/page)
- Sends to the Expo Push API in batches of 100
- Logs per-batch and final totals

To update the push title/body for a new broadcast, edit the `TITLE` and `BODY` constants at the top of `scripts/broadcast-push.js`.

---

## Step 3 — In-App Banner (optional, for action-required messages)

The in-app banner lives at `src/components/BroadcastBanner.tsx` and is mounted in `App.tsx`:

```tsx
{user && !needsOnboarding && <BroadcastBanner />}
```

**To issue a new banner broadcast:**

1. Bump `BROADCAST_ID` in `BroadcastBanner.tsx`:
   ```ts
   const BROADCAST_ID = 'broadcast_location_notifications_v2'; // ← increment version
   ```
2. Update `TITLE` and `BODY_SEGMENTS` with the new message.
3. Push an OTA update (`eas update --branch production --message "..."`)

Bumping the ID resets all users' dismissal records (it's a new AsyncStorage key), so the banner re-appears for everyone.

**Re-show logic:** if a user taps "Remind me in 7 days", the banner re-appears after 7 days **only if location permission is still not granted**. "Got it" dismisses permanently (for that `BROADCAST_ID`).

---

## Past Broadcasts

| ID | Date | Message summary |
|---|---|---|
| `broadcast_location_notifications_v1` | 2026-04-21 | Enable location + notifications — explains what users miss without them |
