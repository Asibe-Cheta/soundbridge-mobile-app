# WEB_TEAM_DMCA_TAKEDOWN_IMPLEMENTATION.md

**Date:** 2026-02-26
**Priority:** HIGH — legal compliance, safe harbour depends on this
**For:** Backend + web frontend teams
**Context:** Mobile app has been updated to support formal DMCA/CDPA notices and counter-notices. This document specifies everything the backend and web teams need to build for the system to be fully functional.

---

## 1. Legal Actions Required (non-code, do these first)

### 1.1 Register a DMCA Designated Agent with the US Copyright Office

- **URL:** https://www.copyright.gov/dmca-directory/
- **Cost:** $6 (one-time), must be renewed every 3 years
- **What to submit:** Company name, address, phone, email (`copyright@soundbridge.com`), list of platform URLs
- **Why:** Without this registration, DMCA safe harbour (17 USC § 512(c)) does NOT apply, even if all other requirements are met
- **Deadline:** Complete before the `/api/takedowns` endpoint goes live

### 1.2 Register with PPL as an ISRC Manager

- **URL:** https://www.ppluk.com/music-creators/isrc/
- **Cost:** Free
- **What you get:** A two-letter registrant code (e.g., `SB`) — used to self-assign ISRCs in the format `GB-SB-YY-NNNNN`
- **Why:** Mobile app now sends `isrc_code: null` for covers without an ISRC. The backend must assign one from our PPL-registered code and store it
- **Deadline:** Complete before processing any upload with `isrc_code: null`

### 1.3 Apply for PRS/PPL Joint Online Licence

- **PRS:** https://www.prsformusic.com/licences/online-music-licence
- **PPL:** https://www.ppluk.com/licences/
- **What it covers:** Public performance and broadcast of musical compositions and recordings on the platform (required for covers and live sessions)
- **Why:** SoundBridge is streaming music publicly; this is a statutory requirement regardless of ISRC status

---

## 2. Database Schema

### 2.1 New table: `takedowns`

```sql
CREATE TABLE takedowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('track', 'post', 'playlist')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'actioned', 'counter_notice_received', 'restored', 'dismissed')),

  -- Claimant information (17 USC 512(c)(3) fields)
  claimant_name text NOT NULL,
  claimant_email text NOT NULL,
  claimant_address text NOT NULL,
  claimant_phone text,
  copyrighted_work_description text NOT NULL,
  infringing_url text NOT NULL,
  good_faith_statement boolean NOT NULL DEFAULT true,
  accuracy_statement boolean NOT NULL DEFAULT true,
  signature text NOT NULL,
  jurisdiction text NOT NULL CHECK (jurisdiction IN ('DMCA', 'CDPA')),

  -- Strike tracking
  uploader_id uuid REFERENCES profiles(id),
  strike_count integer DEFAULT 0,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  actioned_at timestamptz,
  counter_notice_at timestamptz,
  restore_after timestamptz,  -- 14 business days after counter notice

  -- Counter-notice fields (512(g))
  counter_statement text,
  counter_perjury_consent boolean,
  counter_court_consent boolean,
  counter_service_address text,
  counter_submitted_at timestamptz,

  -- Admin
  reviewed_by uuid REFERENCES profiles(id),
  admin_notes text
);

CREATE INDEX idx_takedowns_content ON takedowns(content_id, content_type);
CREATE INDEX idx_takedowns_uploader ON takedowns(uploader_id);
CREATE INDEX idx_takedowns_status ON takedowns(status);
CREATE INDEX idx_takedowns_restore ON takedowns(restore_after) WHERE restore_after IS NOT NULL;
```

### 2.2 New `moderation_status` value on tracks

```sql
ALTER TABLE tracks
  DROP CONSTRAINT IF EXISTS tracks_moderation_status_check;

ALTER TABLE tracks
  ADD CONSTRAINT tracks_moderation_status_check
  CHECK (moderation_status IN (
    'pending_check', 'checking', 'clean', 'flagged',
    'approved', 'rejected', 'appealed', 'taken_down'
  ));
```

