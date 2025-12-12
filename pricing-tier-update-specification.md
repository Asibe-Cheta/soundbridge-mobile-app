# SoundBridge Pricing Tier Update Specification

## Overview
This document outlines the complete restructure of SoundBridge's pricing tiers from the old model to the new three-tier system. This applies to both web and mobile applications. All features, permissions, and UI elements must be updated to reflect the new pricing structure.

**IMPORTANT:** This is a specification document only. No code is included. Development teams should implement according to their existing codebase patterns and architecture.

**Note to Development Teams:** Justice will handle updates to App Store, Play Store, RevenueCat, and Stripe configurations separately. Your implementation should reference the tier IDs/SKUs that will be configured in those systems.

---

## Current State (OLD - To Be Replaced)

### Old Pricing Structure:
- **Free Tier:** Basic features
- **Premium Tier:** £9.99/month or £99.99/year
- No additional tiers

**Note:** This pricing was never launched publicly. Only used in sandbox/testing.

---

## New State (NEW - To Be Implemented)

### New Pricing Structure:

**Three Tiers:**
1. **FREE** - Entry level with limited uploads
2. **PREMIUM** - £6.99/month or £69.99/year (16% annual discount)
3. **UNLIMITED** - £12.99/month or £129.99/year (17% annual discount)

---

## Detailed Tier Specifications

---

### **TIER 1: FREE**

**Price:**
- £0 (Free forever)

**Upload Limits:**
- 3 tracks total (lifetime limit)
- Once 3 tracks uploaded, cannot upload more unless they upgrade
- Tracks remain live even if user never upgrades

**Profile & Networking:**
- Basic profile creation
- Profile picture and banner image
- Bio (up to 500 characters)
- Location field
- Genre tags (up to 3)
- Social media links
- Can connect with other users (send/accept connection requests)
- Can view other profiles
- Can browse Discover page (all tabs: Music, Artists, Events, Playlists, Services, Venues)

**Feed & Posts:**
- Can view Feed (professional posts from connections and nearby users)
- Can create text posts (max 500 characters)
- Can attach single image to posts
- Can attach audio clips to posts (max 30 seconds)
- Can react to posts (Support, Love, Fire, Congrats)
- Can comment on posts (1 level threading)
- Can share posts

**Monetization:**
- ✅ **CAN receive tips from fans** (keep 95%, platform takes 5%)
- ✅ Can sell event tickets (keep 95%, platform takes 5%)
- ❌ Cannot offer services as service provider
- ❌ Cannot sell merchandise (future feature)

**Events:**
- Can browse events (Events Near You)
- Can RSVP to events
- Can create events (up to 3 active events at a time)
- Can sell tickets to their events

**Analytics:**
- Basic stats only:
  - Total streams (approximate)
  - Total tips received
  - Total followers/connections count
  - Profile views (last 30 days)
- No detailed demographics or geographic data
- No conversion metrics

**Visibility:**
- Normal ranking in Feed
- Normal ranking in Discover
- Not featured on Discover page
- No "Pro" or "Unlimited" badge on profile

**Audio Previews:**
- 30-second maximum audio clips in posts
- Full tracks can be streamed by anyone (no limitation)

**Other Features:**
- Can message other users (DMs)
- Can search platform (artists, music, events, venues)
- Can join Live Audio Sessions (as listener or speaker)
- Standard support (email, help center)

**Profile URL:**
- Default format: `soundbridge.live/user/[user_id]`
- Example: `soundbridge.live/user/abc123xyz456`

**Branding:**
- Profile includes "Powered by SoundBridge" footer

---

### **TIER 2: PREMIUM**

**Price:**
- **Monthly:** £6.99/month
- **Annual:** £69.99/year (16% discount from £83.88)
- **Monthly equivalent (annual):** £5.82/month

**Subscription Management:**
- Users can switch between monthly and annual at any time
- Switching to annual: Immediate charge, previous monthly subscription cancelled
- Switching to monthly from annual: Takes effect after annual period ends
- Cancellation: Access continues until end of billing period, then reverts to Free tier

**Upload Limits:**
- **7 tracks per month** (rolling monthly limit)
- Resets on subscription renewal date (not calendar month)
- Example: Subscribe on 15th → Get 7 uploads. On 15th next month → Get 7 more uploads
- If subscription lapses: No new uploads until resubscribed, existing uploads remain live
- No carryover: Unused uploads don't roll over to next month

**All Free Tier Features PLUS:**

**Enhanced Profile:**
- ✅ **"Pro" badge** displayed on profile (visual indicator next to name)
- ✅ **Custom profile URL:** `soundbridge.live/[custom-username]`
  - Users choose their custom username (subject to availability)
  - Alphanumeric + hyphens only, 3-30 characters
  - Once set, can be changed once per 90 days
- Profile sections rearranged to highlight premium status
- Remove "Powered by SoundBridge" footer from profile

**Featured Placement:**
- ✅ **Featured on Discover page 1x per month**
  - Automatic rotation system (all Premium users get featured)
  - Featured in "Featured Artists" section on Discover
  - Featured period: 24-48 hours
  - Scheduling: Random within each month, ensures all Premium users rotate
  - Visual indicator: "Featured" badge during featured period

**Feed Priority:**
- ✅ **Priority ranking in Feed algorithm**
  - Premium user posts appear higher in Feed
  - Not at very top (no spam), but weighted higher than Free users
  - Algorithm boost: ~30-50% higher visibility

**Advanced Analytics:**
- All Basic stats (from Free tier)
- ✅ **Detailed listener demographics:**
  - Age ranges (18-24, 25-34, 35-44, 45-54, 55+)
  - Gender breakdown
- ✅ **Geographic breakdown:**
  - Top countries (listeners by country)
  - Top cities (listeners by city)
  - Map visualization showing listener concentration
- ✅ **Listening behavior:**
  - Peak listening times (hour of day, day of week)
  - Average listen duration per track
  - Skip rate (% who skip before 30 seconds)
  - Completion rate (% who listen to end)
- ✅ **Engagement metrics:**
  - Streams-to-tips conversion rate
  - Profile visits to follower conversion
  - Post engagement rate (views, reactions, comments)
- ✅ **Referral sources:**
  - How listeners found your profile (search, feed, discover, direct link, event)
- ✅ **Trend graphs:**
  - Streams over time (daily, weekly, monthly)
  - Tips over time
  - Follower growth
- ✅ **Export data:** Download analytics as CSV/PDF

**Collaboration Matching:**
- ✅ **AI-powered weekly matches**
  - System suggests 3-5 relevant connections per week:
    - Producers who match artist's genre
    - Artists in same location/genre
    - Venues seeking artists in their genre
    - Service providers (coaches, engineers) relevant to their needs
  - Based on: Genre, location, activity level, profile completeness
  - Delivered via in-app notification + email (if enabled)
  - Can accept/decline suggestions
  - Can provide feedback to improve future matches

