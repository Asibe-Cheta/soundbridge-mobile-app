# Live Track Comments + Share as Post — Implementation Plan

**Status:** Ready for development
**Priority:** Post-core-launch (Month 2–3)
**Scope:** Mobile first (iOS + Android via React Native), web to follow
**Affects:** `AudioPlayerScreen`, feed, comments system, post creation

---

## Feature 1: Live Sliding Comments on the Music Player

### What it is
While a track is playing, real-time comments from listeners scroll upward over the player UI — Bilibili/NicoNico-style floating comments. Comments are translucent and non-blocking. Album art, controls, and waveform remain fully accessible underneath.

### User Experience

- Comments drift upward from the bottom of the player at a gentle, consistent pace
- Each comment renders as a small pill: tiny avatar (20px), username, comment text
- Styling: no solid background card — text with subtle shadow only (`textShadow: '0px 1px 3px rgba(0,0,0,0.6)'`), container background `rgba(0,0,0,0.08)`
- Comments stagger horizontally (randomised `left` offset: 8–65% of screen width) to prevent column stacking
- Comments fade out using opacity animation before disappearing off the top — not a hard cut
- A small comment input nudge sits above the controls row (36px tall, placeholder "Add a comment…"). Tapping it slides the keyboard up with a full input and send button
- A toggle icon (top-right of player, `chat-bubble-outline`) shows/hides the comment stream. Shows a live count badge when active
- Maximum 3 comments visible simultaneously. New comments queue and enter from the bottom as older ones clear

### Decisions on Open Questions (resolved)

**Moderation:** Each floating comment gets a long-press context menu with a single "Report" option. Reported comments are hidden immediately client-side for the reporter and flagged in the admin panel. No pre-moderation for v1 — post-report review only. Add rate limiting (see below) to prevent abuse.

**Anonymous listeners:** Comments are visible to all users including logged-out guests. Posting requires a logged-in account. Show a "Sign in to comment" nudge to guests who tap the input.

**Rate limiting:** Each user is capped at 1 comment per 10 seconds per track. Enforced both client-side (disable send button for 10 seconds after posting) and server-side (DB constraint or API middleware). Prevents stream flooding.

**timestamp_ms sync:** Ship v1 without playback-position-synced comments. Flag for v2 — would give a SoundCloud-style waveform comment experience. The DB column is included now so no migration is needed later.

### Data Model

```sql
create table track_comments (
  id            uuid primary key default gen_random_uuid(),
  track_id      uuid references tracks(id) on delete cascade,
  user_id       uuid references profiles(id) on delete cascade,
  content       text not null check (char_length(content) <= 100),
  timestamp_ms  integer,        -- v2: playback position when comment was posted
  is_reported   boolean default false,
  created_at    timestamptz default now()
);

-- Indexes
create index on track_comments (track_id, created_at desc);
create index on track_comments (user_id);

-- RLS
-- SELECT: public (all users including anonymous)
-- INSERT: authenticated users only
-- UPDATE/DELETE: user's own comments only
```

### Real-Time Delivery

- Subscribe to Supabase Realtime on `track_comments` filtered by `track_id = currentTrackId`
- On `INSERT` event → push comment into the float queue
- Queue drains at a controlled rate: new comment enters from bottom every ~1.5 seconds maximum regardless of how fast they arrive (prevents overwhelming the screen during busy moments)
- On unmount or track change → unsubscribe channel, clear animation refs, flush queue
- On initial player open → fetch last 20 comments via `GET /api/tracks/:id/comments?limit=20` to pre-seed the queue before Realtime kicks in. Stagger their entry with 800ms delay between each so they don't all flood in at once on load

### Animation Approach

```tsx
// Per-comment animation
const translateY = useRef(new Animated.Value(0)).current;
const opacity = useRef(new Animated.Value(1)).current;

// Start animation on mount
Animated.parallel([
  Animated.timing(translateY, {
    toValue: -(screenHeight * 0.75),  // float 75% up the screen
    duration: randomBetween(7000, 10000),
    useNativeDriver: true,
  }),
  Animated.sequence([
    Animated.delay(randomBetween(5000, 7000)),  // stay visible most of the journey
    Animated.timing(opacity, {
      toValue: 0,
      duration: 1500,  // gentle fade out at the top
      useNativeDriver: true,
    }),
  ]),
]).start(() => onCommentComplete(id));  // callback removes from active array
```

- Comments rendered in an `AbsoluteView` positioned above album art, below controls overlay (zIndex: 10)
- `useRef` array tracks active comment animations — cleaned up via `onCommentComplete` callback
- Max 3 concurrent animated components in the tree at once to protect performance

### Backend Requirements (web team)

1. Create `track_comments` table with RLS as defined above
2. Enable Supabase Realtime on `track_comments`
3. `POST /api/tracks/:id/comments` — insert comment (auth required, rate limit: 1 per 10s per user per track)
4. `GET /api/tracks/:id/comments?limit=20` — fetch most recent comments ordered by `created_at desc`
5. `POST /api/tracks/:id/comments/:commentId/report` — flag a comment (`is_reported = true`)

