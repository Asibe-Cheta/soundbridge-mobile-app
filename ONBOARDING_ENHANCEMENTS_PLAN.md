# Onboarding Enhancements — Implementation Plan

## Overview

Four changes to the existing onboarding flow:
1. Add **Event Organiser** as a new user type with its own path
2. Add a **"Follow Creators"** step after genre/category selection (genre-matched only, skipped if < 3 results)
3. Add a **compulsory first post** step at the end of onboarding (pre-filled, editable, photo-optional)
4. Add a **post-onboarding prompt** for creators to upload their first track/episode/event (skippable)

Tier selection friction is also softened (see section 5).

---

## 1. New User Type: Event Organiser

### Who this is
Venue owners, concert promoters, workshop facilitators, conference organisers, club night hosts — anyone whose primary use case is creating and selling tickets for events, not uploading audio.

### Add to `UserType`
```typescript
type UserType = 
  | 'music_creator' 
  | 'podcast_creator' 
  | 'industry_professional' 
  | 'music_lover'
  | 'event_organiser'  // NEW
  | null;
```

### New step types
```typescript
| 'eventOrganiser_profileSetup'
| 'eventOrganiser_eventTypes'     // what kinds of events do you organise?
| 'eventOrganiser_location'       // local / city-wide / national / international
| 'eventOrganiser_valueDemo'      // show successful events & ticket revenue on the platform
```

### Step sequence (6 steps total, matching other paths)
```
userType → eventOrganiser_profileSetup → eventOrganiser_eventTypes 
→ eventOrganiser_location → eventOrganiser_valueDemo 
→ tierSelection → [firstPost] → [firstActionPrompt]
```

### UI for `userType` selection card
- Icon: `calendar` or `ticket`
- Label: "Event Organiser"
- Description: "Promote events, sell tickets, grow your audience"

### `eventOrganiser_eventTypes` step
Multi-select chips, similar to genres. Categories:
- Concerts & Live Music
- Club Nights & DJ Sets
- Workshops & Masterclasses
- Conferences & Talks
- Comedy Shows
- Open Mic Nights
- Film Screenings
- Fitness & Wellness
- Art & Culture
- Networking Events

These map to the existing event categories in the `events` table. Selection stored on the profile for feed personalisation.

### `eventOrganiser_location` step
Single-select:
- "Mostly local (my city/area)"
- "Regional (multiple cities)"
- "National"
- "International / Online"

Stored on profile. Used to calibrate geo-radius for event discovery.

### `eventOrganiser_valueDemo` step
Same pattern as other valueDemo steps — show a curated grid of 4–6 successful events on the platform with attendee counts and (if available) revenue earned. Headline: *"Creators like you are already selling tickets on SoundBridge."*

---

## 2. Follow Creators Step

### Where it appears
After the genre/category/event-type selection step for each path:
- Music Creator → after `musicCreator_genres`
- Podcast Creator → after `podcastCreator_categories`
- Industry Professional → after `industryProfessional_genres`
- Music Lover → after `musicLover_genres`
- Event Organiser → after `eventOrganiser_eventTypes`

### New step type
```typescript
| 'followSuggestions'  // shared across all paths
```

### Logic
1. Query `profiles` where the user's selected genres/categories overlap
2. Order by `followers_count DESC`, then `tracks_count DESC` (proxy for active creators)
3. Fetch up to 10 results
4. **If results < 3: skip this step entirely** — do not show an underpopulated list
5. If results ≥ 3: show the step with up to 10 suggestions

No cross-genre filling. If the genre is thinly populated, skip cleanly. The empty-state message if somehow rendered: *"Be one of the first [genre] creators on SoundBridge"* — but this should never show because the step is skipped before rendering.

### UI
- Grid of creator cards (2-column), each showing: avatar, display name, genre tag, follower count, Follow button
- "Follow All" option at the top
- "Continue" CTA at the bottom (works even if no one is followed — following is encouraged, not forced)
- Selected/followed creators get a filled checkmark state on their card

### Step numbering
This step is inserted into the path sequence and increments total step count by 1 for paths that show it. If skipped, step count is unchanged (handled at render time, not hard-coded).

---

## 3. Compulsory First Post

### Where it appears
As the second-to-last onboarding step, after `tierSelection` and before the user enters the app. It replaces `welcomeConfirmation` as the "you're done" moment.

### New step type
```typescript
| 'firstPost'
```

### Behaviour
- **Compulsory** — there is no skip button
- Post text is **pre-filled but editable**
- Photo is **optional** within the post
- Tapping "Publish & Enter SoundBridge" submits the post and completes onboarding

### Pre-filled templates by user type

| User Type | Pre-filled text |
|-----------|----------------|
| Music Creator | "Just joined SoundBridge! I make [genre] music and I'm here to share my sound with the world. Follow along 🎵" |
| Podcast Creator | "Just joined SoundBridge! I create [category] podcasts and I'm excited to build my audience here. Follow along 🎙" |
| Industry Professional | "Just joined SoundBridge! I'm a [role] looking to connect with talented creators. Let's collaborate. 🤝" |
| Music Lover | "Just joined SoundBridge! Here to discover great music and support the artists behind it. 🎧" |
| Event Organiser | "Just joined SoundBridge! I organise [event types] and I'm here to reach new audiences. Follow me for upcoming events. 🎟" |

