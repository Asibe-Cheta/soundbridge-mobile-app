# Fan Page Link — Share My Link Feature

## Before Writing Any Code
1. Find the existing creator profile 
   screen in the mobile app
2. Find how the fan landing page URL 
   is currently structured:
   soundbridge.live/[username]/home
3. Find the existing share functionality 
   anywhere in the app
4. Report findings before making 
   any changes

---

## Overview
Add a clearly visible "Share My Link" 
button to the creator's own profile 
screen that generates and shares 
their personal fan landing page link.

This must be live before 1PM tomorrow 
Friday 19th June 2026.

---

## What to Build

### Where it appears
On the creator's own profile screen 
only — not visible when viewing 
another creator's profile.

Position it prominently below the 
profile bio section and above the 
content tabs. It should be impossible 
to miss.

### Button design
A full width or prominent button:

Icon: share or link icon
Label: "Share My Fan Page Link"

### What happens when tapped
Two actions presented as options:

Option 1 — Copy Link
Copies the URL to clipboard:
soundbridge.live/[username]/home

Shows a brief confirmation toast:
"Link copied to clipboard"

Option 2 — Share
Opens the native share sheet on 
iOS and Android with the link 
pre-filled and this message:

"Listen to my music and support 
me directly on SoundBridge:
soundbridge.live/[username]/home"

### Additionally
Add the fan page link as visible 
text beneath the Share My Fan Page 
Link button so creators can see 
and manually copy it:

"Your fan link:
soundbridge.live/[username]/home"

Display it in a tappable text field 
that copies to clipboard when tapped.

---

## Also Add to Profile Settings Screen

In the profile settings or edit 
profile screen add the same fan 
link display so creators can always 
find it easily:

Section label: "Your Fan Page Link"
Text: soundbridge.live/[username]/home
A copy button beside it

---

## General Rules
- Only visible on own profile 
  not other profiles
- Username must be dynamic 
  not hardcoded
- Works on iOS and Android
- Share sheet works natively 
  on both platforms
- Copy to clipboard works on 
  both platforms
- Match existing design system

---

## Acceptance Criteria
- [ ] Share My Fan Page Link button 
      visible on own profile screen
- [ ] Copy Link copies correct URL
- [ ] Toast confirmation shows 
      after copying
- [ ] Share opens native share sheet 
      with correct link and message
- [ ] Fan link visible as text 
      beneath button
- [ ] Tapping text also copies link
- [ ] Fan link visible in profile 
      settings screen
- [ ] Username dynamic not hardcoded
- [ ] Works on iOS and Android
- [ ] Not visible on other profiles