**Audio Previews:**
- ✅ **60-second audio clips** in posts (vs 30 seconds for Free)
- Full tracks still streamable by anyone (no limitation)

**Priority Support:**
- ✅ Email support with faster response time (24-48 hours vs 3-5 days for Free)
- ✅ Access to support chat (if implemented)
- ✅ Priority in support queue

**Early Access:**
- ✅ Beta testing new features before public release
- ✅ Feedback directly shapes product development
- ✅ Invitations to Premium-only virtual events/workshops (future)

**Other Premium Perks:**
- Can create unlimited events (vs 3 active events for Free)
- Higher quality audio streaming (if quality tiers implemented in future)
- Access to Premium-only Slack/Discord community (future)

**What Premium Does NOT Include:**
- Unlimited uploads (must upgrade to Unlimited tier for that)
- Multiple featured placements per month (only 1x/month)
- API access (future Unlimited feature)
- White-label profile (future Unlimited feature)

---

### **TIER 3: UNLIMITED**

**Price:**
- **Monthly:** £12.99/month
- **Annual:** £129.99/year (17% discount from £155.88)
- **Monthly equivalent (annual):** £10.78/month

**Subscription Management:**
- Same as Premium tier (can switch monthly/annual, cancellation reverts to Free)

**Upload Limits:**
- ✅ **UNLIMITED tracks per month**
- No restrictions on upload frequency
- No maximum track count
- If subscription lapses: No new uploads until resubscribed, existing uploads remain live

**All Premium Tier Features PLUS:**

**Enhanced Badge:**
- ✅ **"Unlimited" badge** displayed on profile (distinct from "Pro" badge)
- Different visual styling (gold/premium color vs regular Pro badge)

**Featured Placement:**
- ✅ **Featured on Discover page 2x per month** (vs 1x for Premium)
  - Automatic rotation system
  - Featured twice as often as Premium users
  - Each featured period: 24-48 hours

**Top Priority in Feed:**
- ✅ **Highest priority ranking** in Feed algorithm
  - Unlimited posts appear highest (above Premium and Free)
  - Algorithm boost: ~50-80% higher visibility than Premium

**Advanced Promotional Tools:**
- ✅ **Social media post generator:**
  - AI-generated post copy for Instagram, Twitter, Facebook
  - Includes track links, hashtags, captions
  - Customizable templates
  - Export as images/text
- ✅ **Email list integration (future):**
  - Export list of fans who tipped
  - Export list of followers/connections
  - Downloadable CSV with emails (GDPR-compliant)
- ✅ **Custom promo codes:**
  - Create discount codes for event tickets
  - Track redemptions
  - Set expiration dates and usage limits
- ✅ **Detailed engagement reports:**
  - Weekly/monthly summary emails
  - Performance benchmarks vs similar artists
  - Actionable growth recommendations

**API Access (Future Feature):**
- ✅ REST API access to own profile data
- ✅ Programmatic upload of tracks
- ✅ Analytics API for custom dashboards
- ✅ Webhook notifications for tips, new followers, etc.
- Note: Mark as "Coming Soon" in UI, implement later

**White-Label Profile (Future Feature):**
- ✅ Custom domain support (e.g., artist.com points to SoundBridge profile)
- ✅ Remove all SoundBridge branding from public profile
- ✅ Custom color scheme/theming
- Note: Mark as "Coming Soon" in UI, implement later

**Dedicated Account Manager (Future Feature):**
- ✅ Personal support contact for high-volume creators
- ✅ Onboarding assistance
- ✅ Strategy consultation
- Note: Mark as "Coming Soon" in UI, implement later

**Priority Everything:**
- Highest priority in all algorithms (Feed, Discover, Search)
- First to receive new features
- Highest priority support (12-24 hour response)

**Unlimited Events:**
- Can create unlimited active events (Premium: unlimited, Free: 3)

---

## Implementation Requirements

---

### **1. Subscription State Management**

**User Subscription Status:**

The application must track and store the following for each user:

**Fields to Track:**
- `subscription_tier`: "free" | "premium" | "unlimited"
- `subscription_period`: "monthly" | "annual" | null (for free)
- `subscription_status`: "active" | "cancelled" | "expired" | "trial" | null
- `subscription_start_date`: ISO 8601 datetime (when subscription began)
- `subscription_renewal_date`: ISO 8601 datetime (when subscription renews/expires)
- `subscription_cancel_date`: ISO 8601 datetime | null (when user cancelled, if applicable)
- `uploads_this_period`: integer (tracks uploaded in current billing period)
- `upload_period_start`: ISO 8601 datetime (start of current upload counting period)
- `custom_username`: string | null (for Premium/Unlimited custom URLs)
- `featured_this_month`: boolean (whether user has been featured this month)
- `last_featured_date`: ISO 8601 datetime | null

**Subscription State Logic:**

**Active Subscription:**
- User has paid and subscription is current
- Renewal date is in the future
- Full tier benefits apply

**Cancelled Subscription:**
- User cancelled but still within paid period
- Benefits continue until renewal_date
- On renewal_date → status changes to "expired" → tier reverts to "free"

**Expired Subscription:**
- Renewal date has passed
- No payment received
- Tier automatically reverts to "free"
- Upload count resets, but existing uploads remain live

**Payment Failed:**
- Handle gracefully: Give 7-day grace period
- Send notification to update payment method
- After grace period → status changes to "expired" → revert to free

---

### **2. Upload Limit Enforcement**

**Upload Count Tracking:**

**For Premium Users (7/month):**
- Track uploads within billing period (not calendar month)
- Billing period = subscription_start_date to subscription_renewal_date (30-31 days)
- When user reaches 7 uploads: Block further uploads with upgrade prompt
- When renewal_date passes: Reset `uploads_this_period` to 0, update `upload_period_start`

**For Free Users (3 lifetime):**
- Track total uploads ever made
- When user reaches 3: Block further uploads with upgrade prompt
- Count never resets (lifetime limit)

**For Unlimited Users:**
- No tracking needed (unlimited)
- Allow all uploads

**Upload Blocking UI:**

When user attempts to upload and has reached limit:

**Free User (3 tracks used):**
```
Modal/Dialog:
Title: "Upload Limit Reached"
Message: "You've uploaded your 3 free tracks. Upgrade to Premium for 7 tracks/month or Unlimited for unlimited uploads."
Buttons:
- "View Plans" (primary) → Redirects to pricing page
- "Cancel" (secondary) → Closes modal
```