Variables in brackets are replaced with the user's actual selections from earlier steps. If not selected, the bracketed text is omitted gracefully.

### UI
- Full-screen step (same layout as other onboarding steps)
- Header: "Introduce yourself"
- Subheader: "Your first post is how the community meets you. Make it yours."
- Large editable `TextInput` with pre-filled template text, character limit 280
- "Add a photo" row below the text input — taps into the image picker, shows thumbnail if selected
- Primary CTA: "Publish & Enter SoundBridge"
- On publish: the post is created via the existing `CreatePost` API call, then `completeOnboarding()` is called
- After publish: confetti/celebration animation before transitioning to the Home screen

### What happens if publish fails
- Show an inline error, keep the user on the step
- Do NOT silently skip or drop them into the app with no post — the post is part of the commitment
- If the network is offline, queue the post and complete onboarding anyway (post goes out when connection restores)

---

## 4. Post-Onboarding First Action Prompt

This appears as a **modal** after the user lands on the Home screen for the first time — not an onboarding step. It is path-specific and skippable.

### Trigger
Shown once, on first app open after onboarding completes. Gated by a flag: `has_seen_first_action_prompt` on the profile (or AsyncStorage).

### By user type

| User Type | Modal title | CTA | Skip text |
|-----------|------------|-----|-----------|
| Music Creator | "Upload your first track" | "Upload Now" → navigates to Upload screen | "Maybe later" |
| Podcast Creator | "Upload your first episode" | "Upload Now" → navigates to Upload screen | "Maybe later" |
| Industry Professional | "Complete your profile" | "Add your skills & experience" → navigates to Profile edit | "Maybe later" |
| Music Lover | (no modal — they have no first upload action) | — | — |
| Event Organiser | "Create your first event" | "Create Event" → navigates to Create Event screen | "Maybe later" |

### UI
- Bottom sheet modal (not full-screen — lower commitment feel)
- Illustration or icon relevant to the action
- 2–3 bullet points on the benefit ("Get discovered", "Start earning", etc.)
- Primary CTA button
- Plain text "Maybe later" below it — no secondary button styling, to reduce visual parity with the CTA

---

## 5. Tier Selection — Softened

### Current problem
The tier selection step forces a payment decision before the user has experienced the app at all. This creates unnecessary drop-off.

### Change
- Keep the tier selection step in onboarding (good for conversion awareness)
- Change the framing: lead with the **Free tier as the default** — highlight it as a real option, not a consolation
- Add "You can upgrade anytime from your profile" below the tier cards
- The CTA for Free tier changes from "Continue" to "Start Free" — active, positive language
- Remove any visual treatment that makes Free feel lesser than paid tiers (e.g. greyed-out, smaller card)

---

## Step Sequence Summary (after changes)

### Music Creator (9 steps if followSuggestions shown, 8 if skipped)
```
welcome → userType → musicCreator_profileSetup → musicCreator_genres 
→ [followSuggestions] → musicCreator_role → musicCreator_events 
→ musicCreator_valueDemo → tierSelection → firstPost → [Home + firstActionPrompt modal]
```

### Podcast Creator
```
welcome → userType → podcastCreator_profileSetup → podcastCreator_categories 
→ [followSuggestions] → podcastCreator_role → podcastCreator_events 
→ podcastCreator_valueDemo → tierSelection → firstPost → [Home + firstActionPrompt modal]
```

### Industry Professional
```
welcome → userType → industryProfessional_profileSetup → industryProfessional_role 
→ industryProfessional_genres → [followSuggestions] → industryProfessional_goals 
→ industryProfessional_valueDemo → tierSelection → firstPost → [Home + firstActionPrompt modal]
```

### Music Lover
```
welcome → userType → musicLover_profileSetup → musicLover_genres 
→ [followSuggestions] → musicLover_events → musicLover_valueDemo 
→ tierSelection → firstPost → [Home, no firstActionPrompt]
```

### Event Organiser (NEW)
```
welcome → userType → eventOrganiser_profileSetup → eventOrganiser_eventTypes 
→ [followSuggestions] → eventOrganiser_location → eventOrganiser_valueDemo 
→ tierSelection → firstPost → [Home + firstActionPrompt modal]
```

---

## Files to Modify / Create

| File | Change |
|------|--------|
| `src/screens/OnboardingScreen.tsx` | Add `event_organiser` type, 4 new steps, `followSuggestions` step, `firstPost` step, tier softening |
| `src/contexts/AuthContext.tsx` | Ensure `userType: 'event_organiser'` is handled in profile save |
| `src/components/FirstActionPromptModal.tsx` | **New file** — post-onboarding bottom sheet modal |
| `src/screens/HomeScreen.tsx` | Trigger `FirstActionPromptModal` on first load after onboarding |

---

## Out of Scope (not implementing now)
- Backend changes to event type taxonomy (using existing categories)
- Admin-side user type reporting/segmentation
- A/B testing the compulsory first post (treating it as decided)
