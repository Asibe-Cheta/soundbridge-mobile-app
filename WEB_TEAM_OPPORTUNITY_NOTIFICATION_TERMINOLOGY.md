# Fix: Opportunity Notification Uses Wrong Terminology ("Creator" → "Provider")

## What's Happening

When a service provider accepts a project agreement, the push notification reads:

> **"Creator accepted"**
> "Creator accepted — your project 'Looking for a trumpeter' is now ac..."

The word "Creator" is wrong here. On SoundBridge, the service provider (the person doing the work) is not always a creator — they could be any musician, session player, producer, etc. The correct term is **"Provider"**.

## Strings to Update

| Location | Current | Correct |
|----------|---------|---------|
| Notification title | `Creator accepted` | `Provider accepted` |
| Notification body | `Creator accepted — your project "..." is now active` | `Provider accepted — your project "..." is now active` |
| Any other notification templates referencing the accepting party | `creator` | `provider` |

## Scope

Search your notifications service / template strings for any use of `"creator"` in the context of opportunity projects and replace with `"provider"`. This includes:
- Accept agreement notification
- Decline agreement notification (if it exists)
- Mark as delivered notification
- Any project status change notifications sent to the poster

The poster is always the "poster". The person doing the work is always the "provider". Neither should be called "creator" in this context.

## Priority

Low (cosmetic) — the flow works correctly, but the terminology is misleading.
