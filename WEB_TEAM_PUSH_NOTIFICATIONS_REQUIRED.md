# Push Notifications — Backend Requirements

**Date:** 2026-03-16
**For:** Web / Backend team
**From:** Mobile team

The mobile app is fully wired to receive and route push notifications. What we need from the backend is the server-side trigger that calls the **Expo Push API** when each event occurs.

---

## How to Send a Push Notification (Expo Push API)

```
POST https://exp.host/--/expo-push/v2/push/send
Content-Type: application/json

{
  "to": "<expo_push_token>",        // from profiles.expo_push_token
  "title": "Someone liked your post",
  "body": "Merit reacted ❤️ to your post",
  "data": {
    "type": "reaction",             // see type list below
    "postId": "abc-123",            // relevant entity ID
    "userId": "sender-user-id"      // who triggered the action
  },
  "channelId": "social",            // Android channel (see below)
  "priority": "high",
  "sound": "default"
}
```

Fetch `expo_push_token` from:
```sql
SELECT expo_push_token FROM profiles WHERE id = '<recipient_user_id>';
```

Only send if `expo_push_token IS NOT NULL`.

---

## Notification Types, Payloads & Triggers

### 1. Follow / New Follower
| Field | Value |
|-------|-------|
| `type` | `new_follower` |
| `channelId` | `social` |
| Trigger | User A follows User B → notify User B |
| `data` | `{ type: "new_follower", followerId: "<userA_id>", userId: "<userA_id>" }` |
| Title | `"New Follower"` |
| Body | `"<UserA displayName> started following you"` |

---

### 2. Post Reaction (Like / Emoji)
| Field | Value |
|-------|-------|
| `type` | `reaction` |
| `channelId` | `social` |
| Trigger | User A reacts to a post owned by User B → notify User B |
| `data` | `{ type: "reaction", postId: "<post_id>", userId: "<userA_id>" }` |
| Title | `"New Reaction"` |
| Body | `"<UserA displayName> reacted to your post"` |

