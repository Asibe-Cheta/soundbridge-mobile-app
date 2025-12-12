# Claude: Automatic Subscription Status Polling After Payment

## Context

We've successfully rebuilt the payment system and it's working! However, there's one UX issue:

**Problem:** After successful payment, the user is redirected to the dashboard with `?success=true`, but the subscription status doesn't update immediately because:
1. Stripe webhook takes a few seconds to process
2. The dashboard shows "Upgrade Now" button until webhook completes
3. User has to manually refresh to see their Pro status

## Current Implementation

### Success Handling (Already Implemented)
```typescript
// apps/web/src/components/subscription/SubscriptionDashboard.tsx
useEffect(() => {
  const success = searchParams.get('success');
  if (success === 'true') {
    setShowSuccess(true);
    // Refresh subscription status after payment (give webhook time to process)
    setTimeout(() => {
      refresh();
    }, 2000);
    // Auto-hide success message after 5 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 5000);
  }
}, [searchParams, refresh]);
```

**Current behavior:**
- Shows success message
- Refreshes once after 2 seconds
- Hides message after 5 seconds

## Request

**Please provide a solution for automatic polling/refresh of subscription status after payment.**

### Requirements:

1. **Automatic Polling:**
   - When `?success=true` is detected, start polling subscription status
   - Poll every 2-3 seconds
   - Stop polling when subscription status changes to 'pro' or after max attempts (e.g., 30 seconds)

2. **User Experience:**
   - Show loading state while polling
   - Update UI immediately when subscription is detected
   - Hide "Upgrade Now" button as soon as Pro status is confirmed
   - Show success message until subscription is confirmed

3. **Implementation:**
   - Use the existing `useSubscription` hook's `refresh()` method
   - Clean up polling on component unmount
   - Handle edge cases (webhook fails, timeout, etc.)

4. **Code Format:**
   - Please provide the complete updated component code
   - Include proper TypeScript types
   - Include error handling
   - Make it production-ready

## Example Desired Behavior

```
User completes payment → Redirected to dashboard?success=true
↓
Show success message + "Checking subscription status..."
↓
Poll every 2 seconds:
  - Attempt 1: Still 'free' → Keep polling
  - Attempt 2: Still 'free' → Keep polling
  - Attempt 3: Now 'pro'! → Stop polling, update UI, hide "Upgrade Now"
↓
Success message stays visible for 5 seconds, then auto-hides
```

## Current Hook

```typescript
// apps/web/src/hooks/useSubscription.ts
export const useSubscription = (): SubscriptionHook => {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionData = async () => {
    // Fetches from /api/subscription/status
  };

  const refresh = async () => {
    await fetchSubscriptionData();
  };

  // ... rest of hook
};
```

## Questions

1. **What's the best polling interval?** (2 seconds? 3 seconds?)
2. **What's the maximum polling duration?** (30 seconds? 60 seconds?)
3. **Should we show a specific "Waiting for subscription to activate..." message?**
4. **What should happen if polling times out?** (Show error? Manual refresh button?)

## Request

Please provide:
1. **Updated `SubscriptionDashboard.tsx` component** with automatic polling
2. **Best practices** for polling intervals and timeouts
3. **Error handling** for edge cases
4. **Production-ready code** that can be copy-pasted

**Please format your answer as an artifact that can be copied and pasted directly.**

Thank you!
