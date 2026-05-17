# Web Team: Paid Events - Creator & Subscription Gating

## Status: IMPLEMENTATION REQUIRED

---

## Overview

We've implemented a new gating system for paid events on mobile. The web app needs to match this behavior to ensure consistency across platforms.

---

## Business Rules

### Who Can Create Events?

| User Type | Free Events | Paid Events |
|-----------|-------------|-------------|
| Non-creator (any subscription) | ✅ Yes | ❌ No |
| Creator (free/no subscription) | ✅ Yes | ❌ No |
| Creator (Premium/Unlimited) | ✅ Yes | ✅ Yes |

### Rule Summary

1. **Anyone can create FREE events** - No restrictions
2. **Only CREATORS can create PAID events** - Non-creators must switch to creator role first
3. **Only SUBSCRIBED creators can monetize** - Creators with free tier must upgrade to Premium/Unlimited

---

## User Flows

### Flow 1: Non-Creator Tries to Create Paid Event

```
User toggles "Paid Event" ON
    ↓
System checks: Is user.role === 'creator'?
    ↓
NO → Show "Become a Creator" modal
    ↓
User clicks "Become a Creator"
    ↓
System updates profiles.role = 'creator'
    ↓
Show success message + prompt to subscribe
```

**"Become a Creator" Modal Content:**

```
Title: Become a Creator

Subtitle: To host paid events, you need a creator account.
Becoming a creator is free!

Perks:
- Host paid events and keep 95% of ticket revenue
- Upload and sell your audio content
- Receive tips from fans
- Access creator analytics dashboard
- Professional networking tools
- Creator badge on your profile

Note: Becoming a creator is free. To monetize (sell tickets,
downloads, etc.), you'll need a subscription.

Buttons: [Maybe Later] [Become a Creator]
```

### Flow 2: Creator (Free Tier) Tries to Create Paid Event

```
User toggles "Paid Event" ON
    ↓
System checks: Is user.role === 'creator'?
    ↓
YES → System checks: Is subscription_tier in ('premium', 'unlimited')?
    ↓
NO → Show "Upgrade to Monetize" modal
    ↓
User clicks "View Plans"
    ↓
Navigate to subscription/pricing page
```

**"Upgrade to Monetize" Modal Content:**

```
Title: Upgrade to Monetize

Subtitle: You need a Premium or Unlimited subscription to host
paid events and access other monetization features.

Benefits:
- Host paid events (keep 95% of revenue)
- Sell audio downloads
- Extended upload limits
- Advanced analytics

Pricing hint: Starting from just $4.99/month
Cancel anytime. No commitment required.

Buttons: [Not Now] [View Plans]
```

### Flow 3: Subscribed Creator Creates Paid Event

```
User toggles "Paid Event" ON
    ↓
System checks: role === 'creator' AND subscription_tier in ('premium', 'unlimited')
    ↓
YES → Allow paid event creation
    ↓
Show pricing fields (ticket price, currency, etc.)
```

---

## Database Changes

### Role Update Endpoint

When user clicks "Become a Creator", update their profile:

```sql
UPDATE profiles
SET role = 'creator',
    updated_at = NOW()
WHERE id = :user_id;
```

### Checking User Eligibility

```sql
SELECT
  role,
  subscription_tier,
  CASE
    WHEN role = 'creator' AND subscription_tier IN ('premium', 'unlimited')
    THEN true
    ELSE false
  END as can_create_paid_events
FROM profiles
WHERE id = :user_id;
```

---

## API Considerations

### Event Creation Endpoint

The `POST /api/events` endpoint should validate:

