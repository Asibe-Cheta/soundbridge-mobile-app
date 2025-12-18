# SoundBridge Content Moderation System - Complete Documentation Index

**Version:** 1.0
**Date:** December 17, 2025
**Status:** ✅ Production Ready

---

## Overview

This is the complete documentation index for SoundBridge's automated content moderation system. The system provides automated content checking, admin review workflows, and multi-channel user notifications.

---

## 📚 Documentation for Web/Backend Team

### Setup & Infrastructure

1. **[CRON_JOB_SETUP.md](./CRON_JOB_SETUP.md)**
   - **Purpose:** Vercel Cron job configuration for automated content moderation
   - **Covers:**
     - Environment variables setup (OpenAI, Supabase, Cron Secret)
     - Vercel cron configuration
     - Testing procedures
     - Monitoring and troubleshooting
   - **When to use:** Setting up the background moderation job (Phase 5)

2. **[WHISPER_SETUP_GUIDE.md](./WHISPER_SETUP_GUIDE.md)**
   - **Purpose:** Whisper transcription service setup
   - **Covers:**
     - Local Whisper installation
     - Railway deployment (cloud hosting)
     - API integration
     - Cost analysis (FREE options)
   - **When to use:** Setting up audio transcription (Phase 3)

3. **[PHASES_6_8_DEPLOYMENT.md](./PHASES_6_8_DEPLOYMENT.md)**
   - **Purpose:** Admin dashboard and notification system deployment
   - **Covers:**
     - Admin API endpoints
     - Admin UI dashboard
     - SendGrid email configuration
     - Multi-channel notifications
     - Testing checklist
     - Production deployment steps
   - **When to use:** Deploying admin features and notifications (Phases 6-8)

### Email Templates Reference

4. **[apps/web/src/lib/email-templates.ts](./apps/web/src/lib/email-templates.ts)**
   - **Purpose:** 6 responsive HTML email templates for moderation notifications
   - **Templates:**
     1. Track Flagged - Under review
     2. Track Approved - Success notification
     3. Track Rejected - With appeal option
     4. Appeal Received - Confirmation
     5. Appeal Approved - Track reinstated
     6. Appeal Rejected - Final decision
   - **Features:** Responsive design, SoundBridge branding, inline CSS
   - **When to use:** Reference for email design and content

---

## 📱 Documentation for Mobile Team

5. **[MOBILE_TEAM_MODERATION_GUIDE.md](./MOBILE_TEAM_MODERATION_GUIDE.md)**
   - **Purpose:** Complete implementation guide for React Native/Expo mobile app
   - **Covers:**
     - Database schema changes
     - API endpoints (existing + new)
     - Track upload flow changes
     - Moderation status UI display
     - Push notifications integration (Expo)
     - In-app notifications handling
     - Appeal workflow
     - Content filtering
     - Testing checklist
   - **When to use:** Implementing mobile app moderation features

---

## 🗂️ System Architecture Overview

### Phase Breakdown

#### **Phases 1-5: Backend Foundation** ✅ Complete
- **Phase 1:** Database migration (moderation fields on `audio_tracks`)
- **Phase 2:** Audio validation utilities
- **Phase 3:** Whisper transcription service
- **Phase 4:** OpenAI moderation checks
- **Phase 5:** Vercel Cron background job

**Status:** Fully implemented and deployed
**Docs:** [CRON_JOB_SETUP.md](./CRON_JOB_SETUP.md), [WHISPER_SETUP_GUIDE.md](./WHISPER_SETUP_GUIDE.md)

#### **Phases 6-8: Admin & Notifications** ✅ Complete
- **Phase 6:** Admin moderation dashboard (APIs + UI)
- **Phase 7:** Multi-channel notification system (Email + In-app + Push)
- **Phase 8:** Testing suite and deployment

**Status:** Fully implemented and deployed
**Docs:** [PHASES_6_8_DEPLOYMENT.md](./PHASES_6_8_DEPLOYMENT.md)

#### **Mobile Implementation** ⏳ Pending
- Display moderation status
- Handle push notifications
- Implement appeal workflow
- Filter content by status

**Status:** Pending mobile team implementation
**Docs:** [MOBILE_TEAM_MODERATION_GUIDE.md](./MOBILE_TEAM_MODERATION_GUIDE.md)

