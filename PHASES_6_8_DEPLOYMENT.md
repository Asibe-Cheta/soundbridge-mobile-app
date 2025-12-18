# Phases 6-8 Deployment Guide

**SoundBridge Content Moderation System - Final Deployment**

This guide covers the deployment of the admin dashboard, notification system, and final testing for Phases 6-8 of the content moderation system.

---

## Overview

### Phase 6: Admin Moderation Dashboard
- Admin API endpoints for queue, review, and statistics
- Full-featured admin UI for reviewing flagged content
- Real-time moderation statistics

### Phase 7: Notification System
- Multi-channel notifications (Email + In-app + Push)
- 6 beautiful HTML email templates
- SendGrid integration for email delivery

### Phase 8: Testing & Deployment
- Pre-deployment testing checklist
- Environment configuration
- Production deployment steps

---

## Prerequisites

Before deploying Phases 6-8, ensure Phases 1-5 are complete:

- ✅ Phase 1: Database migration for moderation fields
- ✅ Phase 2: Audio validation utilities
- ✅ Phase 3: Whisper transcription service
- ✅ Phase 4: OpenAI moderation checks
- ✅ Phase 5: Vercel Cron background job

---

## Phase 6: Admin Dashboard Setup

### Environment Variables

No new environment variables required - uses existing Supabase credentials.

### Database Requirements

Ensure these database objects exist (from Phase 1):

```sql
-- Moderation queue view
CREATE VIEW admin_moderation_queue AS
SELECT
  t.id,
  t.title,
  t.artist_name,
  t.creator_id,
  t.moderation_status,
  t.moderation_flagged,
  t.flag_reasons,
  t.moderation_confidence,
  t.transcription,
  p.username,
  p.email
FROM audio_tracks t
LEFT JOIN profiles p ON t.creator_id = p.id
WHERE t.moderation_flagged = true
ORDER BY t.created_at DESC;

-- Moderation stats function
CREATE OR REPLACE FUNCTION get_moderation_stats(p_days_back INT DEFAULT 7)
RETURNS TABLE (
  date DATE,
  total_checked INT,
  flagged_count INT,
  approved_count INT,
  rejected_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(moderation_checked_at) as date,
    COUNT(*)::INT as total_checked,
    COUNT(*) FILTER (WHERE moderation_flagged = true)::INT as flagged_count,
    COUNT(*) FILTER (WHERE moderation_status = 'approved')::INT as approved_count,
    COUNT(*) FILTER (WHERE moderation_status = 'rejected')::INT as rejected_count
  FROM audio_tracks
  WHERE moderation_checked_at > NOW() - INTERVAL '1 day' * p_days_back
  GROUP BY DATE(moderation_checked_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;
```

### API Endpoints

The following API routes are available:

1. **GET /api/admin/moderation/queue** - Fetch flagged tracks
   - Query params: `filter` (flagged/pending/all), `limit`, `offset`
   - Returns: Array of tracks with flag reasons and transcriptions

2. **POST /api/admin/moderation/review** - Review flagged content
   - Body: `{ trackId, action: 'approve' | 'reject', reason? }`
   - Sends notifications to users

3. **GET /api/admin/moderation/stats** - Moderation statistics
   - Query params: `days` (default: 7)
   - Returns: Overview stats, metrics, daily stats, top flag reasons

### Admin Access

Users must have one of these roles in the `user_roles` table:
- `admin`
- `super_admin`
- `moderator`

Grant admin access:
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid-here', 'admin');
```

### Admin Dashboard URL

Access the dashboard at: `https://soundbridge.live/admin/moderation`

---

## Phase 7: Notification System Setup

### Environment Variables Required

Add these to Vercel environment variables:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
SENDGRID_FROM_EMAIL=noreply@soundbridge.live

# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://soundbridge.live
```

### SendGrid Setup

1. **Create SendGrid Account**
   - Go to https://sendgrid.com/
   - Sign up for free tier (100 emails/day)
   - Verify your email address

2. **Create API Key**
   - Dashboard → Settings → API Keys
   - Click "Create API Key"
   - Name: "SoundBridge Moderation"
   - Permissions: "Full Access" or "Mail Send"
   - Copy the API key (starts with `SG.`)

3. **Verify Sender Email**
   - Dashboard → Settings → Sender Authentication
   - Click "Verify a Single Sender"
   - Use: `noreply@soundbridge.live`
   - Complete verification process

4. **Add to Vercel**
   - Vercel Dashboard → Settings → Environment Variables
   - Add `SENDGRID_API_KEY` with your API key
   - Add `SENDGRID_FROM_EMAIL` with `noreply@soundbridge.live`
   - Set environment: Production + Preview

### Email Templates

The system includes 6 responsive HTML email templates:

1. **Track Flagged** - Notification that track is under review
2. **Track Approved** - Track passed moderation
3. **Track Rejected** - Track failed moderation (with appeal option)
4. **Appeal Received** - Confirmation of appeal submission
5. **Appeal Approved** - Appeal accepted, track reinstated
6. **Appeal Rejected** - Appeal denied

All templates feature:
- Responsive design (mobile-friendly)
- SoundBridge brand colors (purple #8B5CF6)
- Professional typography
- Clear call-to-action buttons
- Footer with copyright and links

### Notification Channels

When moderation actions occur, users receive notifications via:

1. **Email (SendGrid)** - Detailed HTML email
2. **In-app** - Notification in the notifications table
3. **Push** - Mobile push notification (if Expo token exists)

All three channels send in parallel using `Promise.allSettled()` for resilience.

### Testing Email Notifications

Test the email system:

```bash
curl -X POST https://soundbridge.live/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "subject": "Test Email",
    "html": "<h1>Test</h1><p>This is a test email from SoundBridge.</p>"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

