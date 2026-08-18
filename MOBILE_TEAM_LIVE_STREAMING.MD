# Live Streaming — Mobile Team Task Doc

This is the mobile-side spec for SoundBridge's new Live Streaming feature. The
backend and web side are already built and deployed (soundbridge web repo,
commit `5067afb1`). **This repo (soundbridge-mobile-app) is yours — nothing
in the web repo needs touching, and nothing in this repo has been touched on
your behalf.** Everything the mobile app needs is exposed through the API
endpoints listed below.

You may also have received `LIVE_STREAMING.MD` (the original spec). Two
things in it are superseded — read this doc as the current source of truth:

1. It assumed an existing Cloudflare Stream integration already existed in
   the codebase to reuse. That assumption was wrong — there was no Cloudflare
   Stream integration anywhere (only Cloudflare R2, unrelated object
   storage). It's been built fresh, server-side, and is now live.
2. **Video live streaming is mobile-only.** The web app does not broadcast or
   play video at all — it only shows a "download the app" prompt and a
   read-only "LIVE" badge on profiles. Nothing about the video pipeline
   touches the web app beyond that.

Also important: SoundBridge already has a **separate, unrelated live-audio
feature** built on Agora (`live_sessions` table, `CreateLiveSessionScreen.tsx`,
`LiveSessionRoomScreen.tsx`, etc.). **Do not touch any of that.** This is a
new, separate video feature (`live_streams` table, new screens), living
alongside it.

---

## Step 1 — Compatibility spike (do this before writing any feature code)

**Primary choice: `@api.video/react-native-livestream`** for the RTMP
broadcast (camera + mic → RTMP). It's built by api.video, an established
video-infrastructure company, actively maintained, and targets any generic
RTMP endpoint (not locked to api.video's own service) — so it points at
Cloudflare Stream's RTMP ingest URL just fine.

**Fallback: `expo-live-stream`** (github.com/tugayoktayokay/expo-live-stream)
if the primary fails the spike. It's built specifically as an Expo Module
(HaishinKit 2.0 on iOS, RootEncoder on Android), which may integrate more
smoothly with this project's `expo-dev-client` + custom-config-plugin setup.

**Do this, in order:**

1. Install `@api.video/react-native-livestream`.
2. Wire up its camera-preview component on a throwaway test screen — don't
   build the real Go Live screen yet, just get its preview rendering.
3. **Build and run on both iOS and Android**, with the project's existing
   native dependencies untouched: `react-native-agora`, the FFmpegKit config
   plugin (`./plugins/withFFmpegKit`), the track-player fix
   (`./plugins/withTrackPlayerFix`), and `kotlinVersion` pinned at `2.1.20` in
   `app.json`. This is the real test — native module conflicts (duplicate
   symbols, Kotlin/Gradle version clashes) are the actual risk here, not
   whether the JS API looks reasonable.
4. Confirm: does it build clean on both platforms? Does the camera preview
   actually render? Any Gradle or Xcode errors, especially anything
   Kotlin-version or duplicate-native-symbol related?
5. **Report back before proceeding either way** — success or failure. If it
   builds clean, move to Step 2. If it fails and can't be resolved quickly,
   uninstall it, install `expo-live-stream` instead, repeat steps 2–4 with
   that library, and report that result too.

Don't build the full Go Live screen, RTMP publish logic, or anything past the
camera preview until the spike result has been reported and Step 2 is
green-lit.

---

## Step 2 — Full feature (after the spike passes)

### Access control

Before showing any "Go Live" entry point, call the eligibility check.
Eligible = 50+ followers OR the account is tagged with any partner
institution (same mechanism as Sound Academy / Abbey Road Institute / Logic
Church — you don't need to know which partners exist, the backend already
handles this generically).

If ineligible, show the `message` the endpoint returns in an `Alert.alert`,
following the same two-button "Upgrade Required" pattern already used
elsewhere in `UploadScreen.tsx` (e.g. the Albums gate) — except here there's
no upgrade path, so a single "OK" / dismiss button is enough, not a
Cancel/Upgrade pair.

### Going live

1. Creator taps Go Live, optionally enters a title.
2. Request camera + microphone permissions (the RTMP library you land on
   handles most of this — confirm during the spike).
3. `POST /api/live-streams/start` with `{ title }` (title optional).
4. Response gives you `rtmpUrl`, `streamKey`, `hlsPlaybackUrl`, `liveStreamId`.
   Feed `rtmpUrl` + `streamKey` into the RTMP library's publish call.
5. Show the creator they're live. A push notification to all their followers
   is already sent automatically server-side — you don't need to trigger
   anything for that.

### Duration limit (server-enforced — don't build your own timer for this)

The 3-hour cutoff and the 2h45m warning are both enforced by a server cron,
not a client timer, per the original spec's requirement. What you *do* need:

- Handle the push notification with `data.type === 'live_stream_ending_soon'`
  — if the app is foregrounded on the live screen when it arrives, show an
  in-app "15 minutes left" banner too (the push notification itself already
  reaches the user even if the app is backgrounded).
- Detect when the stream has actually ended (forced cutoff, or the creator
  ending it from another device) by checking `live_streams.status` — either
  poll `GET /api/live-streams/active?userId=<self>` periodically while live,
  or subscribe to the row via Supabase Realtime (see the viewer section
  below for the exact subscription pattern — same idea, just watching your
  own stream's row). When status flips away from `'active'`, stop the local
  broadcast and show the ended state.

### Ending manually

`POST /api/live-streams/{liveStreamId}/end` — no body needed. This is also
what should fire if the creator backgrounds/kills the app while live, if you
can hook a cleanup call into that (best-effort; the 3hr cron is the ultimate
backstop if this never fires).

### Reconnecting mid-stream

If the app was killed and reopened while a stream is still `active` (check
via `/api/live-streams/active?userId=<self>`), re-fetch fresh credentials
rather than assuming you remember them from before:

`GET /api/live-streams/{liveStreamId}/credentials` → `{ rtmpUrl, streamKey, hlsPlaybackUrl }`

### Viewer screen (watching someone else's stream)

1. `GET /api/live-streams/active?userId=<creatorId>` → if `live: true`, you
   get `liveStreamId`, `hlsPlaybackUrl`, `viewerCount`, `title`, `startedAt`.
2. Play `hlsPlaybackUrl` with **`expo-av`'s `Video` component — already
   installed in this project (`expo-av` v16.0.7, used in 7 other files). Do
   not add `expo-video` or any other playback library** — `expo-av` already
   handles HLS `.m3u8` playback natively.
3. On mount: `POST /api/live-streams/{liveStreamId}/viewer` (registers as a
   viewer, increments the count).
4. On unmount (leaving the screen): `DELETE /api/live-streams/{liveStreamId}/viewer`
   (decrements the count). Do this in your cleanup/unmount handler — a
   viewer who force-quits without triggering it will just leave the count
   slightly high until the stream ends; it's a display count, not anything
   financial, so this is an acceptable edge case, not something to
   over-engineer.
5. Real-time viewer count — subscribe to the row via Supabase Realtime:

```js
const channel = supabase
  .channel(`live-stream-${liveStreamId}`)
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${liveStreamId}` },
    (payload) => {
      setViewerCount(payload.new.viewer_count);
      if (payload.new.status !== 'active') {
        // stream ended — stop playback, show ended state
      }
    }
  )
  .subscribe();

