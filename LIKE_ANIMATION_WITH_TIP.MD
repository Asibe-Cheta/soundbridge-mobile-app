# Like Animation with Tip Suggestion & Comment with Tip

## Before Writing Any Code
1. Find the music player screen in the 
   mobile app codebase
2. Find the existing like button component 
   and how likes are currently handled
3. Find the existing tip flow — how tips 
   are initiated and processed
4. Find the existing comments section on 
   the music player and how comments 
   are submitted
5. Find the existing animation system 
   used elsewhere in the app
6. Report findings before making any 
   changes

---

## Feature 1 — Like Animation with 
## Tip Suggestion

### What happens when a user taps Like

Step 1: The existing like action fires 
as normal. Do not change the like 
functionality itself.

Step 2: A heart animation plays on 
the like button. Use a satisfying 
scale and fade animation:
- Heart scales up to 1.3x briefly
- A few small floating hearts drift 
  upward from the button and fade out
- Duration: 800ms total
- Match existing animation style in 
  the app

Step 3: After the animation completes, 
a small subtle tip suggestion appears 
near the like button. This must not 
block the screen or interrupt playback.

### Tip suggestion design
- Appears as a small floating pill 
  or card near the like button
- Semi-transparent background with 
  blur effect matching the existing 
  glassmorphism style
- Text: "Let [username] know you love them! send a tip."
- Two small quick-tap amount buttons: 
  "£1" and "£5"
- A small "x" to dismiss
- Auto-dismisses after 4 seconds 
  if not tapped
- Slides in gently from the like 
  button position
- Slides out the same way on 
  dismiss or auto-dismiss

### Tip suggestion behaviour
- Tapping £1 or £5 opens the 
  existing tip flow pre-filled 
  with that amount
- Do not rebuild the tip flow — 
  just open it with the amount 
  pre-selected
- The suggestion only appears 
  once per track per session. 
  If the user has already seen 
  it for this track in this 
  session, do not show it again
- Music playback must never 
  be affected under any 
  circumstances
- If the user has already tipped 
  this track, do not show the 
  suggestion at all

When the tip is sent, an automatic message should be sentfrom the creator who was tipped to the chat of the tipper "Thank you so much [tipper username or email], you are amazing!"

### Storage
Store per track per session in 
component state only. No database 
entry needed for dismissal — 
this resets each session naturally.


## General Rules
- Music playback never affected 
  by either feature
- Do not rebuild any existing 
  flows — tip, like
- Match existing design system 
  exactly throughout
- Both features must work on 
  iOS and Android
- The like tip suggestion must 
  feel subtle and natural, 
  never intrusive or pushy

---

## Acceptance Criteria
- [ ] Like animation plays on tap
- [ ] Floating hearts animate 
      correctly
- [ ] Tip suggestion appears after 
      animation completes
- [ ] Tip suggestion auto-dismisses 
      after 4 seconds
- [ ] Tapping £1 or £5 opens tip 
      flow pre-filled
- [ ] Suggestion only shows once 
      per track per session
- [ ] Suggestion does not show if 
      user already tipped this track
- [ ] Send with Tip button added 
      to comment input
- [ ] Tip flow opens correctly 
      from Send with Tip
- [ ] Music playback never 
      interrupted
- [ ] Tested on iOS and Android
