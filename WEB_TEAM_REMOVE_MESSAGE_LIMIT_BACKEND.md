# Action Required: Remove Message Limit Check from Backend
**Date:** 2026-03-29
**Priority:** High — blocks users from sending messages

---

## The Problem

Users see a modal saying **"Message Limit Reached (0 per month)"** when trying to send messages in the mobile app. The message body reads:

> "You've reached your message limit (0 per month). Upgrade to Premium for unlimited messaging."

## Mobile Status: ✅ Already Clean

The mobile app has **no message limit check** in ChatScreen, MessagesScreen, or any messaging service. The only place this text existed was in a dead utility method (`SubscriptionService.canSendMessage`) which was never called from any screen — and has now been deleted.

**The modal is being triggered by the backend** — either a database trigger on the `messages` table, or API middleware checking message limits, or an edge function.

## What to Check on the Backend

1. **Database triggers** — Look for any trigger on the `messages` table (e.g., `check_message_limit` or similar) that raises an exception with the message limit text. Drop it.

2. **API middleware** — If there's any middleware on `/api/messages` that checks a `messages_used` counter against a `messages_limit` for the user's tier, remove it or set the limit to unlimited for all tiers.

3. **`/api/user/usage-limits` endpoint** — This endpoint is returning `messages.limit = 0` and `messages.is_unlimited = false` for users. Messaging should be **unlimited for all tiers** — update this endpoint to always return `messages.is_unlimited: true`.

4. **Supabase RLS policies** — Check if there's an RLS INSERT policy on `messages` that evaluates a message count and blocks inserts.

## Decision: Messaging is Unlimited for All Users

Messaging is a core social feature — it should not be limited by subscription tier. Please:
- Remove any message limit checks from the database (triggers, RLS policies)
- Update `/api/user/usage-limits` to return `messages.is_unlimited: true` for all tiers
- Remove any message count tracking logic if it exists solely for limit enforcement

— Mobile team
