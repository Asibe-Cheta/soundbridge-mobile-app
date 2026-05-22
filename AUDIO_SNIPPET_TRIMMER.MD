# Audio Snippet Trimmer for Feed Posts

## Before Writing Any Code
1. Find the existing post creation flow 
   in the mobile app codebase
2. Find how the existing 60 second 
   audio attachment currently works 
   on feed posts
3. Find what audio library is currently 
   used — expo-av, expo-audio or other
4. Find how audio files are currently 
   uploaded to Supabase storage
5. Find the existing post card UI 
   during post creation
6. Check if any audio trimming or 
   waveform library is already installed
7. Report findings before making 
   any changes

---

## Overview
Add an audio snippet trimmer to the 
feed post creation flow. When a creator 
attaches audio to a post they can 
upload any audio file and use a visual 
trimmer to select exactly which 60 
seconds they want to include. The 
trimmed clip is what gets attached 
to the post.

Maximum clip length: 60 seconds
Minimum clip length: no minimum
The user cannot extend beyond 60 seconds

This feature is available to Premium 
and Unlimited users only. Free users 
see the existing manual upload option 
with a nudge to upgrade for the 
trimmer feature.

---

## UI — Audio Attachment in Post Creation

### Entry point
In the existing post creation card, 
find the audio attachment option. 
When a Premium or Unlimited user 
taps to add audio, show two options:

Option 1 — "Upload a clip" 
(existing behaviour, manual upload 
of a pre-trimmed file, available 
to all tiers)

Option 2 — "Trim from track" 
(new feature, Premium and Unlimited only)
If a free user taps this show:
"This feature is available on 
Premium and Unlimited plans."
With a redirect to the pricing page.

---

## Trim from Track Flow

### Step 1 — File selection
User selects an audio file from 
their device. Accept all audio 
formats currently supported in 
the codebase.

### Step 2 — Trimmer screen
Open a new full screen trimmer 
modal after file selection.

**Visual layout of the trimmer:**

Top section:
- Audio file name
- Total duration of the uploaded file

Center section — Waveform display:
- Show a scrollable waveform 
  visualisation of the full audio file
- The waveform scrolls horizontally 
  if the file is longer than the 
  screen width
- A fixed 60 second selection window 
  is overlaid on the waveform
- The selection window is highlighted 
  in the platform's brand colour
- Outside the selection window the 
  waveform is dimmed

Bottom section — Controls:
- Play button: plays the currently 
  selected 60 second window so the 
  creator can preview it
- Pause button
- Current selection start time 
  and end time displayed as 
  MM:SS — MM:SS
- A drag handle on the left edge 
  of the selection window — 
  dragging moves the start point
- The end point automatically 
  adjusts to maintain exactly 
  60 seconds from wherever the 
  start point is dragged to
- If the user wants a shorter clip 
  they can drag a right handle 
  inward — this reduces the clip 
  length below 60 seconds but 
  never above it

### Step 3 — Confirm selection
Button at the bottom: "Use This Clip"

On tap:
1. Trim the audio client-side to 
   the selected segment using the 
   existing audio library
2. The trimmed clip replaces the 
   full file — the full file is 
   not uploaded
3. Return to the post creation screen 
   with the trimmed clip attached
4. Show a small audio player in 
   the post card showing the clip 
   duration and a play preview button

### Step 4 — Post publication
When the creator taps Publish, 
the trimmed clip uploads to 
Supabase storage alongside 
the post as normal.

---

## Waveform Visualisation
Check if a waveform library is 
already in the codebase before 
adding a new one.

If none exists, implement a 
simplified waveform using sampled 
amplitude data from the audio file. 
A basic bar chart style waveform 
is acceptable — it does not need 
to be pixel perfect. The important 
thing is that it gives the user 
a visual sense of the audio shape 
so they can find the right moment.

---

## Client-Side Trimming
The trim must happen on device 
before upload. Do not upload the 
full file to a server for trimming.

Use the existing audio library to 
extract the selected segment. 
If the current library does not 
support trimming check what is 
available before adding a dependency.

The output trimmed file should be 
in the same format as the input 
or converted to MP3 if format 
conversion is simpler.

---

## General Rules
- Maximum clip length is strictly 
  60 seconds — enforce this in code, 
  not just in the UI
- Do not upload the full audio file 
  to storage — only the trimmed clip
- Feature is Premium and Unlimited only
- Free users see existing manual 
  upload option with upgrade nudge
- Music playback elsewhere in the 
  app must never be affected
- Match existing design system throughout
- Do not add new dependencies without 
  checking existing libraries first

---

## Acceptance Criteria
- [ ] Audio trimmer option appears 
      in post creation for Premium 
      and Unlimited users
- [ ] Free users see upgrade nudge
- [ ] File picker opens correctly
- [ ] Waveform displays after file selection
- [ ] Selection window shows correctly 
      on waveform
- [ ] Dragging start handle moves 
      selection correctly
- [ ] End point auto-adjusts to 
      maintain selected duration
- [ ] Right handle allows shorter 
      clips below 60 seconds
- [ ] Cannot extend beyond 60 seconds
- [ ] Preview plays selected clip correctly
- [ ] Client-side trim works correctly
- [ ] Only trimmed clip is uploaded 
      to Supabase
- [ ] Trimmed clip appears in post 
      card with correct duration
- [ ] Post publishes with trimmed 
      clip attached
- [ ] Tested on iOS and Android
