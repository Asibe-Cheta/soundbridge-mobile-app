
# Post-Tip Message — Community Link Addition

## Before Writing Any Code
1. Find the existing automated thank 
   you message system that sends a 
   message to a fan after they tip 
   a creator
2. Find where this message is generated 
   and sent in the codebase
3. Find how the creator's fan landing 
   page URL is currently structured
4. Find the existing chat or messaging 
   system where this message appears
5. Report findings before making 
   any changes

---

## Overview
A small but high impact update to 
the existing automated post-tip 
thank you message.

When a fan tips a creator the 
existing automated message already 
sends a thank you from the creator 
to the fan via the chat system.

Update that message to include 
the creator's fan landing page 
community link at the end.

---

## The Update

Find the existing automated thank 
you message template.

Update the message body to include 
the following at the end:

Current message ends however it 
currently ends.

Add this line after the existing 
thank you text:

"You are now part of my SoundBridge 
community. Stay connected and listen 
to my music here:
soundbridge.live/[creator_username]/home"

The [creator_username] must be 
dynamically populated with the 
actual username of the creator 
who received the tip.

---

## Rules
- This is a message update only
- No new screens or flows required
- The link must be dynamic not hardcoded
- The existing thank you message 
  content remains unchanged
- Only the community link line 
  is added at the end
- Works for all tip types — 
  music tips, Request Room tips, 
  event tips
- Test on iOS Android and web

---

## Acceptance Criteria
- [ ] Post-tip thank you message 
      still sends correctly
- [ ] Community link appended 
      correctly at end of message
- [ ] Creator username in link 
      is correct and dynamic
- [ ] Link format is correct:
      soundbridge.live/[username]/home
- [ ] Works for all tip types
- [ ] No existing messaging 
      functionality broken
- [ ] Tested on iOS Android and web
