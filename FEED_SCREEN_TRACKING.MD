
# Feed Screen — Seen and Unseen Tracking
# Catch Up Mechanism Without Losing Relevance Ordering

## Before Writing Any Code
1. Find the existing TestFeedScreen.tsx and how 
   posts are currently fetched and ordered
2. Find the existing relevance matching logic used 
   to determine which posts a user sees, genre, 
   mood, location, follows, community membership
3. Find the existing profiles table structure
4. Report findings before making any changes

---

## Overview
Add a seen and unseen tracking layer to the feed. 
This does not replace the existing relevance based 
matching, it ensures every relevant unseen post 
actually gets surfaced before anything is buried, 
and gives users a clear sense of when they have 
caught up.

---

## Part 1 — Tracking the Cursor

Add to the profiles table:
```
last_feed_caught_up_at: timestamptz | null
```

This represents the last point in time up to which 
the user has fully scrolled through their relevant 
unseen content.

---

## Part 2 — Feed Assembly Logic

When the feed loads, split content into two buckets.

### New bucket
All posts matching the user's existing relevance 
criteria, genre, mood, location, follows, community 
membership, created after their last_feed_caught_up_at 
timestamp. If this is their first time using the 
app, default to the last 7 days.

Order this bucket using the existing relevance and 
quality scoring logic exactly as it works today, 
not chronologically.

### Caught up marker
After the new bucket is exhausted in the scroll, 
show a clear visual marker:

"You're all caught up"
Small subtext: "New posts from your community will 
appear here"

### Older bucket
Below the marker, show previously seen content, 
using the same relevance logic, for anyone who 
wants to keep browsing.

---

## Part 3 — Updating the Cursor

When the user scrolls past the caught up marker, 
or when they close the app after having scrolled 
through the entire new bucket, update 
last_feed_caught_up_at to the current timestamp.

If the user opens the app and closes it without 
scrolling through all new content, do not update 
the cursor, so the unseen posts remain unseen for 
next time.

---

## Part 4 — Pull to Refresh Indicator

If new relevant posts have arrived since the feed 
was last loaded in the current session, show a 
small "New posts" pill at the top of the feed that 
the user can tap to jump to the top of the new 
bucket, similar to familiar patterns elsewhere, 
without needing a full screen reload.

---

## General Rules
- Relevance ordering within the new bucket is 
  unchanged from existing logic
- This is a bounded set by definition, only since 
  last caught up, so relevance ordering here does 
  not risk permanently burying anything the way an 
  unbounded algorithmic feed would
- Cursor only updates when genuinely scrolled 
  through, not just on app open
- Match existing design system throughout
- Test on iOS Android and web

---

## Acceptance Criteria
- [ ] last_feed_caught_up_at added to profiles
- [ ] New bucket correctly shows all relevant 
      unseen posts since cursor
- [ ] New bucket ordered by existing relevance 
      logic, not chronologically
- [ ] Caught up marker displays correctly after 
      new bucket is exhausted
- [ ] Older bucket displays correctly below marker
- [ ] Cursor updates only when scrolled through, 
      not on simple app open
- [ ] New posts pill appears correctly for content 
      arriving mid session
- [ ] No existing relevance matching logic altered
- [ ] No existing functionality broken
- [ ] Tested on iOS Android and web
