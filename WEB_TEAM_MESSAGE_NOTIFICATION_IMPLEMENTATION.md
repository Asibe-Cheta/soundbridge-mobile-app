# Push Notification Implementation for Messages

## Status: IMPLEMENTED - DB migrations applied

---

## Current State

| Component | Status |
|-----------|--------|
| Mobile: Push token registration | ✅ Working - sends to `POST /api/user/push-token` |
| Mobile: Message sending | ✅ Working - inserts into `messages` table |
| Mobile: Message receiving | ✅ Working - realtime subscription |
| Backend: Token storage | ✅ Working - stored in `profiles.expo_push_token` |
| Backend: Message notification trigger | ✅ Implemented via DB trigger |
| Backend: Notification processing | ✅ Working (via existing cron) |

---

## Implementation (Already Applied)

Message push notifications are implemented via DB trigger + scheduled notifications. When a new row is inserted into `messages`, the trigger schedules a `message` notification for the recipient (if they have a push token and message notifications enabled).

### Migration Files (Already Applied)

- `supabase/migrations/20260117000003_message_notifications.sql`
- `supabase/migrations/20260117000004_message_notification_trigger.sql`

```sql
-- Create function to notify on new message
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_token TEXT;
  sender_name TEXT;
  notification_enabled BOOLEAN;
BEGIN
  -- Get recipient's push token
  SELECT expo_push_token INTO recipient_token
  FROM profiles
  WHERE id = NEW.recipient_id;

  -- Get recipient's notification preferences
  SELECT COALESCE(message_notifications_enabled, true) INTO notification_enabled
  FROM notification_preferences
  WHERE user_id = NEW.recipient_id;

  -- Get sender's display name
  SELECT COALESCE(display_name, username) INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Only proceed if recipient has token and notifications enabled
  IF recipient_token IS NOT NULL AND notification_enabled THEN
    -- Insert into scheduled_notifications for immediate processing
    INSERT INTO scheduled_notifications (
      user_id,
      notification_type,
      title,
      body,
      data,
      scheduled_for,
      status
    ) VALUES (
      NEW.recipient_id,
      'message',
      'New message from ' || sender_name,
      LEFT(NEW.content, 100), -- Truncate long messages
      jsonb_build_object(
        'type', 'message',
        'messageId', NEW.id,
        'senderId', NEW.sender_id,
        'conversationId', LEAST(NEW.sender_id::text, NEW.recipient_id::text) || '_' || GREATEST(NEW.sender_id::text, NEW.recipient_id::text)
      ),
      NOW(), -- Schedule for immediate processing
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS on_new_message_notify ON messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_message();
```

### API Endpoint (Fallback Only)

The API endpoint is only needed if the trigger approach fails in a specific environment.

```typescript
// apps/web/app/api/notifications/message/route.ts
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export async function POST(request: Request) {
  const { messageId, recipientId, senderId, content } = await request.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get recipient's push token
  const { data: recipient } = await supabase
    .from('profiles')
    .select('expo_push_token, username')
    .eq('id', recipientId)
    .single();

  if (!recipient?.expo_push_token) {
    return Response.json({ sent: false, reason: 'No push token' });
  }

  // Check notification preferences
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('message_notifications_enabled')
    .eq('user_id', recipientId)
    .single();

  if (prefs?.message_notifications_enabled === false) {
    return Response.json({ sent: false, reason: 'Notifications disabled' });
  }

  // Get sender's name
  const { data: sender } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', senderId)
    .single();

  const senderName = sender?.display_name || sender?.username || 'Someone';

  // Send notification
  if (!Expo.isExpoPushToken(recipient.expo_push_token)) {
    return Response.json({ sent: false, reason: 'Invalid token' });
  }

  try {
    const ticket = await expo.sendPushNotificationsAsync([{
      to: recipient.expo_push_token,
      sound: 'default',
      title: `New message from ${senderName}`,
      body: content.substring(0, 100),
      data: {
        type: 'message',
        messageId,
        senderId,
        conversationId: [senderId, recipientId].sort().join('_'),
      },
      channelId: 'messages', // Android channel
    }]);

    return Response.json({ sent: true, ticket });
  } catch (error) {
    console.error('Push error:', error);
    return Response.json({ sent: false, error: error.message });
  }
}
```

---

## Mobile Deep Link Handling

The mobile app already handles message notifications. When a user taps the notification, it should navigate to the conversation:

```typescript
// Already in NotificationService.ts (current mobile)
case 'message':
  if (data.conversationId) {
    navigation.navigate('Chat', { conversationId: data.conversationId });
  } else {
    navigation.navigate('Messages');
  }
  break;
```

---

## Notification Preferences Column

Ensure the `user_notification_preferences` table has the message column:

```sql
ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS message_notifications_enabled BOOLEAN DEFAULT true;
```

---

## Testing

1. **Send a message from User A to User B**
2. **Check if scheduled_notification was created:**
   ```sql
   SELECT * FROM scheduled_notifications
   WHERE notification_type = 'message'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
3. **Verify the cron job processes it** (should happen within 5 minutes)
4. **User B should receive a push notification**

## If Push Notifications Still Fail

Likely causes:
- Migrations not applied in production.
- Cron job not processing `scheduled_notifications`.

---

## Priority

**HIGH** - Messaging is a core feature. Users expect to be notified when they receive messages, especially from creators they're trying to contact.

---

*Document updated: January 18, 2026*