// on unmount:
supabase.removeChannel(channel);
```

### Tipping during a live stream

Reuse whatever tip-sending call the app already makes for regular tips — no
new tip infrastructure. Just include one additional field in the request
body: `liveStreamId: <the current live stream's id>`. The backend validates
it belongs to the creator being tipped and is currently active; if not, it
silently tips without the live-stream tag rather than failing the tip
outright, so this is safe to always include while on a live/viewer screen.

### Live indicator on profile screens

Same `GET /api/live-streams/active?userId=<theirId>` call, on both your own
profile screen and when viewing another creator's profile. If `live: true`,
show a red "LIVE" pill (this already exists identically on the web profile
page, for visual consistency — small red pill, white pulsing dot, "LIVE"
text).

### Push notifications

Nothing new to build on the sending side — all of this is already automatic
server-side, using the same Expo push token your app already registers to
`profiles.expo_push_token`:

| `data.type` | When it fires | Suggested handling |
|---|---|---|
| `live_stream` | A followed creator just went live | Tap → deep link to their live stream (`data.url` is `soundbridge://live/<liveStreamId>`) |
| `live_stream_ending_soon` | 2h45m into the creator's own stream | If foregrounded on the live screen, also show an in-app banner |
| `live_stream_disconnected` | Cloudflare detects an RTMP disconnect | Tell the creator to reconnect, or it'll end automatically |
| `live_stream_ended` | Stream ended (any reason) | Summary: duration + tips received, sent to the creator only |

---

## API reference

All routes are on the existing web API host, authenticated the same way
every other endpoint you already call is (Bearer token from the Supabase
session).

| Method | Path | Purpose | Request body | Key response fields |
|---|---|---|---|---|
| GET | `/api/live-streams/eligibility` | Check before showing Go Live | — | `eligible`, `reason`, `followerCount`, `message` |
| POST | `/api/live-streams/start` | Start a stream | `{ title? }` | `liveStreamId`, `rtmpUrl`, `streamKey`, `hlsPlaybackUrl` |
| POST | `/api/live-streams/{id}/end` | End your own stream | — | `success` |
| GET | `/api/live-streams/{id}/credentials` | Re-fetch RTMP creds (owner only) | — | `rtmpUrl`, `streamKey`, `hlsPlaybackUrl` |
| GET | `/api/live-streams/active?userId=` | Is this creator live right now? | — | `live`, `liveStreamId`, `hlsPlaybackUrl`, `viewerCount`, `title`, `startedAt` |
| POST / DELETE | `/api/live-streams/{id}/viewer` | Join / leave as a viewer | — | `success` |

Error responses are always `{ error: "<friendly message>" }` — on any
unexpected backend failure the message is exactly: *"We are currently
running some improvements to our live feature. Please bear with us and try
again shortly."* Never show raw errors, status codes, or JSON to the user —
show `error` as-is, it's already written to be user-facing.

## `live_streams` table (for reference / the Realtime subscription only —
## everything else should go through the API above, not direct table reads)

```
id                        uuid
user_id                   uuid  (creator)
cloudflare_stream_id      text
status                    text  ('active' | 'ended' | 'failed')
started_at                timestamptz
ended_at                  timestamptz | null
title                     text | null
viewer_count              integer
created_at                timestamptz
```

RLS: creators can read/write their own rows; any authenticated user can read
rows where `status = 'active'` (needed for the Realtime subscription above).

---

Questions or spike results go back through Justice — reply with build
success/failure for Step 1 before starting Step 2.
