# Push Notification Implementation Required

## Status: CRITICAL - Notifications Not Being Sent

The event discovery system schedules notifications, but they're not being delivered to users.

---

## Current State

| Component | Status |
|-----------|--------|
| Mobile: Push token registration | ✅ Working - sends to `POST /api/user/push-token` |
| Backend: Token storage | ❓ Needs verification |
| Backend: Notification scheduling | ✅ Working - trigger schedules notifications |
| Backend: Notification processing | ❌ **NOT IMPLEMENTED** - cron runs but doesn't send |
| Backend: Expo Push API integration | ❌ **NOT IMPLEMENTED** |

---

## What Mobile Sends

### Push Token Registration
```
POST /api/user/push-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios",
  "deviceId": "abc123",
  "deviceName": "iPhone 14 Pro"
}
```

The backend should store this in `profiles.expo_push_token` or a dedicated `push_tokens` table.

---

## Required Implementation

### 1. Verify Token Storage

Check if push tokens are being stored:
```sql
SELECT id, username, expo_push_token
FROM profiles
WHERE expo_push_token IS NOT NULL
LIMIT 10;
```

If `expo_push_token` column doesn't exist:
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMP WITH TIME ZONE;
```

### 2. Implement `POST /api/user/push-token`

```typescript
// apps/web/app/api/user/push-token/route.ts
export async function POST(request: Request) {
  const { token, platform, deviceId, deviceName } = await request.json();

  // Get user from auth
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Store token
  const { error } = await supabase
    .from('profiles')
    .update({
      expo_push_token: token,
      push_token_updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
```

### 3. Implement `process_pending_notifications` Cron

The cron endpoint at `/api/cron/process-pending-notifications` needs to:

```typescript
// apps/web/app/api/cron/process-pending-notifications/route.ts
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Get pending notifications that are due
  const { data: pendingNotifications, error } = await supabase
    .from('scheduled_notifications')
    .select(`
      id,
      user_id,
      event_id,
      notification_type,
      title,
      body,
      data,
      scheduled_for,
      events (
        id,
        title,
        event_date,
        location
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(100);

  if (error || !pendingNotifications?.length) {
    return Response.json({ processed: 0 });
  }

  // 2. Get push tokens for these users
  const userIds = [...new Set(pendingNotifications.map(n => n.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, expo_push_token')
    .in('id', userIds)
    .not('expo_push_token', 'is', null);

  const tokenMap = new Map(profiles?.map(p => [p.id, p.expo_push_token]) || []);

  // 3. Build push messages
  const messages: ExpoPushMessage[] = [];
  const notificationIds: string[] = [];

  for (const notification of pendingNotifications) {
    const pushToken = tokenMap.get(notification.user_id);

    if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
      // Mark as failed - no valid token
      await supabase
        .from('scheduled_notifications')
        .update({ status: 'failed', error: 'No valid push token' })
        .eq('id', notification.id);
      continue;
    }

    messages.push({
      to: pushToken,
      sound: 'default',
      title: notification.title || `Event: ${notification.events?.title}`,
      body: notification.body || `${notification.events?.title} is coming up!`,
      data: {
        type: 'event_reminder',
        eventId: notification.event_id,
        notificationType: notification.notification_type,
        ...notification.data,
      },
      channelId: 'events', // Android channel
    });

    notificationIds.push(notification.id);
  }

  // 4. Send via Expo Push API
  const chunks = expo.chunkPushNotifications(messages);
  let successCount = 0;
  let failCount = 0;

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

      // Process results
      for (let i = 0; i < ticketChunk.length; i++) {
        const ticket = ticketChunk[i];
        const notificationId = notificationIds[i];

        if (ticket.status === 'ok') {
          await supabase
            .from('scheduled_notifications')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              expo_receipt_id: ticket.id
            })
            .eq('id', notificationId);
          successCount++;
        } else {
          await supabase
            .from('scheduled_notifications')
            .update({
              status: 'failed',
              error: ticket.message
            })
            .eq('id', notificationId);
          failCount++;
        }
      }
    } catch (error) {
      console.error('Expo push error:', error);
      failCount += chunk.length;
    }
  }

  return Response.json({
    processed: messages.length,
    sent: successCount,
    failed: failCount
  });
}
```

### 4. Install Expo Server SDK

```bash
cd apps/web
npm install expo-server-sdk
```

### 5. Update `scheduled_notifications` Table

Add columns if missing:
```sql
ALTER TABLE scheduled_notifications
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE scheduled_notifications
ADD COLUMN IF NOT EXISTS body TEXT;

ALTER TABLE scheduled_notifications
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE scheduled_notifications
ADD COLUMN IF NOT EXISTS expo_receipt_id TEXT;

ALTER TABLE scheduled_notifications
ADD COLUMN IF NOT EXISTS error TEXT;
```

---

## Testing

### 1. Verify tokens are stored
```sql
SELECT COUNT(*) FROM profiles WHERE expo_push_token IS NOT NULL;
```

### 2. Check scheduled notifications
```sql
SELECT * FROM scheduled_notifications
WHERE status = 'pending'
AND scheduled_for <= NOW()
LIMIT 10;
```

### 3. Manually trigger cron
```bash
curl -X GET "https://www.soundbridge.live/api/cron/process-pending-notifications" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 4. Check sent notifications
```sql
SELECT * FROM scheduled_notifications
WHERE status = 'sent'
ORDER BY sent_at DESC
LIMIT 10;
```

---

## Notification Types

The system schedules these notification types:
- `event_2_weeks` - 2 weeks before event
- `event_1_week` - 1 week before event
- `event_24_hours` - 24 hours before event
- `event_day` - Day of event

Each should have appropriate title/body text generated when scheduled.

---

## Priority

**CRITICAL** - This is the core of the Event Discovery System (MOAT #1 from the business plan). Without working push notifications, creators cannot reach their target audience for free.

---

*Document created: January 17, 2026*
