# Play Count Fraud Detection — Web Handoff

**Spec:** `PLAYCOUNT_FRAUD_DETECTION_SYSTEM.MD`  
**Mobile migration reference:** `migrations/playcount_fraud_detection.sql`

Mobile records plays only through **`record_play_session` RPC**. Web owns validation, daily analysis, admin UI, payout blocks, and emails.

---

## Mobile behaviour (shipped)

| Change | Detail |
|--------|--------|
| No client `play_count` bump | Removed direct `audio_tracks.play_count` updates from the app |
| Session flush | On track change/stop, mobile calls `record_play_session` with duration + completed |
| Short plays | Still sent to RPC — server marks `is_valid = false` (Rule 1) |
| Legacy fallback | If `record_play_session` missing, falls back to `record_valid_play_session` + client duration gate |
| Silent | No creator UI for flagged/rejected plays (spec Part 5) |

### RPC call (mobile)

```typescript
supabase.rpc('record_play_session', {
  p_track_id: uuid,
  p_user_id: uuid,
  p_play_duration_seconds: integer,
  p_completed: boolean,
})
```

### Expected return (jsonb)

```json
{
  "is_valid": true,
  "is_suspicious": false,
  "is_rejected": false,
  "fraud_reason": null,
  "play_count": 142
}
```

- Increment `audio_tracks.play_count` and `track_quality_signals` **only** when `is_valid && !is_rejected`
- Capture `ip_address` from request context (API gateway / Supabase edge), not from mobile client

---

## Part 1 — Real-time validation (web RPC)

Apply on every `record_play_session` call:

| Rule | Behaviour |
|------|-----------|
| 1 Minimum duration | `< min(30s, 50% track)` → record, `is_valid=false` |
| 2 User/track cooldown | >3 plays same user/track in 24h → `is_suspicious`, not payout-eligible |
| 3 IP rate limit | >10 plays same IP/track in 1h → `is_suspicious` |
| 4 Identical duration | 5+ consecutive same duration → `is_suspicious` |
| 5 Impossible velocity | plays faster than track length → `is_rejected=true`, do not count |

Store `fraud_reason` text on each row.

---

## Part 2 — Daily job (4AM UK)

Populate `creator_fraud_analysis` with signals:

1. Play-to-listener ratio (>10 = highly suspicious)
2. Platform ratio (>30% of total users)
3. IP concentration (>20% from <5 IPs)
4. Time clustering (>80% in 6h window)

`fraud_score` 0–100 → `fraud_status`: clean | monitor | flagged | hold

---

## Part 3 — Admin dashboard (web only)

Summary cards, flagged/monitor tables, play detail panel, actions:

- **Approve payout** → `admin_decision=approved`, `fraud_status=clean`
- **Withhold payout** → email creator (5 working days message)
- **Ban account** → suspend + email

---

## Part 4 — Payout integration (web only)

Before payout cron:

- Block if `fraud_status` in (`flagged`, `hold`) and `reviewed_by_admin = false`
- Notify admin: "Payout blocked for [Creator] pending fraud review"
- Allow if `clean` or `admin_decision = approved`

---

## Part 5 — Creator notifications (web only)

Only on payout withheld or ban — never on individual flagged plays.

---

## Immediate manual analysis

Run on Justice's flagged account (~10k plays):

1. Unique `user_id` count
2. Unique `ip_address` count
3. Play timeline
4. Average `play_duration_seconds`

Surface in admin before any payout.

---

## Mobile files

| File | Role |
|------|------|
| `src/services/PlaySessionService.ts` | RPC wrapper + legacy fallback |
| `src/contexts/AudioPlayerContext.tsx` | Session tracking, no client play_count writes |

---

## Testing checklist

### Web
- [ ] Migration applied (`play_sessions` columns + `creator_fraud_analysis`)
- [ ] `record_play_session` implements all 5 rules + IP capture
- [ ] Return jsonb includes `play_count` when valid
- [ ] Daily cron at 4AM UK
- [ ] Admin fraud review UI
- [ ] Payout block integration
- [ ] Manual analysis on flagged account

### Mobile (after RPC live)
- [ ] Play ≥30s → `play_count` increases (from RPC return or refetch)
- [ ] Play <30s → row recorded `is_valid=false`, count unchanged
- [ ] Rapid replays flagged server-side
- [ ] No direct client writes to `audio_tracks.play_count`
