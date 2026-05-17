---
title: Ratings Feature Plan
status: Draft
owner: Mobile Team
audience: Web App Team + Mobile Team
---

# Goals
- Allow users to rate creators and service providers post-engagement.
- Store ratings and compute aggregates (average + count).

# Agreed Decisions
- Ratings allowed only after completed paid interactions (event ticket, paid service, paid collaboration).
- One rating per rater per rated user per context; updates overwrite prior rating for that context.
- Comments allowed with flagging + admin review queue.

# Backend Requirements

## Tables
```sql
create table if not exists creator_ratings (
  id uuid primary key default gen_random_uuid(),
  rated_user_id uuid not null,
  rater_user_id uuid not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  context text, -- event | service | collaboration | general
  created_at timestamptz not null default now()
);

create index if not exists idx_creator_ratings_user on creator_ratings(rated_user_id);
```

## Aggregation
Option A: Trigger updates on `profiles`:
- `profiles.rating_avg`
- `profiles.rating_count`

Option B: Periodic cron to compute aggregates.

## API Spec

### POST /api/ratings
Request:
```json
{
  "rated_user_id": "uuid",
  "rating": 5,
  "comment": "Optional text",
  "context": "event"
}
```
Requires user session (signed-in user).
Response:
```json
{ "success": true }
```
Status codes:
- 200: rating saved
- 400: invalid rating
- 401: not signed in
- 403: not eligible to rate
- 409: duplicate rating (if one-per-user policy)
- 500: server error

### GET /api/ratings/:userId/summary
Response:
```json
{
  "average": 4.6,
  "count": 23
}
```
Status codes:
- 200: ok
- 404: user not found
- 500: server error

### GET /api/ratings/:userId
Purpose: paginate reviews.
Response:
```json
{
  "data": [
    { "rating": 5, "comment": "Great to work with", "created_at": "..." }
  ],
  "nextCursor": "..."
}
```
Status codes:
- 200: ok
- 404: user not found
- 500: server error

# Mobile UX
- Rating prompt after event completion or paid service delivery.
- Show summary on profile and optional review list.

# Questions for Web Team
1) Who can rate: only after paid interactions or any connection?  
Answer: Only after completed paid interaction (event ticket, paid service, or paid collaboration).
2) Do we allow multiple ratings per rater or only latest?  
Answer: One rating per rater per rated user per context (event/service/collab); updates overwrite.
3) Should we moderate comments?  
Answer: Yes. Allow comments with flagging + admin review queue.