```javascript
// Pseudo-code for backend validation
async function createEvent(req, res) {
  const { is_free, price_gbp, price_usd, ... } = req.body;
  const userId = req.user.id;

  // If event is paid, validate user can create paid events
  if (!is_free || price_gbp > 0 || price_usd > 0) {
    const user = await getProfile(userId);

    if (user.role !== 'creator') {
      return res.status(403).json({
        error: 'CREATOR_REQUIRED',
        message: 'You must be a creator to host paid events. Switch to a creator account first.'
      });
    }

    if (!['premium', 'unlimited'].includes(user.subscription_tier)) {
      return res.status(403).json({
        error: 'SUBSCRIPTION_REQUIRED',
        message: 'You need a Premium or Unlimited subscription to host paid events.'
      });
    }
  }

  // Proceed with event creation...
}
```

### Role Switch Endpoint

If not already available, create an endpoint to switch user role:

```
POST /api/user/become-creator

Response (success):
{
  "success": true,
  "message": "You are now a creator!",
  "user": {
    "id": "...",
    "role": "creator",
    "subscription_tier": "free"
  }
}
```

---

## UI Implementation

### Event Creation Form

Add visual indicator for users who can't create paid events:

```jsx
// When user can't create paid events, show a hint below the toggle
{isFreeEvent && !canCreatePaidEvents && (
  <div className="paid-event-hint" onClick={handlePaidEventClick}>
    <LockIcon />
    <span>
      {user.role !== 'creator'
        ? 'Become a creator to host paid events'
        : 'Upgrade to Premium to host paid events'}
    </span>
    <ChevronRightIcon />
  </div>
)}
```

### Toggle Behavior

```javascript
function handlePaidToggle(isPaid) {
  if (isPaid) {
    // Check if user can create paid events
    if (user.role !== 'creator') {
      showBecomeCreatorModal();
      return; // Don't toggle yet
    }

    if (!['premium', 'unlimited'].includes(user.subscription_tier)) {
      showUpgradeModal();
      return; // Don't toggle yet
    }
  }

  // User is eligible, proceed with toggle
  setIsPaidEvent(isPaid);
}
```

---

## Mobile Implementation Reference

We've implemented this on mobile with:

1. **[BecomeCreatorModal.tsx](src/components/BecomeCreatorModal.tsx)** - Modal prompting non-creators to switch
2. **[UpgradeForPaidEventsModal.tsx](src/components/UpgradeForPaidEventsModal.tsx)** - Modal prompting free creators to upgrade
3. **[CreateEventScreen.tsx](src/screens/CreateEventScreen.tsx)** - Event creation with gating logic

Key functions:
- `handleToggleFreeEvent()` - Checks role + subscription before allowing paid event
- `handleBecomeCreator()` - Calls `updateUserProfile({ role: 'creator' })`

---

## Why This Approach?

### 1. Maintains "Creator-First" Identity
- SoundBridge is for creators (musicians, podcasters, event promoters)
- Non-creators can attend events, tip, buy content - but to monetize, you become a creator
- This keeps the platform purpose clear

### 2. Two-Step Intent Filter
- Becoming a creator = "I'm serious about using this platform professionally"
- Subscribing = "I want to monetize my content/events"
- Reduces spam and low-quality paid events

### 3. Consistent with Audio Uploads
- Same rules as audio content: subscription required to sell
- Users already understand this model

### 4. Revenue Protection
- Subscriptions tied to monetization = sustainable revenue
- Prevents race-to-bottom (everyone subscribing just to host one event)

---

## Testing Checklist

- [ ] Non-creator tries to toggle "Paid Event" → Shows "Become a Creator" modal
- [ ] User clicks "Become a Creator" → Role updates to 'creator'
- [ ] Creator (free) tries to toggle "Paid Event" → Shows "Upgrade" modal
- [ ] User clicks "View Plans" → Navigates to subscription page
- [ ] Creator (Premium) toggles "Paid Event" → Allowed, shows pricing fields
- [ ] Creator (Unlimited) toggles "Paid Event" → Allowed, shows pricing fields
- [ ] Backend rejects paid event from non-creator with 403
- [ ] Backend rejects paid event from free creator with 403

---

## Priority

**MEDIUM** - This is a consistency/UX improvement. The mobile app has this implemented, web should match.

---

*Document created: January 18, 2026*