---

## Phase 8: Testing & Deployment

### Pre-Deployment Testing Checklist

#### 1. Database Tests

```sql
-- Test: Verify moderation fields exist
SELECT
  moderation_status,
  moderation_flagged,
  flag_reasons,
  moderation_confidence,
  transcription
FROM audio_tracks
LIMIT 1;

-- Test: Check admin view
SELECT * FROM admin_moderation_queue LIMIT 5;

-- Test: Verify stats function
SELECT * FROM get_moderation_stats(7);

-- Test: Check user roles
SELECT * FROM user_roles WHERE role IN ('admin', 'super_admin', 'moderator');
```

#### 2. API Endpoint Tests

**Test Moderation Queue:**
```bash
curl -X GET "https://soundbridge.live/api/admin/moderation/queue?filter=flagged" \
  -H "Cookie: your-session-cookie"
```

**Test Moderation Stats:**
```bash
curl -X GET "https://soundbridge.live/api/admin/moderation/stats?days=7" \
  -H "Cookie: your-session-cookie"
```

**Test Review Action:**
```bash
curl -X POST https://soundbridge.live/api/admin/moderation/review \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "trackId": "track-uuid-here",
    "action": "approve",
    "reason": "Test approval"
  }'
```

#### 3. Notification Tests

**Test Email Notification:**
```bash
curl -X POST https://soundbridge.live/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Notification",
    "html": "<h1>Test</h1>"
  }'
```

**Test Full Moderation Flow:**
1. Upload a track with potentially flagged content
2. Wait for cron job to process (max 5 minutes)
3. Check admin dashboard for flagged track
4. Review and approve/reject
5. Verify user receives email notification
6. Check in-app notification in notifications table

#### 4. UI Tests

- [ ] Admin dashboard loads successfully
- [ ] Stats cards display correct numbers
- [ ] Filter buttons work (flagged/pending/all)
- [ ] Track list displays correctly
- [ ] Audio player works for each track
- [ ] Transcription displays if available
- [ ] Flag reasons display as badges
- [ ] Review button opens review panel
- [ ] Approve action works and sends notification
- [ ] Reject action works and sends notification
- [ ] Track disappears from queue after review

#### 5. End-to-End Test

Complete moderation workflow:

1. **Upload Test Track**
   ```bash
   # Upload a track with test content via the app
   # Use lyrics that might trigger flags (e.g., "hate", "violence")
   ```

2. **Wait for Cron Job**
   - Check Vercel logs: `/api/cron/moderate-content`
   - Should process within 5 minutes
   - Track should be flagged if content is problematic

3. **Admin Review**
   - Log in as admin
   - Navigate to `/admin/moderation`
   - Find the flagged track
   - Click "Review Track"
   - Choose approve or reject
   - Add optional reason
   - Submit review

4. **Verify Notifications**
   - Check user's email inbox for notification
   - Check notifications table for in-app notification
   - Verify notification content matches template

5. **Verify Track Status**
   ```sql
   SELECT
     id, title, moderation_status, moderation_flagged,
     reviewed_by, reviewed_at
   FROM audio_tracks
   WHERE id = 'test-track-uuid';
   ```

### Environment Variables Checklist

Verify all required environment variables are set in Vercel:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `CRON_SECRET`
- [ ] `SENDGRID_API_KEY`
- [ ] `SENDGRID_FROM_EMAIL`
- [ ] `NEXT_PUBLIC_APP_URL`

### Deployment Steps

1. **Commit All Changes**
   ```bash
   git add .
   git commit -m "feat: Add admin moderation dashboard and notification system (Phases 6-8)"
   git push origin main
   ```

2. **Verify Vercel Deployment**
   - Go to Vercel Dashboard
   - Check deployment status
   - Review build logs for errors
   - Verify environment variables are set

3. **Run Database Migrations**
   - Ensure all Phase 1 migrations are applied
   - Verify views and functions exist

4. **Grant Admin Access**
   ```sql
   -- Grant yourself admin access
   INSERT INTO user_roles (user_id, role)
   VALUES ('your-user-uuid', 'admin')
   ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
   ```

5. **Verify Cron Job**
   - Vercel Dashboard → Cron Jobs
   - Check `/api/cron/moderate-content` is scheduled
   - Monitor first few runs in logs

