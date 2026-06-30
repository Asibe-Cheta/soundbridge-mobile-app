# Mobile → Web: Distribution Update — 2026-06-22

**From:** Mobile / Justice  
**Re:** Two changes to the MBG Sonics distribution flow

---

## Change 1 — Cover art minimum lowered to 1400×1400

The 3000×3000 minimum in the original spec was incorrect. Confirmed platform standards:

| Platform | Minimum | Recommended |
|----------|---------|-------------|
| Spotify | 640×640 | 3000×3000 |
| Apple Music | **1400×1400** | 3000×3000 |

**Apple Music is the strictest at 1400×1400.** Mobile validation has been updated to block below 1400×1400 and recommend 3000×3000. Any image 1400×1400 or above now passes the cover art check.

**Action for web:** If you have any server-side cover art validation on `POST /api/distribution/confirm`, update the hard block to 1400×1400. The 3000×3000 check was causing valid submissions to be rejected (e.g. 2048×2048 is perfectly fine).

---

## Change 2 — Admin inspection gate before emailing Isreal

The original spec sent the partner email to `israeldmy@gmail.com` automatically on payment confirmation. We need a **human review step in between** for non-technical requirements that can't be validated programmatically:

- No third-party logos on the cover art
- No release dates or "coming soon" text on the cover art
- No URLs or social media handles on the cover art
- No explicit imagery (if not marked explicit)

### What we're asking web to add

**Hold the partner email on confirm.** Instead of sending to Isreal immediately, set a new field:

```
distribution_requests.partner_email_status = 'pending_review'  (default)
```
(instead of the current `email_sent_to_partner = false/true`)

**Add an admin approval action** to the distribution dashboard at `www.soundbridge.live` (or wherever your admin panel lives):

- Admin sees incoming requests with `partner_email_status = 'pending_review'`
- Admin reviews cover art visually, confirms no banned content
- Admin clicks **"Approve & Send to MBG Sonics"**
- That action sends the partner email to `israeldmy@gmail.com` and updates `partner_email_status = 'sent'`

**If admin rejects** (cover art fails visual check):
- Set `partner_email_status = 'rejected'` and `track_status = 'failed'`
- Send creator an email: "Your distribution request could not be processed. Your cover art did not meet platform requirements — [reason]. Please resubmit with compliant artwork. Your payment will be refunded."
- Refund via Stripe

### DB suggestion (if you want to update the schema)

```sql
-- Option A: add a new column
alter table distribution_requests
  add column partner_email_status text not null default 'pending_review';
-- values: 'pending_review' | 'approved' | 'sent' | 'rejected'

-- Option B: repurpose email_sent_to_partner (boolean) 
-- Not recommended — loses the 'pending' and 'rejected' states
```

### Mobile admin screen

The mobile `AdminDistributionScreen` already shows `email_sent_to_partner` as "Sent / Pending". Once you add `partner_email_status`, let us know the column name and we'll update the mobile display to show the correct states. The **Mark as Live** action is separate and unaffected.

### SLA expectation

Ideally admin reviews within 24 hours of submission so the creator's requested release date is not impacted. The 14-day minimum lead time gives enough buffer.

---

## Summary

| # | Change | Who acts |
|---|--------|----------|
| 1 | Cover art minimum: 3000 → **1400×1400** | Web: update any server-side validation |
| 2 | Hold partner email pending admin visual review | Web: add approval gate + `partner_email_status` column |
| 2 | Mobile admin screen update for new status field | Mobile: once web ships the column |

Questions? Ping on Slack.