**Premium User (7 tracks used this month):**
```
Modal/Dialog:
Title: "Monthly Upload Limit Reached"
Message: "You've uploaded 7 tracks this month. Your limit resets on [renewal_date]. Upgrade to Unlimited for unlimited uploads anytime."
Buttons:
- "Upgrade to Unlimited" (primary) → Redirects to pricing/upgrade flow
- "Remind Me Later" (secondary) → Closes modal
```

**Upload Counter Display:**

Show upload progress on Upload page/modal:

**Free:**
- "Uploads used: 2 of 3" (with progress bar)
- When 3/3: "Upload limit reached. Upgrade to upload more."

**Premium:**
- "Uploads this month: 5 of 7" (with progress bar)
- "Resets on [date]"
- When 7/7: "Monthly limit reached. Resets on [date] or upgrade to Unlimited."

**Unlimited:**
- "Unlimited uploads" (no counter)
- Or remove upload counter entirely

---

### **3. Feature Access Control**

**Gating Logic:**

Implement permission checks throughout the application for tier-specific features:

**Check User Tier Before Allowing:**

**Custom Username (Premium/Unlimited):**
- Setting page: Only show "Custom URL" field if tier is "premium" or "unlimited"
- If Free user tries to access: Show upgrade prompt

**Advanced Analytics (Premium/Unlimited):**
- Analytics page: Show full dashboard if tier is "premium" or "unlimited"
- If Free: Show only basic stats + "Upgrade to see detailed analytics" card

**60-Second Audio Posts (Premium/Unlimited):**
- Post creation: If Free tier → Max 30 seconds (enforced in UI)
- If Premium/Unlimited → Max 60 seconds

**Featured Placement (Premium/Unlimited):**
- Automatic background job (cron/scheduler) selects users for featuring
- Only select from users where tier is "premium" or "unlimited"
- Premium: Feature 1x/month
- Unlimited: Feature 2x/month

**Collaboration Matching (Premium/Unlimited):**
- Weekly matching job runs
- Only generate matches for tier "premium" or "unlimited"
- Send notifications with suggested connections

**Priority Support (Premium/Unlimited):**
- Support ticket system: Tag tickets by user tier
- Route Premium/Unlimited to priority queue (24-48 hour SLA)
- Route Free to standard queue (3-5 day SLA)

**API Access (Unlimited only - Future):**
- API authentication: Check tier = "unlimited"
- If not: Return 403 Forbidden with upgrade message

**Promotional Tools (Unlimited only):**
- Show "Social Media Post Generator" menu item only if tier = "unlimited"
- If Free/Premium tries to access: Show upgrade prompt

---

### **4. UI/UX Changes**

**Pricing Page:**

Create or update `/pricing` route with new tier structure

**Page Layout:**

Three-column pricing table (side-by-side cards on desktop, stack on mobile)

**Card Structure (each tier):**

```
[Tier Name]
[Price/month or /year toggle]
[Primary CTA Button]
[Feature List]
```

**Free Tier Card:**
- Tier Name: "FREE"
- Price: "£0 / Forever"
- CTA: "Get Started" (if not logged in) or "Current Plan" (if on Free)
- Features (bullet points):
  - ✓ 3 track uploads (lifetime)
  - ✓ Basic profile & networking
  - ✓ Receive tips (keep 95%)
  - ✓ Create & sell event tickets
  - ✓ Browse & discover music
  - ✓ Live audio sessions
  - ✓ Basic analytics
  - ✓ Messaging

**Premium Tier Card:**
- Tier Name: "PREMIUM" (with "Pro" badge graphic)
- Price Toggle: "£6.99/month" or "£69.99/year (Save 16%)"
- CTA: "Upgrade to Premium" (primary button, highlighted/accent color)
- Features (bullet points):
  - ✓ Everything in Free
  - ✓ **7 tracks per month**
  - ✓ **Featured on Discover 1x/month**
  - ✓ **Advanced analytics**
  - ✓ **Priority in feed**
  - ✓ **Pro badge**
  - ✓ **Custom profile URL**
  - ✓ **60-second audio previews**
  - ✓ **AI collaboration matching**
  - ✓ **Priority support**
  - ✓ **Early access to features**

**Unlimited Tier Card:**
- Tier Name: "UNLIMITED" (with "Unlimited" badge graphic)
- Price Toggle: "£12.99/month" or "£129.99/year (Save 17%)"
- CTA: "Upgrade to Unlimited" (primary button, premium styling)
- Badge: "Best for Professionals" or "Most Popular" (optional)
- Features (bullet points):
  - ✓ Everything in Premium
  - ✓ **UNLIMITED track uploads**
  - ✓ **Featured 2x per month**
  - ✓ **Top priority in feed**
  - ✓ **Advanced promotional tools**
  - ✓ **Social media post generator**
  - ✓ **Custom promo codes**
  - ✓ **Email list export**
  - ✓ **API access** (Coming Soon)
  - ✓ **White-label profile** (Coming Soon)
  - ✓ **Dedicated account manager** (Coming Soon)

**Monthly/Annual Toggle:**
- Switch at top of pricing page
- Updates all prices dynamically
- Show "Save 17%" label next to annual prices

**Comparison Table (Optional):**
- Below pricing cards
- Detailed feature-by-feature comparison
- Rows: Features, Columns: Free, Premium, Unlimited
- Use checkmarks (✓) and X marks (✗) for clarity

---

**Profile Badges:**

**Visual Indicators on Profiles:**

**Free Users:**
- No badge

**Premium Users:**
- Display "Pro" badge next to username
- Badge style: Small pill/tag shape, subtle color (e.g., blue or purple)
- Placement: Next to name in profile header, next to name in feed posts, next to name in search results

**Unlimited Users:**
- Display "Unlimited" badge next to username
- Badge style: Small pill/tag shape, premium color (e.g., gold, gradient)
- Placement: Same as Pro badge
- Should visually stand out more than Pro badge (premium tier)

**Implementation:**
- Component: `<UserBadge tier={user.subscription_tier} />`
- Conditional rendering based on tier
- Should appear consistently across: Profile page, Feed posts, Search results, Discover page, Collaboration suggestions

---

**Featured Indicator:**

**When User is Currently Featured:**
- Display "Featured" badge/banner on their profile
- Prominent placement (e.g., corner banner, or below profile picture)
- Time-limited: Only show during their 24-48 hour featured period
- Style: Eye-catching (animated gradient, glow effect, etc.)

**Discover Page Featured Section:**
- Section titled "Featured Artists" or "Featured Creators"
- Carousel or grid of currently featured users
- Rotates weekly/daily
- Click → Navigate to artist profile

---

**Upload Page/Modal:**

**Display Upload Counter:**
- Location: Top of upload page/modal
- Free: "2 of 3 uploads used"
- Premium: "5 of 7 uploads this month • Resets on Dec 20"
- Unlimited: "Unlimited uploads" (or hide counter)

