# WEB TEAM: Online Presence (Online Status Indicator)

**From:** Mobile team  
**Date:** 2026-04-08  
**Priority:** Medium — mobile is live with this, web should match

---

## Context

We've implemented real-time online presence on mobile using **Supabase Realtime Presence**. No DB schema changes were needed — Supabase handles the in-memory presence state entirely over WebSocket. Users see a green dot on other users in the Messages search results when they're online.

The privacy setting "Show Online Status" controls whether a user broadcasts their presence. If disabled, they appear offline to everyone even if they have the app open.

---

## How It Works (Mobile Implementation)

### Joining presence

When the app opens (or comes to foreground), we join a Supabase Realtime channel:

```typescript
const channel = supabase.channel('global_presence', {
  config: { presence: { key: userId } },
});

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    // Object.keys(state) = array of online user IDs
  })
  .on('presence', { event: 'join' }, ({ key }) => {
    // key = user ID that just came online
  })
  .on('presence', { event: 'leave' }, ({ key }) => {
    // key = user ID that just went offline
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED' && showOnlineStatus) {
      await channel.track({ user_id: userId, online_at: new Date().toISOString() });
    }
  });
```

- The **presence key** is the user's UUID — `Object.keys(presenceState())` gives you the full list of online user IDs
- `channel.track()` broadcasts "I'm online" to all subscribers
- `channel.untrack()` + `supabase.removeChannel()` when the user backgrounds the app or logs out

### Privacy toggle

Before calling `channel.track()`, we check if the user has "Show Online Status" enabled. If not, we subscribe to the channel (to see others) but do **not** call `track()` — so we're invisible to everyone else.

### Leaving presence

Supabase automatically removes a user from the presence state when their WebSocket connection drops (app closed, tab closed, network lost). For a clean explicit leave, call:

```typescript
await channel.untrack();
await supabase.removeChannel(channel);
```

---

## What We Need From You

### 1 — Implement presence on the web app

On the web (`soundbridge.live`), do the same:

```typescript
// On page load / user authenticated
const channel = supabase.channel('global_presence', {
  config: { presence: { key: session.user.id } },
});

channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED' && userShowsOnlineStatus) {
    await channel.track({
      user_id: session.user.id,
      online_at: new Date().toISOString(),
    });
  }
});

// On page unload / logout
await channel.untrack();
await supabase.removeChannel(channel);
```

Use a single shared channel instance for the whole app (not per-page). The channel name **must be `'global_presence'`** — this is what mobile subscribes to. If you use a different name, web and mobile users will be invisible to each other.

### 2 — Show the green dot on user profiles and messages

Wherever you show a user's avatar with an online indicator, check if their ID is in the presence state:

```typescript
const state = channel.presenceState();
const onlineUserIds = new Set(Object.keys(state));

const isOnline = onlineUserIds.has(targetUserId);
```

Show a green dot (`#4CAF50`) if online, grey (`#666`) if offline.

Places to add this on web:
- Messages / inbox — conversation list and user search results
- User profile pages (viewed by others)
- Any directory or search results showing users

### 3 — Respect the "Show Online Status" privacy setting

When the user has "Show Online Status" turned off in Privacy & Security settings, skip calling `channel.track()`. They should still subscribe (so they can see others' status), but not broadcast their own.

The setting is stored in the `profiles` table — we need you to add the column if not already there:

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_online_status BOOLEAN DEFAULT true;
```

On mobile we currently store this in AsyncStorage as a temporary measure since the column doesn't exist in the DB yet. Once you add the column, we'll switch mobile to read from Supabase directly too — just let us know when it's done.

### 4 — `last_seen` column for persistent "Last seen" timestamps

Currently, mobile shows "Last seen X ago" only if we observed the user going offline during the current app session (via the Realtime `leave` event). If the app is freshly opened and someone is offline, we have no "last seen" timestamp to show.

To fix this permanently, please add a `last_seen` column to `profiles`:

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
```

And update it server-side (via a Supabase Edge Function or DB trigger) whenever a user's presence leaves the `global_presence` channel. Supabase supports presence webhooks or you can use a Realtime-triggered Edge Function:

```typescript
// Edge Function: called when presence leaves
// Update profiles.last_seen = now() for the departing user
await supabase
  .from('profiles')
  .update({ last_seen: new Date().toISOString() })
  .eq('id', departingUserId);
```

Once this column exists, mobile will read it when opening a chat and show:
- **"Online"** (green) — user is currently in the presence channel
- **"Last seen 5m ago"** — from `profiles.last_seen`
- **"@username"** — fallback if neither is available

---

## Important Notes

- **Channel name must match:** `'global_presence'` — both web and mobile use the same channel so presence is shared across platforms
- **No DB table needed** — Supabase Realtime Presence is entirely in-memory, managed by Supabase infrastructure
- **Automatic cleanup** — Supabase removes users from presence when their connection drops, so there's no risk of stale "online" states
- **Scale** — Supabase Realtime Presence handles thousands of concurrent connections; no backend code needed on your side beyond the client-side subscription

---

## Summary

| Task | Owner | Notes |
|---|---|---|
| Subscribe to `global_presence` channel on web | Web team | Must use exact channel name |
| Call `channel.track()` on login (if privacy allows) | Web team | Skip if `show_online_status = false` |
| Show green dot on web UI | Web team | Check `presenceState()` keys |
| Add `show_online_status` column to `profiles` | Web team (DB) | `BOOLEAN DEFAULT true` — unblocks mobile too |
| Untrack on logout / tab close | Web team | `channel.untrack()` + `removeChannel()` |

— Mobile team
