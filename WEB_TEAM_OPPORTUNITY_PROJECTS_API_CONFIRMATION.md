# Confirmation Required: GET /api/opportunity-projects (No Role Filter)

## What We Need Confirmed

The mobile Transaction History screen now calls:

```
GET /api/opportunity-projects
Authorization: Bearer {token}
```

(No `?role=` query parameter — we want ALL projects for the user, both where they are poster AND creator.)

**Please confirm:**

1. **Does this endpoint return projects for both roles?**
   i.e. if I posted a gig (poster) AND responded to a gig (creator), does the unfiltered response include both?

2. **What is the current status of project `8e8fdc13-0154-445d-88ff-2b27b1f910a2`?**
   ("I need a drummer", £25 payment)
   Run: `SELECT id, status, poster_user_id, creator_user_id, agreed_amount FROM opportunity_projects WHERE id = '8e8fdc13-0154-445d-88ff-2b27b1f910a2';`

3. **Is the service provider's user ID set as `creator_user_id` on that project?**
   The mobile uses `creator_user_id === currentUser.id` to show the project as "Pending Earnings".
   If `creator_user_id` is null or wrong, the section won't appear.

## Why This Matters

Mobile Transaction History now fetches all gig projects in escrow statuses
(`payment_pending`, `awaiting_acceptance`, `active`, `delivered`) and shows them
as real-time "Pending Gig Earnings" — so users always see their committed/pending
money without waiting for the gig to complete.

This works correctly IF:
- `GET /api/opportunity-projects` returns all projects for the user (both roles)
- `creator_user_id` and `poster_user_id` are populated on the project record

## Console Log to Check

The mobile now logs on every Transaction History load:

```
📊 Escrow gig projects — as creator (pending earnings): N, as poster (committed payments): N
[{ id, status, poster, creator }, ...]
```

If you see `as creator: 0` and the drummer project IS in the list with the wrong creator_user_id,
that tells us the project wasn't correctly linked to the provider.
