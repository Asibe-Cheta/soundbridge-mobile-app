---
title: Account Deletion Flow Plan
status: Draft
owner: Mobile Team
audience: Web App Team + Mobile Team
---

# Goals
- Allow users to request account deletion from mobile.
- Capture a deletion reason and optional detail for admin reporting.
- Provide a safe, auditable process (soft-delete + retention window).

# Agreed Decisions
- Use soft-delete with a 14-day retention window.
- Anonymize data after retention by default; hard-delete only if legally required.
- No admin approval needed to create requests; final deletion automated after retention.

# Backend Requirements

## Tables
```sql
-- Track deletion requests and reasons
create table if not exists account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reason text not null,
  detail text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'pending', -- pending | processed | cancelled
  requested_by_ip text
);

create index if not exists idx_account_deletion_requests_user on account_deletion_requests(user_id);
```

## API Spec

### POST /api/account-deletion
Request:
```json
{
  "reason": "privacy_concerns",
  "detail": "Optional free text"
}
```
Requires user session (signed-in user).
Response:
```json
{ "success": true }
```
Status codes:
- 200: request created
- 400: invalid reason
- 401: not signed in
- 409: deletion already pending
- 500: server error

### GET /api/account-deletion/reasons
Purpose: expose reason list for client dropdown.
Response:
```json
{
  "reasons": [
    { "key": "privacy_concerns", "label": "Privacy concerns" },
    { "key": "not_useful", "label": "Not useful" },
    { "key": "found_alternative", "label": "Found alternative" },
    { "key": "other", "label": "Other" }
  ]
}
```
Status codes:
- 200: ok
- 500: server error

## Behavior
- Create a deletion request row.
- Soft-delete the user (e.g., set `profiles.deleted_at`, or `auth.users.banned_until`).
- Start a retention window (e.g., 14 days) for recovery.
- After window, scheduled job removes user data or anonymizes.

# Mobile UX (Profile > Settings)
- Entry: “Delete account”
- Two-step confirmation
- Reason dropdown + optional text
- Show disclaimer about data retention and recovery window

# Admin Dashboard
- Show reason distribution and total deletions
- Filter by timeframe, reason, and status

# Notes
- This does NOT force immediate hard deletion.
- The flow is reversible during retention window.

# Questions for Web Team
1) Soft-delete + retention window or immediate delete?  
Answer: Soft-delete + retention window (14 days).
2) Should we anonymize or hard-delete after retention window?  
Answer: Anonymize by default; hard-delete only if legally required.
3) Do we need admin approval before final deletion?  
Answer: No for request creation. Final deletion can be automated after retention.
