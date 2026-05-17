# Web Team — Chat Messages: Schema Gaps & Required Backend Fixes

**Date:** 2026-04-23  
**Raised by:** Mobile team  
**Priority:** High

---

## Overview

Four chat features were added to the mobile app that required DB changes which do not yet exist. Mobile workarounds are live using content-encoding (JSON shape detection), but these are fragile long-term and should be replaced with proper schema columns and enum values.

---

## Issue 1 — `message_type` enum missing `reply` and `forwarded` values

### What broke

Sending a reply or forwarded message failed with:

```
invalid input value for enum message_type: "reply"
invalid input value for enum message_type: "forwarded"
```

The `messages.message_type` column is a Postgres enum. The valid values appear to be only `text` and `system`. Neither `reply` nor `forwarded` were added to the enum.

### Required backend fix

```sql
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'reply';
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'forwarded';
```

### Current mobile workaround

Both reply and forwarded messages are sent with `message_type = 'text'`. The mobile app encodes the metadata inside the `content` field as JSON and detects message sub-type by parsing the JSON shape:

- **Reply**: `content = JSON.stringify({ replyTo: { content, senderName }, text })`  
  Detected by: `parsed.replyTo && parsed.text`

- **Forwarded**: `content = JSON.stringify({ forwarded: true, text })`  
  Detected by: `parsed.forwarded === true`

Once the enum values are added, the mobile app can be updated to use the proper `message_type` values and simplify the content back to plain text for forwarded messages.

---

## Issue 2 — No `is_deleted` / `deleted_at` column for "Delete for everyone"

### What is needed

When a sender deletes a message for everyone, both sides should see *"This message was deleted."* The message row must remain in the DB (for chat history integrity / audit) but its content should be hidden. This requires a flag column — not actually deleting the row.

### Required backend fix

```sql
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
```

Update the RLS policy to allow the sender to set `deleted_for_everyone = true` on their own messages:

```sql
-- Allow sender to soft-delete their own messages
CREATE POLICY "sender can soft-delete own messages"
ON messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);
```

The `get_conversation_messages` query (or equivalent) should return all rows but the mobile/web renders deleted ones as *"This message was deleted."* based on the `deleted_for_everyone` flag.

### Current mobile workaround

The mobile app performs an UPDATE on the `messages` row, replacing the `content` with a JSON marker:

```typescript
content = JSON.stringify({ _sb_deleted: true })
```

Detected on render by: `JSON.parse(content)?._sb_deleted === true`

Renders as: *"This message was deleted."* (italic, dimmed)

**Risk:** If RLS does not allow the sender to UPDATE their own messages, this silently fails (optimistic UI reverts with an error alert). Needs the UPDATE RLS policy above.

---

## Issue 3 — No `edited_at` / `is_edited` column for "Edit message"

### What is needed

When a sender edits a sent message, the new content should be saved and an *(edited)* label should appear. Requires tracking both the new content and when it was edited.

### Required backend fix

```sql
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
```

Update RLS to allow senders to update their own messages:

```sql
-- (same UPDATE policy as above covers this if not already added)
CREATE POLICY "sender can edit own messages"
ON messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);
```

When the sender edits, the backend (or mobile direct Supabase call) should:

```sql
UPDATE messages
SET content = $new_content, is_edited = true, edited_at = now()
WHERE id = $id AND sender_id = auth.uid();
```

### Current mobile workaround

The mobile app updates `content` to:

```typescript
content = JSON.stringify({ _sb_edited: true, text: newContent })
```

Detected on render by: `parsed._sb_edited === true && typeof parsed.text === 'string'`

Displays the *(edited)* label below the message bubble.

**Risk:** Same RLS risk as above — if UPDATE is not permitted, the edit silently fails.

---

## Issue 4 — No RLS UPDATE policy on `messages` table (suspected)

### What broke / may break

Both "Delete for everyone" and "Edit message" require `UPDATE` on the `messages` table from the sender. If no UPDATE RLS policy exists, these silently fail. The mobile app surfaces the Supabase error in an alert if it occurs.

### Required backend fix

Ensure this policy exists (or equivalent):

```sql
CREATE POLICY "sender can update own messages"
ON messages FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);
```

---

## Summary of required SQL

```sql
-- 1. Extend message_type enum
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'reply';
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'forwarded';

-- 2. Add soft-delete and edit tracking columns
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- 3. Add UPDATE RLS policy for senders
CREATE POLICY "sender can update own messages"
ON messages FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);
```

---

## Migration path (once backend fixes are deployed)

Once the above SQL is applied, the mobile app can be updated to:

1. Use `message_type: 'reply'` and `message_type: 'forwarded'` — removing the JSON content encoding workaround
2. Use `deleted_for_everyone = true` instead of the `_sb_deleted` JSON marker
3. Use `is_edited = true, edited_at = now()` instead of the `_sb_edited` JSON marker
4. Read `deleted_for_everyone` and `is_edited` from the DB response to correctly render state for messages received from others (currently the mobile only detects its own encoded content — messages deleted/edited on another device won't reflect until a proper column is queried)

---

*All four workarounds are live on production. The backend fixes will make these features reliable across all clients (web + mobile) and remove the fragile JSON-shape detection.*