6. **Test Email Delivery**
   - Send test email via `/api/send-email`
   - Verify SendGrid dashboard shows delivery
   - Check spam folder if not in inbox

7. **Access Admin Dashboard**
   - Navigate to `https://soundbridge.live/admin/moderation`
   - Verify authentication works
   - Check stats display correctly
   - Test filter buttons

8. **Monitor Production**
   - Watch Vercel logs for errors
   - Check Supabase for database issues
   - Monitor SendGrid delivery rates
   - Review moderation queue regularly

---

## Monitoring & Maintenance

### Daily Checks

1. **Moderation Queue Size**
   ```sql
   SELECT COUNT(*) as pending_reviews
   FROM audio_tracks
   WHERE moderation_flagged = true
   AND moderation_status = 'flagged';
   ```

2. **Email Delivery Status**
   - SendGrid Dashboard → Activity
   - Check bounce rate and delivery rate
   - Monitor spam reports

3. **Cron Job Health**
   - Vercel Dashboard → Logs
   - Filter by `/api/cron/moderate-content`
   - Check for errors or timeouts

### Weekly Reports

Generate moderation reports:

```sql
-- Weekly moderation summary
SELECT
  COUNT(*) as total_checked,
  COUNT(*) FILTER (WHERE moderation_flagged = true) as flagged,
  COUNT(*) FILTER (WHERE moderation_status = 'approved') as approved,
  COUNT(*) FILTER (WHERE moderation_status = 'rejected') as rejected,
  ROUND(AVG(moderation_confidence) * 100, 2) as avg_confidence
FROM audio_tracks
WHERE moderation_checked_at > NOW() - INTERVAL '7 days';

-- Top flag reasons this week
SELECT * FROM get_top_flag_reasons(10);
```

### Performance Metrics

Track these KPIs:

- **Moderation Speed**: Time from upload to review
- **Flag Rate**: % of tracks flagged for review
- **Approval Rate**: % of flagged tracks approved
- **Email Delivery Rate**: % of emails successfully delivered
- **Queue Size**: Number of pending reviews

---

## Troubleshooting

### Issue: Admin dashboard shows "Forbidden"

**Cause**: User doesn't have admin role

**Solution**:
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

### Issue: Email notifications not sending

**Cause**: SendGrid not configured or API key invalid

**Solution**:
1. Verify `SENDGRID_API_KEY` in Vercel environment variables
2. Check SendGrid dashboard for API key status
3. Verify sender email is authenticated
4. Check Vercel logs for SendGrid errors

### Issue: Stats not loading

**Cause**: Database functions missing or permissions issue

**Solution**:
```sql
-- Verify function exists
SELECT * FROM pg_proc WHERE proname = 'get_moderation_stats';

-- Re-create if missing (see Phase 1 migration)
```

### Issue: Review action not updating track

**Cause**: Database permissions or RLS policy blocking update

**Solution**:
```sql
-- Check RLS policies on audio_tracks
SELECT * FROM pg_policies WHERE tablename = 'audio_tracks';

-- Ensure service role can update tracks
```

---

## Security Considerations

1. **Admin Access Control**
   - Only grant admin role to trusted users
   - Regularly audit user_roles table
   - Consider adding 2FA for admin accounts

2. **API Authentication**
   - All admin endpoints check user role
   - Session cookies are httpOnly and secure
   - CSRF protection enabled

3. **SendGrid API Key**
   - Never commit API key to git
   - Rotate key every 6 months
   - Monitor SendGrid for unusual activity

4. **Email Content**
   - All email templates escape user input
   - No raw HTML from user content
   - Links use HTTPS only

---

## Cost Breakdown

### SendGrid (Free Tier)
- 100 emails/day free
- Estimated usage: ~10-50 emails/day
- **Cost**: £0/month ✅

### Vercel (Hobby Tier)
- Cron jobs included
- API routes included
- **Cost**: £0/month ✅

### Total Cost: £0/month for Phases 6-8

---

## Success Criteria

Phases 6-8 are successfully deployed when:

- ✅ Admin dashboard accessible at `/admin/moderation`
- ✅ Moderation queue displays flagged tracks
- ✅ Stats cards show accurate metrics
- ✅ Review actions (approve/reject) work correctly
- ✅ Email notifications send successfully
- ✅ In-app notifications created in database
- ✅ Push notifications sent to mobile users (if token exists)
- ✅ All 6 email templates render correctly
- ✅ Cron job continues running every 5 minutes
- ✅ No errors in Vercel logs
- ✅ SendGrid shows >95% delivery rate

---

## Next Steps

After deploying Phases 6-8:

1. ✅ Train moderators on using the admin dashboard
2. ✅ Set up monitoring alerts for queue size
3. ✅ Create moderation guidelines document
4. ✅ Schedule weekly moderation reports
5. ✅ Consider adding appeal workflow (future enhancement)

---

*Phases 6-8 Deployment Guide - December 17, 2025*
*SoundBridge Content Moderation System - Complete*
