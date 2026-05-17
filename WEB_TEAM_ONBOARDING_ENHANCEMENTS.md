# Onboarding Enhancements — Web Implementation Guide

This document describes changes made to the mobile onboarding flow that the web team must mirror. The goal is a consistent, personalised onboarding experience across both platforms.

---

## 1. New User Type: Event Organiser

### Add to your user type enum / database

```
event_organiser
```

Existing values: `music_creator`, `podcast_creator`, `industry_professional`, `music_lover`

### Save to profile

When a user selects their type, save `onboarding_user_type = 'event_organiser'` to the `profiles` table. This value is used by the first action prompt after onboarding (see section 5).

### UI card

| Field | Value |
|-------|-------|
| Icon | Calendar / Ticket |
| Colour | Amber — `#F59E0B` |
| Label | "Event Organiser" |
| Description | "Promote events, sell tickets, grow your audience." |

### Step sequence for event organiser path

```
userType → profileSetup → eventTypes → [followSuggestions] → location → valueDemo → tierSelection → firstPost → Home
```

### Step: `eventOrganiser_eventTypes`

Multi-select chips. Save selections to profile (e.g. as `preferred_event_types` JSON array).

| ID | Label |
|----|-------|
| `concerts` | Concerts & Live Music 🎸 |
| `club_nights` | Club Nights & DJ Sets 🎧 |
| `workshops` | Workshops & Masterclasses 📚 |
| `conferences` | Conferences & Talks 🎤 |
| `comedy` | Comedy Shows 😂 |
| `open_mic` | Open Mic Nights 🎙️ |
| `film` | Film Screenings 🎬 |
| `fitness` | Fitness & Wellness 🧘 |
| `art_culture` | Art & Culture 🎨 |
| `networking` | Networking Events 🤝 |

Minimum 1 selection required to continue.

### Step: `eventOrganiser_location` (reach)

Single-select. Save as `event_reach` on the profile.

| ID | Label |
|----|-------|
| `local` | Mostly local (my city/area) |
| `regional` | Regional (multiple cities) |
| `national` | National |
| `international` | International / Online |

### Step: `eventOrganiser_valueDemo`

Static content — no API needed. Headline: *"Organisers like you are thriving here"*. Show 4 value props:
- Sell tickets directly — no middlemen
- Reach audiences in your city and beyond
- Track RSVPs, sales, and reach in one dashboard
- Promote to genre-matched music lovers

---

## 2. Follow Suggestions Step

### Where it fits in each path

| Path | Inserted after | Routes forward to |
|------|---------------|------------------|
| Music Creator | `genres` | `role` |
| Podcast Creator | `categories` | `role` |
| Industry Professional | `genres` | `goals` |
| Music Lover | `genres` | `events` |
| Event Organiser | `eventTypes` | `location` |

### Logic

1. After genre/category/eventType selection is saved, query `profiles` for creators whose genres overlap with the user's selections:

```sql
SELECT p.id, p.display_name, p.username, p.avatar_url, p.location, p.followers_count
FROM profiles p
INNER JOIN user_genres ug ON ug.user_id = p.id
WHERE ug.genre_id = ANY($1)          -- array of selected genre IDs
  AND p.id != $2                      -- exclude current user
GROUP BY p.id
ORDER BY p.followers_count DESC
LIMIT 10;
```

2. **If result count < 3: skip this step entirely.** Do not show the page — navigate directly to the next step.
3. If result count ≥ 3: show the step.

### UI

- 2-column grid of creator cards
- Each card: avatar, display name, location, follow button (toggle)
- "Follow All" shortcut at the top right
- "Continue" CTA at the bottom — works even with zero follows (following is encouraged, not forced)
- Back button returns to the genre/category step

### API

Use your existing follow endpoint. On this step, following is optional — the user can continue without following anyone.

---

## 3. Compulsory First Post Step

### Where it fits

This is the **final step** of onboarding for all paths, after tier selection. It replaces the previous "Welcome, you're done!" screen as the completion moment.

### There is no skip button.

### Pre-filled templates per user type

The text is pre-filled but fully editable. Variables in brackets are substituted from earlier step selections. If a variable is unavailable, omit the bracketed section gracefully.

| User Type | Template |
|-----------|----------|
| `music_creator` | "Just joined SoundBridge! I make [genre1 & genre2] music and I'm here to share my sound with the world. Follow along 🎵" |
| `podcast_creator` | "Just joined SoundBridge! I create [category1 & category2] podcasts and I'm excited to build my audience here. Follow along 🎙" |
| `industry_professional` | "Just joined SoundBridge! I'm a [role name] looking to connect with talented creators. Let's collaborate. 🤝" |
| `music_lover` | "Just joined SoundBridge! Here to discover great music and support the artists behind it. 🎧" |
| `event_organiser` | "Just joined SoundBridge! I organise [eventType1 & eventType2] and I'm here to reach new audiences. Follow me for upcoming events. 🎟" |

