# Web Team: `event_tickets.user_id` Column Missing

## Error
```
[bookedEventsCount] Query error: {"code":"42703","message":"column event_tickets.user_id does not exist"}
```

## Where it appears
`ProfileScreen.tsx` — when loading a user's booked event count.

Also affects:
- `AllEventsScreen.tsx` — filtering events the user has booked
- `EventTicketService.ts` — fetching a user's tickets for an event
- `CreatorRevenueService.ts` — ticket buyer analytics (uses `profiles!event_tickets_user_id_fkey`)

## What the mobile app expects
All queries assume `event_tickets.user_id` (UUID, FK → `auth.users.id`).

```sql
-- Mobile queries look like this:
SELECT event_id FROM event_tickets WHERE user_id = $1 AND status IN ('active', 'used');
```

## Fix Required
The `event_tickets` table is missing a `user_id` column (or it was created under a different name).

**Option A — Add the column if missing:**
```sql
ALTER TABLE event_tickets ADD COLUMN user_id UUID REFERENCES auth.users(id);
-- Then backfill from whatever column currently holds the buyer's user ID
UPDATE event_tickets SET user_id = <existing_buyer_column>;
-- Add index
CREATE INDEX idx_event_tickets_user_id ON event_tickets(user_id);
-- Add RLS
ALTER TABLE event_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tickets" ON event_tickets
  FOR SELECT USING (auth.uid() = user_id);
```

**Option B — If the column exists but has a different name (e.g. `purchaser_id`):**
Either rename it:
```sql
ALTER TABLE event_tickets RENAME COLUMN purchaser_id TO user_id;
```
Or let us know the actual column name so we can update the mobile code.

## Impact
- Profile screen: booked events count always shows 0
- Events screen: "going" filter shows no events
- Ticket purchase history: broken

## Priority
Medium — app doesn't crash but user-facing ticket data is missing.

---

## Web Team Resolution (Fixed)

### Root cause
`event_tickets` is the **ticket types catalog** (General Admission, VIP, etc.) — it has no `user_id` because it describes what's for sale, not who bought it.  
User purchases live in **`purchased_event_tickets`**, which has `user_id`, `event_id`, `status`, etc.

### Option A — Use new API endpoints (recommended)
Use these instead of querying Supabase directly:

| Endpoint | Returns |
|----------|---------|
| `GET /api/users/me/booked-events-count` | `{ "count": 5 }` — distinct events user has tickets for |
| `GET /api/users/me/booked-events` | `{ "items": [...], "total": 5 }` — events with details + ticket_quantity |

**ProfileScreen.tsx** — Replace `bookedEventsCount` query with:
```typescript
const res = await fetch('/api/users/me/booked-events-count');
const { count } = await res.json();
```

**AllEventsScreen.tsx** — For "going" filter, use:
```typescript
const res = await fetch('/api/users/me/booked-events');
const { items } = await res.json();
// items = events user has tickets for
```

### Option B — Use `purchased_event_tickets` directly
If you keep querying Supabase, use `purchased_event_tickets` instead of `event_tickets`:

```sql
SELECT event_id FROM purchased_event_tickets
WHERE user_id = $1 AND status IN ('active', 'used');
```

Column names: `user_id`, `event_id`, `status` (values: `active`, `used`, `refunded`, `cancelled`).