**Progress Bar (Optional):**
- Visual bar showing uploads used
- Changes color when close to limit (e.g., yellow at 80%, red at 100%)

**When Limit Reached:**
- Disable upload button
- Show upgrade prompt/modal (see Upload Limit Enforcement section)

---

**Settings/Account Page:**

**Subscription Section:**
- Display current tier: "Your Plan: Premium" (with badge)
- Display billing: "£6.99/month • Renews on Jan 15, 2026"
- Buttons:
  - "Change Plan" → Redirects to pricing page with current tier highlighted
  - "Cancel Subscription" → Shows cancellation flow
  - "Update Payment Method" → Payment settings

**Custom Username Field (Premium/Unlimited only):**
- Only visible if tier is Premium or Unlimited
- Text input with validation (3-30 chars, alphanumeric + hyphens)
- Check availability in real-time
- Show current URL preview: `soundbridge.live/your-username`
- Note: "Can be changed once every 90 days"

**For Free Users:**
- Show locked "Custom URL" section
- Message: "Upgrade to Premium to get a custom profile URL"
- "Upgrade" button

---

**Analytics Page:**

**For Free Users:**
- Show basic stats cards:
  - Total Streams
  - Total Tips Received
  - Followers/Connections
  - Profile Views (last 30 days)
- Below stats: "Upgrade Card"
  - Title: "Unlock Advanced Analytics"
  - Description: "See detailed demographics, geographic data, listening behavior, and more."
  - Button: "Upgrade to Premium"

**For Premium/Unlimited Users:**
- Show all advanced analytics:
  - Basic stats (above)
  - Demographics charts (age, gender)
  - Geographic map (listeners by location)
  - Listening behavior graphs (peak times, completion rate)
  - Engagement metrics (conversions, growth)
  - Referral sources
  - Trend graphs (time series)
- Export button: "Download Report (CSV/PDF)"

---

**Feed/Post Creation:**

**Audio Clip Length:**
- When attaching audio to post:
  - Free: Enforce 30-second max (trim/reject if longer)
  - Premium/Unlimited: Enforce 60-second max
- UI: Show max length in interface
  - Free: "Attach audio clip (max 30 seconds)"
  - Premium/Unlimited: "Attach audio clip (max 60 seconds)"

---

**Discover Page Featured Section:**

**Featured Artists/Creators Section:**
- Location: Top of Discover page (above trending, recent music, etc.)
- Layout: Horizontal scrollable carousel or grid
- Shows: Currently featured users (those in their 24-48 hour featured window)
- Each card displays:
  - Profile picture
  - Name + badge (Pro/Unlimited)
  - "Featured" banner/badge
  - Genre tags
  - CTA: "View Profile"
- Auto-rotates/refreshes based on featuring schedule

---

**Navigation/Menu:**

**Pricing Link:**
- Add "Pricing" or "Upgrade" link to main navigation (header or sidebar)
- Visible to all users
- For Free users: Prominent placement, CTA styling
- For Premium users: Standard link
- For Unlimited users: Can hide or keep for downgrades

**Account/Settings:**
- Add "Subscription" or "Manage Plan" menu item in user dropdown/settings

---

**Upgrade Prompts/CTAs:**

**Strategic Placement:**

Place upgrade prompts throughout the app when Free users encounter Premium features:

**1. Upload Limit Reached:**
- Modal when attempting 4th upload (Free) or 8th upload (Premium)
- "Upgrade to upload more"

**2. Analytics Page:**
- "Unlock Advanced Analytics" card (as described above)

**3. Custom URL Setting:**
- Locked field with "Upgrade to Premium for custom URL"

**4. 60-Second Audio:**
- When attempting to attach >30-second clip (Free)
- "Upgrade to Premium for 60-second audio previews"

**5. Featured Placement:**
- Dashboard notification: "Want to get featured? Upgrade to Premium"

**6. Collaboration Matches:**
- Sidebar/notification: "Unlock weekly collaboration matches with Premium"

**Design Consistency:**
- All upgrade prompts should have consistent styling
- Clear value proposition (what they get)
- Single CTA: "View Plans" or "Upgrade Now"
- Not intrusive (dismissible, not blocking critical workflows)

---

### **5. Backend/Database Changes**

**Database Schema Updates:**

**Users Table:**
Add/update the following columns:

- `subscription_tier` (string/enum): "free" | "premium" | "unlimited"
- `subscription_period` (string/enum): "monthly" | "annual" | null
- `subscription_status` (string/enum): "active" | "cancelled" | "expired" | "trial" | null
- `subscription_start_date` (datetime): When current subscription period started
- `subscription_renewal_date` (datetime): When subscription renews or expires
- `subscription_cancel_date` (datetime, nullable): When user requested cancellation
- `uploads_this_period` (integer): Number of tracks uploaded in current billing period
- `upload_period_start` (datetime): Start date of current upload counting period
- `custom_username` (string, nullable, unique): Custom URL slug (e.g., "john-doe")
- `featured_this_month` (boolean): Whether user has been featured this calendar month
- `last_featured_date` (datetime, nullable): Last time user was featured
- `next_featured_date` (datetime, nullable): Scheduled next featuring date

**Create Indexes:**
- Index on `subscription_tier` (for filtering/queries)
- Index on `subscription_status` (for filtering active subscriptions)
- Unique index on `custom_username` (ensure no duplicates)
- Index on `featured_this_month` and `last_featured_date` (for featuring algorithm)

---

**Subscription Sync:**

**RevenueCat/Stripe Webhooks:**

Justice will configure RevenueCat/Stripe separately, but the application must handle incoming subscription events:

**Events to Handle:**

1. **Subscription Started/Purchased:**
   - Update user record:
     - `subscription_tier` = "premium" or "unlimited"
     - `subscription_period` = "monthly" or "annual"
     - `subscription_status` = "active"
     - `subscription_start_date` = now
     - `subscription_renewal_date` = calculated based on period
     - `upload_period_start` = now
     - `uploads_this_period` = 0 (reset)
   - Send confirmation email (optional)

2. **Subscription Renewed:**
   - Update user record:
     - `subscription_renewal_date` = new renewal date
     - `upload_period_start` = now
     - `uploads_this_period` = 0 (reset monthly counter for Premium users)
   - Send renewal confirmation email (optional)

3. **Subscription Cancelled:**
   - Update user record:
     - `subscription_status` = "cancelled"
     - `subscription_cancel_date` = now
     - Leave tier and benefits active until `subscription_renewal_date`
   - Send cancellation confirmation email

4. **Subscription Expired:**
   - When `subscription_renewal_date` passes and no renewal:
   - Update user record:
     - `subscription_tier` = "free"
     - `subscription_status` = "expired"
     - `subscription_period` = null
     - `custom_username` = null (remove custom URL, revert to default)
   - Send expiration notification email