### 2.3 Infringer strike counter on profiles

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS copyright_strikes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upload_suspended_until timestamptz;
```

---

## 3. Backend API Endpoints

### 3.1 `POST /api/takedowns` — Submit a copyright notice

**Auth:** Required (claimant must be authenticated) or allow unauthenticated with rate limiting
**Body:**
```typescript
{
  content_id: string
  content_type: 'track' | 'post' | 'playlist'
  copyrighted_work_description: string   // min 20 chars
  infringing_url: string
  claimant_name: string
  claimant_email: string
  claimant_address: string
  claimant_phone?: string
  good_faith_statement: true
  accuracy_statement: true
  signature: string
  jurisdiction: 'DMCA' | 'CDPA'
}
```

**Actions on receipt:**
1. Insert row into `takedowns` table with `status = 'pending'`
2. Send email to `copyright@soundbridge.com` with all notice fields (for admin review)
3. Send confirmation email to `claimant_email`
4. Return `{ takedown_id: uuid }`

**Response:**
```json
{ "takedown_id": "uuid" }
```

---

### 3.2 `POST /api/takedowns/:id/action` — Admin: action a takedown (internal)

**Auth:** Admin only
**Body:** `{ action: 'approve' | 'dismiss', notes?: string }`

**When `action === 'approve'`:**
1. Set `takedowns.status = 'actioned'`, `actioned_at = now()`
2. Set `tracks.moderation_status = 'taken_down'` for the content
3. Increment `profiles.copyright_strikes` for the uploader
4. Apply repeat-infringer policy:
   - 1st strike: warn only (already actioned)
   - 2nd strike: set `profiles.upload_suspended_until = now() + interval '30 days'`
   - 3rd+ strike: call account termination logic
5. Send push notification + email to uploader: "Your track '{title}' has been removed following a copyright notice. You may submit a counter-notice within 14 days."
6. Send email to claimant: "Your copyright notice for '{content_title}' has been actioned."

---

### 3.3 `POST /api/takedowns/:id/counter-notice`

**Auth:** Required — must be the uploader of the content
**Body:**
```typescript
{
  statement: string          // min 20 chars
  penalty_of_perjury_consent: true
  court_jurisdiction_consent: true
  service_address: string
}
```

**Actions:**
1. Verify caller is the uploader (`content.creator_id === auth.uid()`)
2. Verify `takedowns.status === 'actioned'` (can only counter an actioned takedown)
3. Update `takedowns`: `status = 'counter_notice_received'`, `counter_notice_at = now()`, `restore_after = now() + interval '14 days'`
4. Store counter-notice fields on the row
5. Forward counter-notice to claimant email: "You have received a counter-notice for your takedown of '{title}'. You have 10–14 business days to file a court action. If you do not, SoundBridge may restore the content."
6. Send email to uploader: "Your counter-notice has been submitted. The rights holder has 10–14 business days to respond. If no court action is filed, your content may be restored on {restore_after}."
7. Return `{ success: true }`

---

### 3.4 `GET /api/takedowns/:id`

**Auth:** Required — only accessible to the uploader or admin
**Response:** Full `TakedownRecord` object

---

## 4. Automated Restoration Job

Run daily (cron job or Supabase Edge Function with pg_cron):

```sql
-- Restore content where counter-notice window has expired with no court action
UPDATE tracks
  SET moderation_status = 'clean'
WHERE id IN (
  SELECT t.content_id FROM takedowns t
  WHERE t.content_type = 'track'
    AND t.status = 'counter_notice_received'
    AND t.restore_after < now()
    AND NOT EXISTS (
      SELECT 1 FROM takedowns t2
      WHERE t2.id = t.id
        AND t2.status = 'court_action_filed'
    )
);

UPDATE takedowns
  SET status = 'restored'
WHERE status = 'counter_notice_received'
  AND restore_after < now();
```

Send restoration email to uploader when this runs.

---

## 5. Email Notification Templates

### 5.1 Takedown notice received (to admin)
```
Subject: New Copyright Takedown Notice — {content_title}

A formal copyright notice has been submitted.

Content: {content_type} — {content_title}
Content ID: {content_id}
Jurisdiction: {jurisdiction}
Claimant: {claimant_name} <{claimant_email}>
Copyrighted work: {copyrighted_work_description}
Signature: {signature}
Submitted: {created_at}

Action required: Review within 24 hours at admin panel.
```

### 5.2 Takedown actioned (to uploader)
```
Subject: Your track has been removed following a copyright notice

Your track "{title}" has been removed from SoundBridge following a formal copyright notice.

If you believe this removal was a mistake, you have the right to submit a counter-notice. Open the SoundBridge app, go to your track, and tap "Submit Counter-Notice".

A counter-notice must be submitted within 14 days. After that, the removal may become permanent.

Reference: {takedown_id}
```

### 5.3 Counter-notice received (to claimant)
```
Subject: Counter-notice received for your copyright claim