> **Note:** Only notify if User A ≠ User B (don't notify users of their own reactions).

---

### 3. Post Comment
| Field | Value |
|-------|-------|
| `type` | `comment` |
| `channelId` | `social` |
| Trigger | User A comments on a post owned by User B → notify User B |
| `data` | `{ type: "comment", postId: "<post_id>", userId: "<userA_id>" }` |
| Title | `"New Comment"` |
| Body | `"<UserA displayName> commented on your post"` |

> **Optional:** Also notify other commenters on the same post (type `comment`, same payload). Throttle to max 1 notification per user per post per hour.

---

### 4. Direct Message
| Field | Value |
|-------|-------|
| `type` | `message` |
| `channelId` | `messages` |
| Trigger | User A sends a message to User B → notify User B |
| `data` | `{ type: "message", entityId: "<conversation_id>", userId: "<userA_id>" }` |
| Title | `"<UserA displayName>"` |
| Body | First 80 chars of message content |

> Use `priority: "high"` and `sound: "default"` for messages.

---

### 5. Opportunity Interest Expressed
| Field | Value |
|-------|-------|
| `type` | `opportunity_interest` |
| `channelId` | `opportunities` |
| Trigger | Creator expresses interest in an opportunity posted by User B → notify User B |
| `data` | `{ type: "opportunity_interest", opportunityId: "<opp_id>", userId: "<creator_id>" }` |
| Title | `"New Interest"` |
| Body | `"<Creator displayName> expressed interest in your opportunity"` |

---

### 6. Opportunity Agreement Received (Project Created)
| Field | Value |
|-------|-------|
| `type` | `opportunity_agreement_received` |
| `channelId` | `opportunities` |
| Trigger | Opportunity poster accepts a creator's interest → both parties notified; creator receives agreement |
| `data` | `{ type: "opportunity_agreement_received", projectId: "<project_id>", userId: "<poster_id>" }` |
| Title | `"Agreement Ready"` |
| Body | `"Review and sign the project agreement for <opportunity title>"` |

---

### 7. Urgent Gig — New Match (Provider Side)
| Field | Value |
|-------|-------|
| `type` | `urgent_gig` |
| `channelId` | `urgent_gigs` |
| Trigger | An urgent gig is posted and matches a provider by skill/location → notify matched providers |
| `data` | `{ type: "urgent_gig", gigId: "<gig_id>", userId: "<requester_id>" }` |
| Title | `"New Gig Nearby"` |
| Body | `"<GigTitle> — respond within <X mins>"` |

---

### 8. Urgent Gig — Provider Accepted (Requester Side)
| Field | Value |
|-------|-------|
| `type` | `gig_accepted` |
| `channelId` | `urgent_gigs` |
| Trigger | A provider accepts the urgent gig → notify requester |
| `data` | `{ type: "gig_accepted", gigId: "<gig_id>", userId: "<provider_id>" }` |
| Title | `"Provider Accepted"` |
| Body | `"<Provider displayName> accepted your gig request"` |

---

### 9. Urgent Gig — Requester Confirmed Provider (Provider Side)
| Field | Value |
|-------|-------|
| `type` | `gig_confirmed` |
| `channelId` | `urgent_gigs` |
| Trigger | Requester selects a provider from the applicants → notify that provider |
| `data` | `{ type: "gig_confirmed", gigId: "<gig_id>", userId: "<requester_id>" }` |
| Title | `"You Got the Gig!"` |
| Body | `"<Requester displayName> selected you for the gig"` |

---

### 10. Gig Starting Soon (Both Parties)
| Field | Value |
|-------|-------|
| `type` | `gig_starting_soon` |
| `channelId` | `urgent_gigs` |
| Trigger | 1 hour before gig scheduled start → notify both requester and provider |
| `data` | `{ type: "gig_starting_soon", gigId: "<gig_id>" }` |
| Title | `"Gig Starting Soon"` |
| Body | `"Your gig starts in 1 hour"` |

---

### 11. Gig Expired — No Provider Found (Requester Side)
| Field | Value |
|-------|-------|
| `type` | `gig_expired` |
| `channelId` | `urgent_gigs` |
| Trigger | Gig listing expires with no confirmed provider → notify requester, trigger refund |
| `data` | `{ type: "gig_expired", gigId: "<gig_id>" }` |
| Title | `"Gig Expired"` |
| Body | `"No provider was found. Your payment has been refunded."` |

---

### 12. Gig Payment — Wallet Credited (Provider Side)
| Field | Value |
|-------|-------|
| `type` | `gig_payment` |
| `channelId` | `tips` |
| Trigger | Gig is marked complete and payment released to provider's wallet |
| `data` | `{ type: "gig_payment", gigId: "<gig_id>", amount: 5000 }` |
| Title | `"Payment Received"` |
| Body | `"₦5,000 has been added to your wallet for completing the gig"` |

---

### 13. Gig Refund (Requester Side)
| Field | Value |
|-------|-------|
| `type` | `gig_refund` |
| `channelId` | `tips` |
| Trigger | Gig cancelled or dispute resolved in requester's favour → refund to requester wallet |
| `data` | `{ type: "gig_refund", gigId: "<gig_id>", amount: 5000 }` |
| Title | `"Refund Processed"` |
| Body | `"₦5,000 has been refunded to your wallet"` |

---

### 14. Rate Your Gig Partner (Both Parties)
| Field | Value |
|-------|-------|
| `type` | `gig_rating_received` |
| `channelId` | `social` |
| Trigger | Gig marked complete → prompt both parties to rate each other (send to each party separately) |
| `data` | `{ type: "gig_rating_received", gigId: "<gig_id>", projectId: "<project_id>" }` |
| Title | `"Rate Your Experience"` |
| Body | `"How was the gig? Leave a rating for <Other party displayName>"` |

---

### 15. Dispute Raised
| Field | Value |
|-------|-------|
| `type` | `dispute_raised` |
| `channelId` | `urgent_gigs` |
| Trigger | Either party raises a dispute → notify the other party |
| `data` | `{ type: "dispute_raised", projectId: "<project_id>", gigId: "<gig_id>", userId: "<disputing_party_id>" }` |
| Title | `"Dispute Raised"` |
| Body | `"<UserName> has raised a dispute on your project"` |

---

### 16. Payout Processed
| Field | Value |
|-------|-------|
| `type` | `payout` |
| `channelId` | `tips` |
| Trigger | User's withdrawal/payout is processed |
| `data` | `{ type: "payout", amount: 10000 }` |
| Title | `"Payout Sent"` |
| Body | `"₦10,000 payout has been sent to your bank account"` |

---

### 17. Content Purchase (Creator Side)
| Field | Value |
|-------|-------|
| `type` | `content_purchase` |
| `channelId` | `tips` |
| Trigger | A user purchases a creator's paid content |
| `data` | `{ type: "content_purchase", amount: 2000, userId: "<buyer_id>" }` |
| Title | `"Content Sold"` |
| Body | `"<Buyer displayName> purchased your content for ₦2,000"` |

---

### 18. Subscription
| Field | Value |
|-------|-------|
| `type` | `subscription` |
| `channelId` | `tips` |
| Trigger | User's subscription renews or upgrades |
| `data` | `{ type: "subscription", plan: "pro" }` |
| Title | `"Subscription Updated"` |
| Body | `"Your Pro subscription is active"` |

---

## Android Channel IDs

| `channelId` | Used For |
|-------------|----------|
| `social` | Follows, reactions, comments, ratings |
| `messages` | Direct messages |
| `opportunities` | Opportunity interest, agreements |
| `urgent_gigs` | All urgent gig lifecycle events, disputes |
| `tips` | Payments, payouts, wallet credits, content purchases, subscriptions |

> These channels are already registered in the mobile app (`NotificationService.setupNotificationChannels()`). Use the exact strings above.

---

## Expo Push Token Storage

The mobile app sends the token on login via:
- `POST /user/push-token` with body `{ token: "<expo_push_token>" }`
- Also writes directly to `profiles.expo_push_token` via Supabase

Always pull the freshest token from `profiles.expo_push_token` before sending a notification, as tokens can rotate.

---

## Rate Limiting Recommendations

| Event | Limit |
|-------|-------|
| Reactions on same post | 1 notification per reactor (deduplicate; if user reacts → unreacts → reacts, send only 1) |
| Comments on same post | Max 3 notifications per hour to post owner from different commenters |
| Gig matching | Max 10 providers notified per gig |
| Messages | 1 notification per unread session (suppress while user is actively in chat) |

---

## Questions / Clarifications

Contact: Mobile team (Justice)
Tracked in: this repo, `WEB_TEAM_PUSH_NOTIFICATIONS_REQUIRED.md`