---

## Feature 2: Share Track as Post

### What it is
Any user listening to a track can instantly share it as a post to the SoundBridge feed — with the album art as the post image and a deep link others can tap to open the same track in their player.

### User Experience

- A small pill button sits just above the progress bar: `↑ Share to Feed`
- Tapping it opens a compact bottom sheet (not full-screen):
  - Preview card: album art thumbnail + track title + artist name
  - Optional caption input (placeholder: "What do you think of this track?")
  - Primary "Post" button (gradient) + "Cancel" text link
- On post: sheet dismisses, brief toast appears ("Shared to your feed ✓"), post is live immediately
- The posted content is visible to the poster's followers in their feed

### Post Data Structure

```ts
{
  type: "track_share",
  user_id: string,           // poster's profile ID
  content: string,           // caption (may be empty string)
  media_url: string,         // track's cover_image_url used as post image
  track_id: string,          // for deep link resolution
  track_title: string,       // denormalised for feed rendering without extra joins
  track_artist: string,      // denormalised
  deep_link: string,         // "soundbridge://track/<track_id>"
}
```

### Feed Post Card Rendering

- `PostCard` renders `track_share` type with:
  - Album art as the card image with a "🎵 Now Playing" badge overlay (top-left of image)
  - Caption text below (if present)
  - "Listen on SoundBridge" CTA button at the bottom of the card (opens player via deep link)
- Tapping anywhere on the card also triggers the deep link

### Deep Link

Uses existing `soundbridge://track/<track_id>` handler in `DeepLinkingService.ts`.
Confirm this routes to `AudioPlayerScreen` with the correct track loaded — if it currently routes to `TrackDetails` instead, update the handler to open the player directly.

### Backend Requirements (web team)

1. `POST /api/posts` to accept `type: "track_share"` with `track_id`, `track_title`, `track_artist` fields
2. Feed query to return `track_share` posts — ensure `track_id` join returns title, artist, cover for feed rendering
3. `PostCard` on web to render the `track_share` variant with the "Listen" CTA

### Mobile (v1 — no new endpoint needed)

Pre-populate the existing `createPost` call from the current track context in `AudioPlayerScreen`. No new mobile endpoint required for v1 — just pass the additional fields through the existing post creation service.

---

## Files to Touch

| File | Change |
|---|---|
| `src/screens/AudioPlayerScreen.tsx` | Mount `LiveCommentOverlay`, mount `ShareAsPostSheet`, wire up toggle state |
| `src/components/LiveCommentOverlay.tsx` | **New** — floating comment stream, Realtime subscription, animation logic, toggle visibility, guest nudge |
| `src/components/ShareAsPostSheet.tsx` | **New** — bottom sheet, caption input, post CTA, toast on success |
| `src/services/realtime/realtimeService.ts` | Add `subscribeToTrackComments(trackId, callback)` and `unsubscribeFromTrackComments(trackId)` |
| `src/components/PostCard.tsx` | Handle `track_share` post type variant with album art, badge, and CTA button |
| `src/services/api/feedService.ts` | Ensure `createPost` accepts `track_id`, `track_title`, `track_artist`, `type` fields |
| `src/services/api/trackService.ts` | Add `getTrackComments(trackId)` and `postTrackComment(trackId, content)` |

---

## Implementation Order

1. **Share as Post** — simpler, no new backend table, self-contained. Delivers visible value quickly and drives feed activity.
2. **Backend: track_comments table + Realtime** — web team creates table, enables Realtime, builds API endpoints.
3. **LiveCommentOverlay** — animation system, Realtime subscription, queue logic.
4. **Comment input + rate limiting** — posting from the player, 10s cooldown, guest nudge.
5. **PostCard track_share variant** — so shared tracks render correctly in the feed on both mobile and web.

---

## Performance Notes

- Cap active animated comment components at 3 in the React tree at any time. Queue overflow is held in a JS array, not rendered. This protects frame rate on mid-range Android devices.
- Unsubscribe from Realtime channel immediately when player is minimised or track changes. Do not keep a dead subscription open.
- Pre-seeded comments (the initial 20 on load) should be staggered on entry — do not animate all 20 simultaneously.
- Comment animations use `useNativeDriver: true` throughout — no JS-thread layout work during animation.

---

## v2 Flags (do not build now, capture for later)

- **Playback-position-synced comments** — `timestamp_ms` column is already in the schema. v2 shows comments at the exact point in the track they were written (SoundCloud waveform style).
- **Reaction floats** — allow emoji reactions (❤️ 🔥 🙌) as a faster alternative to typed comments, rendered as large floating emoji.
- **Comment history drawer** — a scrollable panel (swipe up from the comment toggle) showing all comments on the track in chronological order, not just the live float stream.
- **Web player parity** — replicate the floating comment experience on the web player after mobile is stable.