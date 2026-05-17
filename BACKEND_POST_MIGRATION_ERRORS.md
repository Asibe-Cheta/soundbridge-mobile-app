# Backend Errors After Event Discovery Migration

## Status Update (January 17, 2026)

| Issue | Status |
|-------|--------|
| Event Creation (trigger error) | ✅ FIXED |
| Category Enum Mapping | ✅ FIXED |
| Notification Cron Job | ✅ FIXED |
| Location Update API | ✅ FIXED |
| **Push Notifications Not Received** | ❓ **INVESTIGATING** |

---

## All API Issues Resolved

The web team has fixed all API issues:
- Event creation works (trigger fails gracefully)
- Category mapping handled by backend
- Cron job runs every 5 minutes
- Location API accepts coordinates

### New Health Check Endpoint
```
GET /api/user/location/health
Authorization: Bearer <token>

Response:
{
  "latitude": 51.4541973,
  "longitude": -0.9624704,
  "locationUpdatedAt": "2026-01-17T15:30:00Z"
}
```

Mobile app can call `NotificationService.getInstance().checkLocationHealth()` to verify.

---

## Current Issue: Push Notifications Not Received

### Debugging Steps

**1. Check if notifications are scheduled in database:**
```sql
SELECT * FROM scheduled_notifications
WHERE status = 'pending'
ORDER BY scheduled_for DESC
LIMIT 10;
```

**2. Check if the event has a scheduled notification:**
```sql
SELECT sn.*, e.title as event_title
FROM scheduled_notifications sn
JOIN events e ON sn.event_id = e.id
WHERE e.created_at > NOW() - INTERVAL '1 day'
ORDER BY sn.created_at DESC;
```

**3. Check if user has push token registered:**
```sql
SELECT id, username, push_token, push_token_updated_at
FROM profiles
WHERE id = '<user_id>';
```

**4. Check cron job execution:**
- Verify cron is deployed: Check Vercel dashboard → Cron Jobs
- Check function logs for `/api/cron/process-pending-notifications`

**5. Check if user matches notification criteria:**
```sql
-- Does user have matching event category preferences?
SELECT preferred_event_genres, event_notifications_enabled
FROM notification_preferences
WHERE user_id = '<user_id>';
```

### Potential Issues

1. **Push token not stored** - Mobile needs to register device token with backend
2. **Cron job not running** - Check Vercel cron deployment
3. **No matching preferences** - User's event preferences don't match event category
4. **Notification already processed** - Check if status changed from 'pending' to 'sent' or 'failed'
5. **Push service error** - Check if Expo push notifications or APNs are configured

### Mobile Push Token Registration
The mobile app should send the Expo push token to the backend:
```typescript
// After getting permission and token
const pushToken = (await Notifications.getExpoPushTokenAsync()).data;
await fetch('/api/user/push-token', {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ pushToken })
});
```

---

## All Fixed Issues

### 1. Event Creation Trigger (FIXED)
Trigger now fails gracefully and returns `NEW` even if scheduling errors occur.

### 2. Category Enum Mapping (FIXED)
Backend API validates display format and maps internally.

### 3. Notification Cron Job (FIXED)
Added `/api/cron/process-pending-notifications` running every 5 minutes.

### 4. Location Update API (FIXED)
Now accepts latitude/longitude and writes to profiles with location_updated_at.
Health check available at `GET /api/user/location/health`.

---

*Last updated: January 17, 2026*
