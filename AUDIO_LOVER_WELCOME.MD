

**FULL CURSOR PROMPT — First-Visit Welcome Layer for Audio Lovers**

---

**Important — check existing code first:** Before building anything, inspect the existing feed screen (referred to internally as the "test feed screen"), the existing banner/card components used for event organiser banners, and the existing user profile/onboarding completion tracking (to determine how to detect "first visit" or session count since onboarding). Reuse existing banner styling, horizontal scroll patterns, and card components exactly, do not introduce a new visual system.

**What to build:**

A dismissible welcome layer that appears at the top of the feed screen for Audio Lover (non-creator) users, shown only during their first few sessions after completing onboarding, orienting them to what SoundBridge offers them specifically.

**Trigger condition:**

Show this welcome layer only for users with the Audio Lover role, and only during a limited window after onboarding completion, defined as either their first 3 app sessions, or their first 7 days since account creation, whichever is easier to implement with existing session/account tracking. After this window, the welcome layer should stop appearing automatically for that user.

**Content and structure:**

1. A brief, personalised header at the top of the feed: "Welcome to SoundBridge, [User's Name]. Here's what's yours to explore." Use the user's actual display name from their profile, following existing personalisation patterns used elsewhere in the app (e.g. the Drops tab's "[Name] · You" pattern).

2. Below the header, a horizontal-scrolling row of 2-3 compact cards, reusing the existing banner card component and styling from the event organiser banners (Create an Event / Discover Talent banners):
   - Card 1: "Discover artists near you" — links to the existing Discover screen
   - Card 2: "Support creators directly, keep the connection real" — links to a relevant existing screen (e.g. an example creator profile, or the Tip Room feature explanation, use whichever makes more sense given existing navigation)
   - Card 3 (conditional): "Share SoundBridge, earn as your friends join" — only show this card if the Audio Lover has referral link generation available (from the existing referral system). Links to their referral link screen. If referral link generation is not yet available for this user, omit this card entirely rather than showing a broken or premature link.

3. A final light-touch line below the cards: "The more you support artists you love, the more you'll unlock as we grow." Static text, not a card, no link, purely a forward-looking statement, do not attach it to any specific unbuilt feature.

**Dismiss behaviour:**

Include a clear dismiss control (e.g. an X icon) allowing the user to manually hide the welcome layer at any point. Once dismissed, do not show it again for that user, even if still within the first-session window.

**Scope boundaries:**

- This welcome layer must not appear for creator accounts or event organiser accounts, Audio Lovers only
- Do not build any new destination screens as part of this prompt, all card links should route to existing screens
- Do not hardcode or promise specific future features (music competitions, transport discounts, gamified rewards) anywhere in this welcome layer's copy

**General rules:**

- Follow existing code style, banner component structure, and feed screen layout conventions throughout
- Ensure the welcome layer doesn't push the rest of the feed content down excessively, keep it compact