5. **Payment Failed:**
   - Update user record:
     - `subscription_status` = "past_due" or similar
   - Send payment failure notification
   - Grace period: 7 days to update payment
   - After grace period → Treat as expired

6. **Tier Upgraded/Downgraded:**
   - User switches from Premium to Unlimited (or vice versa)
   - Update user record:
     - `subscription_tier` = new tier
     - Prorate/handle billing on RevenueCat/Stripe side
     - Reset `uploads_this_period` if changing to Unlimited
   - Send upgrade confirmation email

**Webhook Endpoint:**
- Create `/webhooks/subscription` endpoint (or similar)
- Validate webhook signature (RevenueCat/Stripe provides this)
- Parse event data
- Update user record accordingly
- Return 200 OK to acknowledge receipt

**Note:** RevenueCat and Stripe both provide webhook libraries/SDKs. Use those for validation and parsing.

---

**Background Jobs/Cron Tasks:**

**1. Upload Period Reset (for Premium users):**
- **Frequency:** Daily (e.g., 12:00 AM UTC)
- **Logic:**
  - Query all users where:
    - `subscription_tier` = "premium"
    - `subscription_status` = "active"
    - `subscription_renewal_date` <= now (renewal date has passed)
  - For each user:
    - Reset `uploads_this_period` = 0
    - Update `upload_period_start` = now
    - Update `subscription_renewal_date` = next renewal date (add 30/31 days or 1 year)

**2. Featured Artist Rotation:**
- **Frequency:** Daily (e.g., 6:00 AM UTC)
- **Logic:**
  - Query Premium users who haven't been featured this month:
    - `subscription_tier` = "premium"
    - `subscription_status` = "active"
    - `featured_this_month` = false
  - Query Unlimited users who need second featuring this month:
    - `subscription_tier` = "unlimited"
    - `subscription_status` = "active"
    - Count of times featured this month < 2
  - Select 5-10 users randomly (or based on fairness algorithm)
  - Update selected users:
    - `featured_this_month` = true (or increment counter for Unlimited)
    - `last_featured_date` = now
  - Featured duration: 24-48 hours
  - After duration: Remove from "Featured" section (automatic based on `last_featured_date`)

**3. Monthly Featured Counter Reset:**
- **Frequency:** Monthly (e.g., 1st of each month, 12:00 AM UTC)
- **Logic:**
  - Query all users where:
    - `subscription_tier` IN ("premium", "unlimited")
  - For each user:
    - Reset `featured_this_month` = false
    - (Allows fresh rotation each month)

**4. Collaboration Matching (Weekly):**
- **Frequency:** Weekly (e.g., Monday 9:00 AM UTC)
- **Logic:**
  - Query Premium/Unlimited users:
    - `subscription_tier` IN ("premium", "unlimited")
    - `subscription_status` = "active"
  - For each user:
    - Run matching algorithm:
      - Find artists/producers/venues with:
        - Similar genres
        - Same/nearby location
        - Active in last 30 days
        - Not already connected
      - Select top 3-5 matches
    - Create in-app notification with matches
    - Send email notification (if user has email notifications enabled)

**5. Expired Subscription Check:**
- **Frequency:** Daily (e.g., 1:00 AM UTC)
- **Logic:**
  - Query users where:
    - `subscription_status` = "active" or "cancelled"
    - `subscription_renewal_date` <= now (date has passed)
    - No recent renewal event from webhook (double-check payment)
  - For each user:
    - Update `subscription_status` = "expired"
    - Update `subscription_tier` = "free"
    - Remove tier-specific features (`custom_username` = null, etc.)
    - Send expiration notification email

---

**API Endpoints (if applicable):**

If the application has a REST API, create/update these endpoints:

**GET /api/subscription/status**
- Returns current user's subscription details
- Response:
  ```json
  {
    "tier": "premium",
    "period": "monthly",
    "status": "active",
    "renewal_date": "2026-01-15T00:00:00Z",
    "uploads_remaining": 2,
    "uploads_reset_date": "2026-01-15T00:00:00Z"
  }
  ```

**GET /api/subscription/plans**
- Returns available subscription plans with pricing
- Response:
  ```json
  {
    "plans": [
      {
        "id": "free",
        "name": "Free",
        "price_monthly": 0,
        "price_annual": 0,
        "features": ["3 uploads", "Basic profile", ...]
      },
      {
        "id": "premium_monthly",
        "name": "Premium",
        "price_monthly": 5.99,
        "price_annual": null,
        "features": ["7 uploads/month", "Featured 1x", ...]
      },
      {
        "id": "premium_annual",
        "name": "Premium",
        "price_monthly": null,
        "price_annual": 59.66,
        "features": ["7 uploads/month", "Featured 1x", ...]
      },
      ...
    ]
  }
  ```

**POST /api/subscription/custom-username**
- Sets or updates custom username (Premium/Unlimited only)
- Request:
  ```json
  {
    "username": "john-doe"
  }
  ```