---

## 🔄 Content Moderation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     USER UPLOADS TRACK                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  Track Status: pending_check │
        │  Track is immediately live   │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   VERCEL CRON (Every 5min)  │
        │  - Fetch pending tracks      │
        │  - Process batch (10 tracks) │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  WHISPER TRANSCRIPTION      │
        │  - Extract lyrics/speech     │
        │  - Detect language           │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  OPENAI MODERATION CHECK    │
        │  - Analyze transcription     │
        │  - Check for harmful content │
        │  - Detect spam patterns      │
        └─────────────┬───────────────┘
                      │
                      ▼
              ┌───────┴───────┐
              │               │
              ▼               ▼
      ┌──────────┐    ┌──────────┐
      │  CLEAN   │    │ FLAGGED  │
      │ (95%+)   │    │  (<95%)  │
      └────┬─────┘    └────┬─────┘
           │               │
           │               ▼
           │     ┌──────────────────┐
           │     │  ADMIN REVIEW    │
           │     │  - Queue item    │
           │     │  - Manual check  │
           │     └────┬──────┬──────┘
           │          │      │
           │          ▼      ▼
           │    ┌─────────┐ ┌─────────┐
           │    │APPROVED │ │REJECTED │
           │    └────┬────┘ └────┬────┘
           │         │           │
           ▼         ▼           ▼
    ┌──────────────────────────────┐
    │   SEND NOTIFICATIONS         │
    │   - Email (SendGrid)         │
    │   - In-app (Database)        │
    │   - Push (Expo)              │
    └──────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  USER NOTIFIED │
         └────────────────┘
```

---

## 🔑 Key Environment Variables

### Required for Web Backend

```bash
# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI Moderation (Phase 4)
OPENAI_API_KEY=sk-your-openai-api-key

# Cron Security (Phase 5)
CRON_SECRET=your-random-secret-string

# SendGrid Email (Phase 7)
SENDGRID_API_KEY=SG.your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@soundbridge.live

# App Configuration
NEXT_PUBLIC_APP_URL=https://soundbridge.live
MODERATION_BATCH_SIZE=10  # Optional
```

**Setup Instructions:** See [PHASES_6_8_DEPLOYMENT.md](./PHASES_6_8_DEPLOYMENT.md#environment-variables-checklist)

---

## 📊 Database Schema Changes

### New Fields on `audio_tracks`

```sql
-- Moderation status tracking
moderation_status TEXT DEFAULT 'pending_check'
  CHECK (moderation_status IN ('pending_check', 'checking', 'clean', 'flagged', 'approved', 'rejected'));

moderation_flagged BOOLEAN DEFAULT false;
flag_reasons TEXT[];
moderation_confidence NUMERIC(3,2);  -- 0.00 to 1.00
transcription TEXT;
moderation_checked_at TIMESTAMPTZ;
reviewed_by UUID REFERENCES auth.users(id);
reviewed_at TIMESTAMPTZ;
```

### New `notifications` Table Type

```sql
-- Added 'moderation' type
type TEXT CHECK (type IN ('like', 'comment', 'follow', 'moderation'));
```

### New Field on `profiles`

```sql
-- For push notifications
expo_push_token TEXT;
```

**Full Schema:** See Phase 1 migration files

---

## 🚀 Quick Start Guide

### For Backend Team

1. **Set up environment variables** → [CRON_JOB_SETUP.md](./CRON_JOB_SETUP.md#environment-variables-required)
2. **Deploy Whisper service** → [WHISPER_SETUP_GUIDE.md](./WHISPER_SETUP_GUIDE.md)
3. **Configure SendGrid** → [PHASES_6_8_DEPLOYMENT.md](./PHASES_6_8_DEPLOYMENT.md#sendgrid-setup)
4. **Grant admin access** → [PHASES_6_8_DEPLOYMENT.md](./PHASES_6_8_DEPLOYMENT.md#admin-access)
5. **Test moderation flow** → [PHASES_6_8_DEPLOYMENT.md](./PHASES_6_8_DEPLOYMENT.md#testing-checklist)

### For Mobile Team

1. **Review schema changes** → [MOBILE_TEAM_MODERATION_GUIDE.md](./MOBILE_TEAM_MODERATION_GUIDE.md#database-schema-changes)
2. **Update track upload flow** → [MOBILE_TEAM_MODERATION_GUIDE.md](./MOBILE_TEAM_MODERATION_GUIDE.md#track-upload-flow-changes)
3. **Implement status display** → [MOBILE_TEAM_MODERATION_GUIDE.md](./MOBILE_TEAM_MODERATION_GUIDE.md#displaying-moderation-status)
4. **Set up push notifications** → [MOBILE_TEAM_MODERATION_GUIDE.md](./MOBILE_TEAM_MODERATION_GUIDE.md#push-notifications-integration)
5. **Test end-to-end** → [MOBILE_TEAM_MODERATION_GUIDE.md](./MOBILE_TEAM_MODERATION_GUIDE.md#testing-checklist)

---

## 🎯 API Endpoints Reference

### Backend Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/cron/moderate-content` | GET | Background moderation job | Cron Secret |
| `/api/admin/moderation/queue` | GET | Fetch flagged tracks | Admin |
| `/api/admin/moderation/review` | POST | Approve/reject content | Admin |
| `/api/admin/moderation/stats` | GET | Moderation statistics | Admin |
| `/api/send-email` | POST | Send email via SendGrid | Internal |
| `/api/tracks/upload` | POST | Upload track (modified) | User |
| `/api/tracks/{trackId}` | GET | Get track (includes moderation) | Public |
| `/api/tracks/{trackId}/appeal` | POST | Appeal rejected content | User |
| `/api/notifications` | GET | Get user notifications | User |

