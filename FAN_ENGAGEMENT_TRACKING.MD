
**FULL CURSOR PROMPT — Audio Lover Engagement Tracking & Referral System**

---

**Important — check existing code first:** Before building anything, inspect the existing user profile structure, existing tipping transaction records, existing "share the app" notification and its destination screen, and any existing referral tracking logic (used for partner/creator referral links, where a referral code is captured via a URL parameter such as `?ref=creatorname` and stored against the referred user's account). Reuse existing schema patterns, referral logic, and naming conventions rather than introducing a separate, parallel system.

**Important terminology:** In this app, non-creator listener accounts are classified as "Audio Lovers" (this may also appear in the codebase as "music lover" or similar, check the actual current label used in the user role/type field, and use whatever the current stored value is). This prompt concerns that user type specifically, not creators.

**The current gap this prompt addresses:**

There is currently no way for an Audio Lover (listener/fan) account to generate their own personal referral link. The only existing mechanism is a general "share the app" notification, which leads to a share screen with a generic app link, not a unique, trackable referral link tied to that specific Audio Lover's account. This prompt adds that missing capability, plus engagement tracking and display.

**Part A: Build a referral link generation feature for Audio Lover accounts**

- Add the ability for an Audio Lover to generate their own unique referral link from their profile or account settings screen, reusing the same referral link structure and mechanism already used for creator/partner referral links (e.g. `soundbridge.live/join?ref=[unique-identifier]`), but scoped to Audio Lover accounts.
- The unique identifier should be tied to the Audio Lover's account (e.g. their username or a generated unique code, matching however existing referral codes are currently generated for creators/partners).
- Display this referral link clearly on the Audio Lover's profile or account settings screen, with a share button that reuses the existing app-wide share functionality already used elsewhere (e.g. the existing "share the app" flow), rather than building new share logic.
- When a new user signs up via an Audio Lover's referral link, capture and store that referral relationship using the same existing referral tracking logic already used for creator/partner referrals (the same `ref` parameter capture and storage mechanism), so it is consistently tracked regardless of whether the referrer is a creator, partner, or Audio Lover.

**Part B: Track engagement activity for Audio Lover accounts**

Track the following for each Audio Lover account:
- Total number of tips given by that Audio Lover (count)
- Total monetary amount tipped by that Audio Lover, cumulative
- Number of successful referrals generated via their referral link (new users who signed up through it, and separately, how many of those referred users went on to subscribe, if that distinction is available in existing data)

Add fields to the existing user profile table (or a related engagement-tracking table, whichever better matches existing schema conventions) to store: cumulative tip count, cumulative tip amount, referral count, subscribed-referral count, and last-updated timestamp.

**Part C: Display engagement status on the Audio Lover's profile**

On the Audio Lover's own profile screen, add a simple, visible indicator showing their engagement, for example a "Supporter Level" label or a points-style count. Visual treatment should match existing profile screen design patterns (card style, typography, colour palette already used elsewhere on the profile). Keep this lightweight, a small section or element, not a dominant new screen.

**Opt-in requirement:**

This tracking and referral link generation should be opt-in, not automatic and silent by default. Add a simple toggle or confirmation in account settings (or during onboarding, if a suitable existing step is available to extend), allowing the Audio Lover to enable engagement tracking and referral link generation. Present this as a clear, appealing default choice. If the user has not opted in, do not generate a referral link for them, and do not track or display any engagement data.

**Scope boundaries:**

- Do not build any reward redemption, free or discounted ticket allocation, or payout logic as part of this prompt, tracking, referral link generation, and display only
- Do not connect this to any sponsor or payment system, none exists yet for this feature
- This is the foundational tracking and referral layer only. A future rewards system (giving Audio Lovers free or discounted event tickets based on this tracked activity) is separate, planned future work, not part of this prompt

**General rules:**

- Follow existing code style, schema conventions, and profile screen component structure throughout
- Ensure tracking logic reuses existing tip transaction records and existing referral capture logic rather than duplicating data capture or building a parallel referral system