- Character limit: 280
- Photo attachment: optional (single image, shown as preview in the card before publishing)

### UI

- Render the post as a live preview card (avatar + name + editable text + photo preview) so it feels like the real feed
- CTA: **"Publish & Enter SoundBridge 🎉"**
- Back button: returns to tier selection

### On publish

1. Create the post via your post creation API (`POST /api/posts` with `content` and optional `image`)
2. Mark `onboarding_completed = true` on the profile
3. Redirect to the home/feed page

### If publish fails (network error etc.)

Do **not** block the user — complete onboarding anyway and retry the post silently in the background (or queue it). The user should never be stuck on this screen due to a post failure.

---

## 4. Tier Selection — Softened

### Changes

| Before | After |
|--------|-------|
| "You're All Set! 🎉" | "One last thing 🎉" |
| "Choose how you want to start your creative journey" | "Start free — upgrade anytime from your profile" |
| Free tier CTA: "Start Free" | Free tier CTA: "Start for Free →" |
| (nothing) | Add below free tier CTA: "No card required • Upgrade anytime" (small secondary text) |

The free tier card must **not** appear visually diminished compared to paid tiers (no reduced size, no greyed-out treatment). It is a legitimate and primary option.

---

## 5. Post-Onboarding First Action Prompt

### What it is

A bottom sheet modal shown **once** on the user's first visit to the home/feed page after completing onboarding. It is **not** part of the onboarding flow itself.

### Trigger

- On first page load after `onboarding_completed` becomes `true`
- Gate with a flag stored in localStorage/cookie: `first_action_prompt_shown_{userId}`
- Once dismissed (either via CTA or "Maybe later"), set the flag and never show again
- Short delay before showing (≈800ms) so the feed renders first

### Content per user type

| `onboarding_user_type` | Title | CTA | Destination |
|------------------------|-------|-----|-------------|
| `music_creator` | "Upload your first track" | "Upload Now" | Upload page |
| `podcast_creator` | "Upload your first episode" | "Upload Now" | Upload page |
| `industry_professional` | "Complete your profile" | "Add your skills & experience" | Profile edit |
| `music_lover` | (do not show the modal) | — | — |
| `event_organiser` | "Create your first event" | "Create Event" | Create Event page |

### Bullet points (show 3 per type)

**music_creator / podcast_creator:**
- Get discovered by listeners in your genre
- Earn tips from fans who love your music
- Build your catalogue from day one

**industry_professional:**
- Let creators know your specialisms
- Be found by artists looking for your skills
- Start receiving collaboration requests

**event_organiser:**
- Sell tickets directly to your audience
- Reach local listeners who match your event type
- Track RSVPs and revenue in one place

### UI

- Bottom sheet (not a full-page takeover)
- Large icon in the relevant accent colour
- Title, 3 bullet points with green checkmarks
- Primary gradient CTA button
- Plain "Maybe later" text link below — no button styling

---

## 6. Profile Schema Changes Required

Ensure the `profiles` table (or equivalent) can store:

| Column | Type | Notes |
|--------|------|-------|
| `onboarding_user_type` | `varchar` | Already exists for other types — add `'event_organiser'` to accepted values |
| `preferred_event_types` | `jsonb` / `text[]` | New — array of event organiser type IDs |
| `event_reach` | `varchar` | New — one of: `local`, `regional`, `national`, `international` |

---

## 7. Step Sequences Summary (all paths)

```
Music Creator:
  userType → profileSetup → genres → [followSuggestions] → role → events → valueDemo → tierSelection → firstPost → Home + prompt

Podcast Creator:
  userType → profileSetup → categories → [followSuggestions] → role → events → valueDemo → tierSelection → firstPost → Home + prompt

Industry Professional:
  userType → profileSetup → role → genres → [followSuggestions] → goals → valueDemo → tierSelection → firstPost → Home + prompt

Music Lover:
  userType → profileSetup → genres → [followSuggestions] → events → valueDemo → tierSelection → firstPost → Home (no prompt)

Event Organiser (NEW):
  userType → profileSetup → eventTypes → [followSuggestions] → location → valueDemo → tierSelection → firstPost → Home + prompt
```

`[followSuggestions]` = skipped silently if genre-matched creator count < 3.

---

**Priority:** High — mobile ships this in the next build. Web should align before new user acquisition campaigns go live.