**Detailed Specs:** See [MOBILE_TEAM_MODERATION_GUIDE.md](./MOBILE_TEAM_MODERATION_GUIDE.md#api-endpoints-available)

---

## 💰 Cost Breakdown

### Total Monthly Cost: £0/month (FREE Tier)

| Service | Usage | Cost |
|---------|-------|------|
| **Vercel Cron** | Every 5 minutes | FREE ✅ |
| **OpenAI Moderation API** | 2M requests/month free | FREE ✅ |
| **Whisper** | Self-hosted (Railway free tier) | FREE ✅ |
| **SendGrid** | 100 emails/day (Free tier) | FREE ✅ |
| **Supabase** | Existing infrastructure | £0 (already paid) |

**Details:** See [CRON_JOB_SETUP.md](./CRON_JOB_SETUP.md#cost-breakdown)

---

## 🧪 Testing Procedures

### End-to-End Test Flow

1. Upload track with potentially flagged content
2. Wait 5 minutes for cron job processing
3. Check track moderation status in database
4. If flagged, review in admin dashboard
5. Approve or reject content
6. Verify user receives notification (email + in-app + push)
7. Check track status updated correctly

**Full Checklist:** [PHASES_6_8_DEPLOYMENT.md](./PHASES_6_8_DEPLOYMENT.md#pre-deployment-testing-checklist)

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution | Reference |
|-------|----------|-----------|
| Cron job not running | Check Vercel Dashboard → Cron Jobs | [CRON_JOB_SETUP.md](./CRON_JOB_SETUP.md#troubleshooting) |
| Email not sending | Verify SendGrid API key and sender auth | [PHASES_6_8_DEPLOYMENT.md](./PHASES_6_8_DEPLOYMENT.md#troubleshooting) |
| Admin dashboard "Forbidden" | Grant admin role in user_roles table | [PHASES_6_8_DEPLOYMENT.md](./PHASES_6_8_DEPLOYMENT.md#admin-access) |
| Tracks stuck in "checking" | Reset via SQL query | [CRON_JOB_SETUP.md](./CRON_JOB_SETUP.md#issue-tracks-stuck-in-checking-status) |
| Push notifications not working | Verify expo_push_token saved | [MOBILE_TEAM_MODERATION_GUIDE.md](./MOBILE_TEAM_MODERATION_GUIDE.md#store-expo-push-token) |

---

## 📈 Monitoring & Maintenance

### Daily Checks
- Moderation queue size
- Email delivery rates (SendGrid dashboard)
- Cron job execution logs (Vercel)

### Weekly Reports
- Total tracks moderated
- Flag rate percentage
- Approval/rejection rates
- Top flag reasons

**Details:** [PHASES_6_8_DEPLOYMENT.md](./PHASES_6_8_DEPLOYMENT.md#monitoring--maintenance)

---

## 🔐 Security Considerations

1. **Admin Access Control** - Only grant admin role to trusted users
2. **API Authentication** - All admin endpoints check user role via RLS
3. **SendGrid API Key** - Never commit to git, rotate every 6 months
4. **Email Content** - All templates escape user input to prevent XSS
5. **Cron Secret** - Use strong random string, keep secure

**Full Guide:** [PHASES_6_8_DEPLOYMENT.md](./PHASES_6_8_DEPLOYMENT.md#security-considerations)

---

## ✅ Success Criteria

The moderation system is fully deployed when:

- ✅ Tracks are automatically checked within 5 minutes of upload
- ✅ Admin dashboard accessible at `/admin/moderation`
- ✅ Flagged content appears in admin queue
- ✅ Approve/reject actions work and send notifications
- ✅ Users receive email, in-app, and push notifications
- ✅ Email templates render correctly in all clients
- ✅ Rejected content filtered from public feed
- ✅ Appeal workflow functional (when implemented)
- ✅ No errors in Vercel or Supabase logs

---

## 📞 Support & Contact

### For Backend Questions
- Check Vercel logs: Dashboard → Logs
- Check Supabase logs: Dashboard → Database → Logs
- Review error messages in cron job logs

### For Mobile Questions
- Refer to [MOBILE_TEAM_MODERATION_GUIDE.md](./MOBILE_TEAM_MODERATION_GUIDE.md)
- Test API endpoints with Postman/Insomnia
- Contact backend team for API clarifications

### For Email Template Questions
- Review [email-templates.ts](./apps/web/src/lib/email-templates.ts)
- Test via `/api/send-email` endpoint
- Check SendGrid Activity dashboard

---

## 📝 Change Log

### Version 1.0 (December 17, 2025)
- ✅ Phases 1-8 complete implementation
- ✅ Admin dashboard with queue, review, and stats
- ✅ 6 responsive HTML email templates
- ✅ Multi-channel notification system
- ✅ Comprehensive documentation for web and mobile teams
- ✅ Testing procedures and troubleshooting guides

---

## 🚦 Implementation Status

| Component | Status | Documentation |
|-----------|--------|---------------|
| Database Migration | ✅ Complete | Phase 1 migration files |
| Audio Validation | ✅ Complete | [CRON_JOB_SETUP.md](./CRON_JOB_SETUP.md) |
| Whisper Transcription | ✅ Complete | [WHISPER_SETUP_GUIDE.md](./WHISPER_SETUP_GUIDE.md) |
| OpenAI Moderation | ✅ Complete | [CRON_JOB_SETUP.md](./CRON_JOB_SETUP.md) |
| Vercel Cron Job | ✅ Complete | [CRON_JOB_SETUP.md](./CRON_JOB_SETUP.md) |
| Admin APIs | ✅ Complete | [PHASES_6_8_DEPLOYMENT.md](./PHASES_6_8_DEPLOYMENT.md) |
| Admin Dashboard UI | ✅ Complete | `/admin/moderation/page.tsx` |
| Email Templates | ✅ Complete | [email-templates.ts](./apps/web/src/lib/email-templates.ts) |
| Notification Service | ✅ Complete | [PHASES_6_8_DEPLOYMENT.md](./PHASES_6_8_DEPLOYMENT.md) |
| Mobile Integration | ⏳ Pending | [MOBILE_TEAM_MODERATION_GUIDE.md](./MOBILE_TEAM_MODERATION_GUIDE.md) |
| Appeal Workflow | ⏳ Pending | To be implemented |

---

## 🎓 Learning Resources

### For New Team Members
1. Start with this index document
2. Read the overview section in each guide
3. Follow the Quick Start Guide for your team
4. Review the API endpoints reference
5. Complete the testing checklist

### Architecture Understanding
1. Review the [Content Moderation Flow](#content-moderation-flow) diagram
2. Understand [Database Schema Changes](#database-schema-changes)
3. Study the [Phase Breakdown](#phase-breakdown)
4. Review code in referenced files

---

*Content Moderation System Documentation Index - December 17, 2025*
*SoundBridge - Complete Implementation Guide*