- Validation:
  - Check if tier is Premium or Unlimited
  - Check if username is available (not taken)
  - Check if user can change (hasn't changed in last 90 days)
  - 3-30 characters, alphanumeric + hyphens
- Response: Success or error

**POST /webhooks/subscription**
- Receives subscription events from RevenueCat/Stripe
- Validates webhook signature
- Updates user subscription status
- Returns 200 OK

---

### **6. Analytics Implementation**

**Advanced Analytics (Premium/Unlimited only):**

**Data Collection:**

Already being tracked (presumably), but ensure the following events are logged:

- **Stream events:**
  - User ID (listener)
  - Track ID
  - Artist ID (track owner)
  - Timestamp
  - Duration played
  - Completion (boolean: listened >30 seconds)
  - IP address (for geographic data, anonymize after processing)
  - User agent (for device type)
  - Referrer (how they found the track: search, feed, discover, direct link)

- **Tip events:**
  - Tipper user ID
  - Artist user ID
  - Amount
  - Timestamp

- **Profile view events:**
  - Viewer user ID (if logged in) or session ID
  - Profile owner user ID
  - Timestamp

- **Follower events:**
  - Follower user ID
  - Followed user ID
  - Timestamp (when followed)

- **Post engagement events:**
  - Post ID
  - Reaction type (support, love, fire, congrats)
  - Comment (boolean)
  - Share (boolean)
  - User ID (engager)
  - Timestamp

**Analytics Calculations:**

For Premium/Unlimited users, calculate and display:

**Demographics:**
- From user profiles of listeners (if age/gender data available)
- Age breakdown: % in each age range
- Gender breakdown: % male/female/other/prefer not to say
- If data not available: Show "Data not available - listeners haven't provided demographics"

**Geographic Data:**
- Parse IP addresses from stream events (use GeoIP library)
- Aggregate by country, city
- Display on map (use Mapbox, Google Maps, or similar)
- Top 10 countries/cities by stream count

**Listening Behavior:**
- Peak listening times:
  - Group streams by hour of day (0-23) and day of week (Mon-Sun)
  - Heatmap or bar chart showing most popular times
- Average listen duration: Average `duration_played` across all streams
- Skip rate: % of streams with `completion` = false
- Completion rate: % of streams with `completion` = true

**Engagement Metrics:**
- Streams-to-tips conversion: (Total tips / Total streams) × 100
- Profile-to-follower conversion: (Total followers / Total profile views) × 100
- Post engagement rate: (Total reactions + comments + shares) / Total post views × 100

**Referral Sources:**
- Aggregate by `referrer` field in stream events
- Chart showing % from: Search, Feed, Discover, Events, Direct Link, External (social media)

**Trend Graphs:**
- Streams over time: Line chart, daily/weekly/monthly aggregation
- Tips over time: Line chart
- Follower growth: Line chart

**Export:**
- Generate CSV or PDF with all analytics data
- Include charts/graphs in PDF

**UI Display:**
- Dashboard with cards/widgets for each metric
- Interactive charts (use Chart.js, Recharts, or similar)
- Date range selector (last 7 days, 30 days, 90 days, all time)

---

### **7. Mobile-Specific Considerations**

**Note to Mobile Team:**

The following applies specifically to iOS and Android implementations:

**In-App Purchase SKUs:**

Justice will configure these in App Store Connect and Google Play Console. Reference these SKU IDs in the app:

**Expected SKU Format (adjust if Justice uses different naming):**
- `soundbridge_premium_monthly`
- `soundbridge_premium_annual`
- `soundbridge_unlimited_monthly`
- `soundbridge_unlimited_annual`

**RevenueCat Integration:**
- Use RevenueCat SDK for subscription management (already integrated, presumably)
- Update entitlements/offerings to match new tier structure
- Test purchase flows thoroughly (sandbox mode)

**Subscription Management:**
- "Manage Subscription" button should deep-link to:
  - iOS: App Store subscriptions page
  - Android: Google Play subscriptions page
- Use platform-specific APIs (`Linking.openURL` on React Native, or native equivalents)

**Restore Purchases:**
- Implement "Restore Purchases" button in subscription settings
- Critical for users who reinstall app or switch devices
- Calls RevenueCat's restore function

**Subscription Status Check:**
- On app launch, check subscription status with RevenueCat
- Update local state to match server truth
- Handle edge cases (expired, cancelled, payment failed)

**Offline Mode:**
- Cache user's subscription tier locally
- Allow basic app usage offline
- Sync tier changes when back online
- Don't allow uploads offline (prevent exceeding limits)

**Push Notifications:**
- Send notifications for:
  - Subscription renewal reminder (3 days before)
  - Upload limit almost reached (e.g., "6 of 7 uploads used")
  - Upload limit reset ("You have 7 new uploads this month")
  - Featured this month ("You're featured on Discover today!")
  - Collaboration match ("We found 5 producers for you")
  - Payment failed
  - Subscription expired

**App Store Compliance:**
- Follow Apple/Google guidelines for in-app subscriptions
- Display terms clearly
- Include "Cancel anytime" messaging
- Show pricing in local currency
- Comply with auto-renewal regulations

**Testing:**
- Test all subscription flows in sandbox/test mode
- Test upgrades, downgrades, cancellations
- Test expiration and renewal
- Test restore purchases
- Test upload limits (Free: 3, Premium: 7/month, Unlimited: no limit)

---

### **8. Email Notifications**

**Subscription-Related Emails:**

Implement transactional emails for subscription events:

**1. Welcome Email (New Subscription):**
- Trigger: User subscribes to Premium or Unlimited
- Subject: "Welcome to SoundBridge [Premium/Unlimited]! 🎵"
- Content:
  - Thank you message
  - Summary of benefits
  - Quick start guide (how to upload, set custom URL, etc.)
  - Support contact
- CTA: "Upload Your First Track" or "Customize Your Profile"

**2. Renewal Confirmation:**
- Trigger: Subscription successfully renewed
- Subject: "Your SoundBridge [Premium/Unlimited] subscription renewed"
- Content:
  - Confirmation of renewal
  - Amount charged
  - Next renewal date
  - Receipt/invoice (link or attachment)

**3. Cancellation Confirmation:**
- Trigger: User cancels subscription
- Subject: "Your SoundBridge subscription has been cancelled"
- Content:
  - Confirmation that subscription is cancelled
  - Access continues until [renewal_date]
  - What happens after expiration (revert to Free)
  - Invitation to resubscribe anytime
- CTA: "Reactivate Subscription" (if they change their mind)

**4. Expiration Warning:**
- Trigger: 7 days before subscription expires (cancelled or payment failed)
- Subject: "Your SoundBridge [Premium/Unlimited] expires in 7 days"
- Content:
  - Reminder that subscription is ending
  - What they'll lose (uploads, analytics, etc.)
  - Invitation to renew
- CTA: "Renew Subscription"

**5. Expiration Notice:**
- Trigger: Subscription has expired, tier reverted to Free
- Subject: "Your SoundBridge subscription has expired"
- Content:
  - Confirmation that subscription ended
  - Now on Free tier
  - Summary of what they can still do
  - Invitation to resubscribe
- CTA: "Upgrade Again"

**6. Payment Failed:**
- Trigger: Payment method declined/failed
- Subject: "Payment failed for your SoundBridge subscription"
- Content:
  - Payment couldn't be processed
  - Request to update payment method
  - Grace period (7 days)
  - What happens if not resolved (expiration)
- CTA: "Update Payment Method"

**7. Upload Limit Reminder (Premium):**
- Trigger: User has used 6 of 7 uploads (near limit)
- Subject: "You're almost at your monthly upload limit"
- Content:
  - "You've uploaded 6 of 7 tracks this month"
  - Limit resets on [date]
  - Option to upgrade to Unlimited
- CTA: "Upgrade to Unlimited" (optional)

**8. Upload Limit Reset (Premium):**
- Trigger: Monthly upload limit reset (renewal date)
- Subject: "Your upload limit has reset! 🎵"
- Content:
  - "You have 7 new uploads available this month"
  - Invitation to upload new music
- CTA: "Upload Now"

**9. Featured Notification:**
- Trigger: User is featured on Discover page
- Subject: "You're featured on SoundBridge today! 🌟"
- Content:
  - Congratulations on being featured
  - How long feature lasts (24-48 hours)
  - Encouragement to share with fans
  - Link to profile
- CTA: "View Your Profile"

**10. Collaboration Matches (Weekly):**
- Trigger: Weekly collaboration matching job runs
- Subject: "We found [X] collaboration opportunities for you"
- Content:
  - List of 3-5 suggested connections:
    - Name, role, location, genre
    - Reason for match ("Both create Gospel music in London")
    - Link to profile
- CTA: "View Matches" (links to in-app page)

**Email Best Practices:**
- Plain text + HTML versions
- Mobile-responsive design
- Unsubscribe link (legally required, GDPR/CAN-SPAM)
- Clear sender ("SoundBridge" or "SoundBridge Team")
- Reply-to address (support@soundbridge.live)
- Brand consistent (logo, colors)
- Test emails before sending (use test email service)

---

### **9. Testing Requirements**

**Test Cases (Manual or Automated):**

**Subscription Flow:**
- ✅ Free user can browse pricing page
- ✅ Free user can subscribe to Premium (monthly)
- ✅ Free user can subscribe to Premium (annual)
- ✅ Free user can subscribe to Unlimited (monthly)
- ✅ Free user can subscribe to Unlimited (annual)
- ✅ Premium user can upgrade to Unlimited
- ✅ Unlimited user can downgrade to Premium (takes effect at end of period)
- ✅ User can cancel subscription
- ✅ Cancelled subscription continues until renewal date, then reverts to Free
- ✅ Expired subscription reverts to Free tier
- ✅ Payment failed triggers grace period and notifications

**Upload Limits:**
- ✅ Free user can upload 3 tracks, blocked at 4th
- ✅ Premium user can upload 7 tracks/month, blocked at 8th
- ✅ Premium upload counter resets monthly on renewal date
- ✅ Unlimited user can upload unlimited tracks (no blocks)
- ✅ Upload counter displays correctly (Free: "2 of 3", Premium: "5 of 7", Unlimited: "Unlimited")

**Feature Access:**
- ✅ Free user sees basic analytics only
- ✅ Premium user sees advanced analytics
- ✅ Unlimited user sees advanced analytics
- ✅ Free user cannot set custom username (field hidden or disabled)
- ✅ Premium user can set custom username (validates, updates URL)
- ✅ Unlimited user can set custom username
- ✅ Custom username validation works (availability check, character limits, alphanumeric + hyphens)
- ✅ Free user's audio posts limited to 30 seconds
- ✅ Premium user's audio posts limited to 60 seconds
- ✅ Unlimited user's audio posts limited to 60 seconds

**Badges:**
- ✅ Free user has no badge
- ✅ Premium user has "Pro" badge on profile, posts, search results
- ✅ Unlimited user has "Unlimited" badge (visually distinct from Pro)
- ✅ Featured users show "Featured" badge during featured period (24-48 hours)

**Featured Placement:**
- ✅ Premium users featured 1x/month (automatic rotation)
- ✅ Unlimited users featured 2x/month (automatic rotation)
- ✅ Featured users appear in "Featured Artists" section on Discover page
- ✅ Featured indicator appears on user's profile during featured period
- ✅ Featured counter resets monthly (all users eligible again)

**Collaboration Matching:**
- ✅ Premium users receive weekly collaboration matches (3-5 suggestions)
- ✅ Unlimited users receive weekly collaboration matches
- ✅ Free users do NOT receive collaboration matches
- ✅ Matches appear as in-app notification + email (if enabled)
- ✅ Matching algorithm considers: genre, location, activity, mutual connections

**Feed Priority:**
- ✅ Unlimited user posts appear higher in Feed than Premium/Free
- ✅ Premium user posts appear higher in Feed than Free
- ✅ Free user posts appear in normal ranking

**Upgrade Prompts:**
- ✅ Free user sees upgrade prompt when hitting upload limit (3 tracks)
- ✅ Premium user sees upgrade prompt when hitting upload limit (7 tracks)
- ✅ Free user sees "Unlock Advanced Analytics" card on analytics page
- ✅ Free user sees upgrade prompt when attempting to set custom username
- ✅ Free user sees upgrade prompt when attempting >30-second audio post
- ✅ All prompts lead to pricing page

**Edge Cases:**
- ✅ User subscribes on 31st of month (renewal date handled correctly for 30-day months)
- ✅ User changes timezone (subscription dates remain correct in UTC)
- ✅ User deletes account while subscribed (subscription cancelled, refund if applicable)
- ✅ User has 2 active subscriptions (shouldn't happen - prevent or handle gracefully)
- ✅ Webhook fails to deliver (retry logic or manual sync available)
- ✅ User restores purchase on new device (tier syncs correctly)

**Mobile-Specific:**
- ✅ In-app purchase flow works on iOS (sandbox and production)
- ✅ In-app purchase flow works on Android (sandbox and production)
- ✅ Restore purchases works (syncs tier from RevenueCat)
- ✅ Subscription management deep-links to App Store/Play Store
- ✅ Offline mode caches tier correctly (syncs when back online)
- ✅ Push notifications send correctly (renewal, limits, featured, etc.)

---

### **10. Launch Pricing (Clean Start)**

**Important Note:** This is a pre-launch pricing restructure. No existing paid subscribers exist (only sandbox testing). This allows for a clean implementation without legacy pricing logic.

**New Pricing Structure (Launching Publicly):**

**Three Tiers:**
1. **FREE** - 3 tracks lifetime, basic features
2. **PREMIUM** - £6.99/month or £69/year (17% discount)
3. **UNLIMITED** - £12.99/month or £129/year (17% discount)

**No Legacy Pricing:**
- Old £9.99/month tier is being retired completely
- No grandfathering needed (no existing subscribers)
- No migration logic required
- Clean codebase with single pricing model
- All future users subscribe at new pricing

**Sandbox/Test Account Cleanup:**
- Delete any existing sandbox subscriptions at old pricing
- Remove old £9.99 products from Stripe/RevenueCat
- Create fresh products at new pricing (£6.99/£12.99)
- Re-test subscription flows with new pricing

**Benefits of Clean Start:**
- ✅ Simpler implementation (no legacy flags or special cases)
- ✅ Easier to maintain (single pricing model)
- ✅ Clearer documentation (no exceptions to explain)
- ✅ Better for future scaling (no technical debt)
- ✅ Easier accounting and financial projections

**Database Schema (Simplified):**
No need for legacy-related fields:
- ❌ No `is_legacy_plan` field needed
- ❌ No `legacy_price` field needed
- ❌ No migration tracking fields
- ✅ Just clean tier implementation: "free" | "premium" | "unlimited"

**Implementation:**
All users are new users. Simply implement three tiers with current pricing. No special cases.

---

### **11. Analytics & Monitoring**

**Track Subscription Metrics:**

Implement analytics dashboard (internal, admin-only) to monitor:

**Key Metrics:**
- Total users by tier (Free, Premium, Unlimited)
- New subscriptions this week/month (Premium, Unlimited)
- Cancellations this week/month
- Churn rate (cancellations / active subscriptions)
- Revenue (MRR - Monthly Recurring Revenue, ARR - Annual)
- Conversion rate (Free → Premium, Free → Unlimited, Premium → Unlimited)
- Average uploads per user (by tier)
- Upload limit hit rate (% of Premium users hitting 7/month)
- Featured artist rotation (# featured per month, fairness distribution)
- Collaboration match acceptance rate (% who connect with suggested matches)

**Dashboards:**
- Real-time subscription count (by tier)
- Revenue graphs (daily, weekly, monthly)
- Churn analysis (when/why users cancel)
- Feature usage (analytics views, custom URL adoption, etc.)

**Alerts:**
- High churn rate (> X%)
- Payment failure spike
- Low conversion rate (Free → Paid < Y%)

**Tools:**
- Use existing analytics platform (Mixpanel, Amplitude, Google Analytics, etc.)
- Or build custom admin dashboard

---

### **12. Support & Documentation**

**Help Center Updates:**

Create or update help articles:

**Articles Needed:**
1. "What are the different subscription tiers?" (comparison table)
2. "How do I upgrade to Premium or Unlimited?"
3. "How do upload limits work?" (Free: 3 lifetime, Premium: 7/month, Unlimited: no limit)
4. "How do I cancel my subscription?"
5. "What happens when I cancel?" (access until renewal, then revert to Free)
6. "How do I set a custom profile URL?" (Premium/Unlimited only)
7. "What is advanced analytics?" (feature explanation with screenshots)
8. "How does the featured placement work?" (Premium: 1x/month, Unlimited: 2x/month)
9. "How do collaboration matches work?" (weekly suggestions, algorithm explanation)
10. "How do I change my payment method?"
11. "How do I download an invoice/receipt?"
12. "Can I switch from monthly to annual (or vice versa)?"
13. "What is the refund policy?" (link to terms of service)

**In-App Help:**
- Add "?" icon or "Learn More" links next to tier-specific features
- Links to relevant help articles
- Tooltips explaining features (e.g., hover over "Featured 1x/month" → "You'll be automatically featured on Discover page once per month")

**Support Ticket System:**
- Tag tickets by user tier (Free, Premium, Unlimited)
- Route Premium/Unlimited to priority queue (faster response)
- Train support team on new pricing, features, troubleshooting

---

### **13. Legal & Compliance**

**Terms of Service Updates:**

Update Terms of Service to reflect new pricing:

**Sections to Update:**
- Subscription pricing and tiers
- Upload limits by tier
- Auto-renewal terms (monthly/annual)
- Cancellation policy (access until renewal, then revert to Free)
- Refund policy (if applicable)
- Feature availability by tier

**Privacy Policy:**

Ensure privacy policy covers:
- Collection of analytics data (for Premium/Unlimited advanced analytics)
- Use of IP addresses for geographic analytics (anonymized after processing)
- Data retention policies

**GDPR/Data Protection:**
- Users can request data export (including analytics)
- Users can request account deletion (and subscription cancellation)
- Email opt-out for promotional emails (transactional emails still sent)

**App Store/Play Store Compliance:**
- Submit updated app metadata (pricing changes)
- Comply with auto-renewable subscription regulations (Apple, Google)
- Include required disclosures ("Subscriptions auto-renew unless cancelled")

---

### **14. Timeline & Rollout Plan**

**Recommended Rollout:**

**Phase 1: Backend & Database (Week 1-2)**
- Implement database schema changes
- Set up subscription sync (webhooks)
- Implement upload limit enforcement logic
- Implement feature access control (tier checks)
- Deploy to staging environment
- QA testing

**Phase 2: UI/UX (Week 2-3)**
- Update pricing page (new tiers, monthly/annual toggle)
- Add tier badges (Pro, Unlimited, Featured)
- Update upload page (counter, limits, prompts)
- Update analytics page (basic vs advanced)
- Update settings page (subscription management, custom URL)
- Implement upgrade prompts throughout app
- Deploy to staging, QA testing

**Phase 3: Background Jobs (Week 3)**
- Implement upload period reset job (daily)
- Implement featured artist rotation job (daily)
- Implement collaboration matching job (weekly)
- Implement subscription expiration check (daily)
- Test jobs thoroughly in staging

**Phase 4: Email Notifications (Week 3-4)**
- Implement subscription emails (welcome, renewal, cancellation, etc.)
- Test email delivery in staging
- Verify template rendering (plain text + HTML)

**Phase 5: Mobile Updates (Week 4)**
- Mobile team implements tier changes
- Update RevenueCat offerings
- Test in-app purchases (sandbox)
- Submit to App Store/Play Store for review

**Phase 6: Soft Launch (Week 5)**
- Deploy to production (backend + web)
- Migrate existing Premium users (grandfather or force migration)
- Monitor closely for bugs/issues
- Limit marketing (no big announcement yet)
- Fix any critical issues

**Phase 7: Full Launch (Week 6)**
- Mobile apps approved and live (iOS, Android)
- Announce new pricing publicly (blog post, email, social media)
- Marketing push (promote Premium/Unlimited benefits)
- Monitor metrics (conversions, churn, revenue)

**Phase 8: Optimization (Ongoing)**
- A/B test pricing page (headlines, CTAs, layout)
- Monitor analytics (which tier converts best?)
- Adjust featured rotation, collaboration matching based on feedback
- Iterate on upgrade prompts (optimize placement, copy)

---

## Summary for Development Teams

**What You Need to Do:**

1. **Update database schema** (add subscription fields to users table)
2. **Implement subscription sync** (handle RevenueCat/Stripe webhooks)
3. **Enforce upload limits** (Free: 3 lifetime, Premium: 7/month, Unlimited: unlimited)
4. **Gate features by tier** (analytics, custom URL, audio length, etc.)
5. **Update UI** (pricing page, badges, upload counter, analytics page, settings)
6. **Implement upgrade prompts** (when Free/Premium users hit limits or encounter locked features)
7. **Build background jobs** (upload reset, featured rotation, collaboration matching, expiration check)
8. **Send email notifications** (subscription events, limits, featured, matches)
9. **Update help documentation** (explain tiers, limits, features)
10. **Test thoroughly** (all subscription flows, limits, feature access, edge cases)
11. **Deploy in phases** (backend → web → mobile → launch)

**What Justice Will Handle:**

- App Store and Play Store console updates (pricing, metadata)
- RevenueCat configuration (offerings, entitlements)
- Stripe subscription product setup
- Marketing and announcements

**Questions?**

If any part of this specification is unclear, reach out to Justice for clarification before implementing.

**Let's build this! 🚀**
