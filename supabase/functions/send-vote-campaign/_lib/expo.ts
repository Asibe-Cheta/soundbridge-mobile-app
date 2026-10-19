/**
 * Expo Push Notification Helper — copied from supabase/functions/send-event-notifications/_lib/expo.ts
 * (Supabase Edge Functions can't import across function directories in local dev, so each
 * function carries its own copy of this small helper; keep them in sync if either changes.)
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100; // Expo recommends max 100 messages per request
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN') ?? '';

interface PushMessage {
  to: string;
  sound?: string;
  title: string;
  body: string;
  data?: any;
  channelId?: string;
  url?: string;
}

interface PushReceipt {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: any;
}

export async function sendPushNotifications(
  messages: PushMessage[]
): Promise<PushReceipt[]> {
  if (messages.length === 0) {
    return [];
  }

  const chunks = chunkArray(messages, CHUNK_SIZE);
  const allReceipts: PushReceipt[] = [];

  for (const chunk of chunks) {
    const receipts = await sendChunkWithRetry(chunk);
    allReceipts.push(...receipts);
  }

  return allReceipts;
}

async function sendChunkWithRetry(chunk: PushMessage[], attempt = 1): Promise<PushReceipt[]> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };
    if (EXPO_ACCESS_TOKEN) {
      headers['Authorization'] = `Bearer ${EXPO_ACCESS_TOKEN}`;
    }

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Expo API error:', response.status, errorText);
      if (attempt < 2) {
        console.log('Retrying chunk once...');
        return sendChunkWithRetry(chunk, attempt + 1);
      }
      return chunk.map(() => ({ status: 'error' as const, message: `Expo API error: ${response.status}` }));
    }

    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending push notifications:', error);
    if (attempt < 2) {
      console.log('Retrying chunk once...');
      return sendChunkWithRetry(chunk, attempt + 1);
    }
    return chunk.map(() => ({ status: 'error' as const, message: error.message }));
  }
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
