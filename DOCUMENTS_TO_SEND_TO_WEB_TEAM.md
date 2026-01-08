# Documents to Send to Web Team

**Date:** January 8, 2026
**From:** Mobile Team

---

## Send These 4 Documents

### 1. **FOR_WEB_TEAM_EVENT_SYSTEM_COMPLETE.md** (PRIMARY)
**Priority:** HIGH - Start here
**Contains:**
- Complete event location system (country-based address fields)
- Event notification webhook overview
- What mobile app already has (for reference)
- Implementation guide for web app
- Code examples for React/Next.js
- API requirements
- Testing instructions

**Why:** This is the main implementation guide. Everything they need to build the event creation form and understand the notification system.

---

### 2. **BACKEND_EVENT_NOTIFICATION_WEBHOOK.md** (TECHNICAL REFERENCE)
**Priority:** HIGH - For backend deployment
**Contains:**
- Complete Edge Function code (TypeScript/Deno)
- Database function implementations
- Database trigger setup
- Testing procedures
- Monitoring and debugging
- Troubleshooting guide

**Why:** This has the actual code they need to deploy the notification webhook. You've already run most of the SQL, but they need to:
- Deploy the Edge Function
- Create the database trigger with actual credentials (YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY)

---

### 3. **EVENT_NOTIFICATION_SYSTEM_STATUS.md** (STATUS OVERVIEW)
**Priority:** MEDIUM - For understanding current state
**Contains:**
- What's working (mobile app)
- What's missing (backend webhook)
- Complete status report
- Data structures
- End-to-end test plan
- Verification queries

**Why:** Helps them understand what's already done vs. what needs to be done.

---

### 4. **EVENT_NOTIFICATION_DEPLOYMENT_CHECKLIST.md** (DEPLOYMENT GUIDE)
**Priority:** MEDIUM - For deployment workflow
**Contains:**
- Step-by-step deployment checklist
- Database schema verification
- Function deployment steps
- Trigger creation
- Testing procedures
- Troubleshooting

**Why:** Provides a clear checklist they can follow during deployment.

---

## What You've Already Done ✅

You mentioned you ran most SQL except:
- Lines requiring `YOUR_SERVICE_ROLE_KEY` and `YOUR_PROJECT_REF`
- Lines with `REAL_TOKEN_FROM_APP`
- Test queries with `'user-a-id'`, `'user-b-id'`, `'test-event-id'`

**This is correct!** Those are placeholders that need to be replaced with actual values:

### What They Still Need to Do:

1. **Deploy Edge Function:**
   ```bash
   supabase functions deploy send-event-notifications
   ```

2. **Create Database Trigger with Real Credentials:**
   ```sql
   CREATE OR REPLACE FUNCTION trigger_event_notifications()
   RETURNS TRIGGER AS $$
   DECLARE
     function_url TEXT := 'https://[THEIR_PROJECT_REF].supabase.co/functions/v1/send-event-notifications';
     service_role_key TEXT := '[THEIR_SERVICE_ROLE_KEY]';  -- From Supabase Dashboard
   BEGIN
     -- ... (rest of trigger code from BACKEND_EVENT_NOTIFICATION_WEBHOOK.md)
   ```

3. **Test with Real Users:**
   - They'll need to use actual user IDs from their database
   - Push tokens come from real mobile devices (can't be manually created)

---

## Email/Message Template

Here's what you can send to the web team:

---

**Subject:** Event System Implementation - Location + Notifications

Hi Web Team,

The mobile app has implemented two critical features for the event system:

1. **Intelligent Event Location System** - Country-based address fields (11 countries supported)
2. **Event Notification Webhook** - Automatic push notifications to nearby users

**Status:**
- ✅ Mobile app: 100% complete
- ❌ Web app: Needs implementation
- ⚠️ Backend webhook: Needs final deployment (database work mostly done)

**What You Need to Implement:**

1. **Event Creation Form** (4-6 hours)
   - Country selector with dynamic address fields
   - Geocoding to get latitude/longitude
   - Extract city field separately (CRITICAL for notifications)
   - Multi-currency pricing

2. **Backend Webhook Deployment** (2 hours)
   - Deploy Edge Function to Supabase
   - Create database trigger with your credentials
   - Test end-to-end

**Documents Attached:**
1. `FOR_WEB_TEAM_EVENT_SYSTEM_COMPLETE.md` - **START HERE** (main guide)
2. `BACKEND_EVENT_NOTIFICATION_WEBHOOK.md` - Complete webhook code
3. `EVENT_NOTIFICATION_SYSTEM_STATUS.md` - Current status
4. `EVENT_NOTIFICATION_DEPLOYMENT_CHECKLIST.md` - Deployment checklist

**Critical Fields to Send:**
Your backend API must receive these fields from the event creation form:
- `city` ← REQUIRED for notifications
- `category` ← REQUIRED for notifications
- `latitude`, `longitude` ← Recommended (enables 20km radius)
- `country`, `location` ← Required for display

**Database Work:**
Most of the database setup is already done. You just need to:
1. Deploy the Edge Function (code in BACKEND_EVENT_NOTIFICATION_WEBHOOK.md)
2. Create the database trigger with YOUR credentials (YOUR_PROJECT_REF, YOUR_SERVICE_ROLE_KEY)

**Testing:**
Once deployed, when anyone creates an event (mobile OR web), users in that city who like that event category will automatically receive push notifications on their mobile devices.

**Questions?**
Let us know if you need help with anything!

Mobile Team

---

## Additional Notes for You

### About the Placeholders:

**`YOUR_SERVICE_ROLE_KEY` and `YOUR_PROJECT_REF`:**
- These are specific to your Supabase project
- Web team should have access to these (same project)
- They can find them in Supabase Dashboard → Settings → API

**`REAL_TOKEN_FROM_APP`:**
- These are Expo push tokens
- Can ONLY be obtained from real mobile devices
- Users get tokens automatically when they log into the mobile app
- Can't be manually created or faked

**Test user IDs (`'user-a-id'`, `'user-b-id'`):**
- These are just examples
- Replace with actual user IDs from your `profiles` table
- Query: `SELECT id, username FROM profiles LIMIT 5;`

**Test event ID (`'test-event-id'`):**
- This is the ID of the event you create for testing
- It will be generated when you insert the test event
- Use the actual UUID returned from the INSERT

### What Happens After Deployment:

1. User creates event via web app (or mobile app)
2. Web app sends event data to backend API including `city` and `category` fields
3. Backend inserts event into `events` table
4. Database trigger automatically fires
5. Trigger calls Edge Function (webhook)
6. Edge Function finds nearby users who like that category
7. Edge Function sends push notifications via Expo
8. Mobile users receive notifications
9. Tapping notification opens EventDetailsScreen

The system works automatically once deployed!

---

## Summary

**Send these 4 files:**
1. FOR_WEB_TEAM_EVENT_SYSTEM_COMPLETE.md (main guide)
2. BACKEND_EVENT_NOTIFICATION_WEBHOOK.md (webhook code)
3. EVENT_NOTIFICATION_SYSTEM_STATUS.md (status overview)
4. EVENT_NOTIFICATION_DEPLOYMENT_CHECKLIST.md (deployment steps)

**They need to:**
1. Implement event creation form with country-based address fields
2. Deploy Edge Function
3. Create database trigger with their credentials
4. Test

**Estimated time:** 6-8 hours total

**Result:** Automatic push notifications when events are created!