{counter_submitter_name} has submitted a counter-notice in response to your copyright takedown of "{content_title}".

You have 10–14 business days from {counter_notice_at} to file a court action and notify us. If no court action is filed by {restore_after}, SoundBridge will restore the content.

If you have filed or intend to file a court action, please notify us immediately at copyright@soundbridge.com with your case reference.

Reference: {takedown_id}
```

### 5.4 Content restored (to uploader)
```
Subject: Your track has been restored

The copyright claimant did not file a court action within the required window. Your track "{title}" has been restored on SoundBridge.

Reference: {takedown_id}
```

---

## 6. Admin Panel Requirements

Build a Takedowns section in the admin dashboard:

| Column | Description |
|--------|-------------|
| Submitted | Date of notice |
| Jurisdiction | DMCA / CDPA |
| Content | Track/post title + link |
| Claimant | Name + email |
| Status | pending / actioned / counter_notice_received / restored / dismissed |
| Action | Approve / Dismiss buttons |

Filters: Status, date range, jurisdiction
Export: CSV for legal record-keeping

---

## 7. ISRC Auto-Assignment (for `isrc_code: null` uploads)

When the mobile app sends a track upload with `isrc_code: null` AND `is_cover: true` (or `acrcloudData.matchFound: true`):

```
1. Check if our PPL registrant code is configured (env var: PPL_REGISTRANT_CODE)
2. If yes: generate ISRC = `GB-{PPL_REGISTRANT_CODE}-{YY}-{NNNNN}` where NNNNN is a zero-padded sequential counter stored in a `isrc_counter` table
3. Store the assigned ISRC on the track
4. Return it in the track response so the uploader's app can display it
```

Until PPL registration is complete, store `isrc_code = null` and flag the track as `pending_isrc_assignment` (add this to a `tracks.isrc_assignment_status` column if desired).

---

## 8. Three-strikes Logic (Repeat Infringer Policy)

```typescript
function applyStrike(uploaderId: string): void {
  const profile = getProfile(uploaderId);
  const newCount = profile.copyright_strikes + 1;

  switch (newCount) {
    case 1:
      // Warn only — content already removed
      sendEmail(uploader.email, templates.firstStrikeWarning);
      break;
    case 2:
      // Suspend uploads for 30 days
      updateProfile(uploaderId, {
        copyright_strikes: 2,
        upload_suspended_until: addDays(now(), 30),
      });
      sendEmail(uploader.email, templates.secondStrikeSuspension);
      break;
    default:
      // Third notice: terminate account
      terminateAccount(uploaderId);
      sendEmail(uploader.email, templates.accountTerminated);
      break;
  }
}
```

---

## 9. Mobile Changes Summary (already implemented)

For reference — these are the mobile changes that are live and what they expect from the backend:

| Mobile change | Backend expectation |
|--------------|---------------------|
| `POST /api/takedowns` called from `DMCANoticeModal` | Endpoint exists, returns `{ takedown_id }` |
| `POST /api/takedowns/:id/counter-notice` from `AppealModal` (isTakedown=true) | Endpoint exists, verifies uploader, stores counter-notice |
| `GET /api/takedowns/:id` from `AppealModal` / `TakedownService` | Endpoint exists, returns `TakedownRecord` |
| `moderation_status = 'taken_down'` blocks playback | Already in `AudioPlayerContext` |
| `⚖️ Copyright Removed` badge shown to track owner | Already in `ModerationBadge` |
| ISRC field optional — `isrc_code: null` sent when blank | Backend assigns ISRC from PPL code or stores null |
| Copyright policy updated — version `2026-02-26` | Backend should accept `terms_version = '2026-02-26'` in copyright attestation |

---

## 10. Testing Checklist

- [ ] Submit takedown notice via mobile `DMCANoticeModal` → admin receives email
- [ ] Admin approves → track `moderation_status` becomes `taken_down`, uploader receives email
- [ ] Uploader opens track → sees `⚖️ Copyright Removed` badge
- [ ] Uploader taps "Submit Counter-Notice" → `AppealModal` opens with `isTakedown=true`
- [ ] Counter-notice submitted → claimant receives email, `restore_after` set 14 days out
- [ ] Daily cron runs after `restore_after` → track restored to `clean`
- [ ] Uploader receives "content restored" email
- [ ] Two more strikes on same account → account terminated
- [ ] Cover upload with blank ISRC → backend assigns one from PPL code
- [ ] Copyright policy screen shows version `2026-02-26`
