/**
 * Expo Push Notification Helper
 * Sends push notifications using Expo's API
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

/**
 * Send push notifications via Expo API
 * @param messages Array of push messages to send
 * @returns Array of receipts
 */
export async function sendPushNotifications(
  messages: PushMessage[]
): Promise<PushReceipt[]> {
  if (messages.length === 0) {
    return [];
  }

  // Split into chunks of 100
  const chunks = chunkArray(messages, CHUNK_SIZE);
  const allReceipts: PushReceipt[] = [];

  for (const chunk of chunks) {
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

        // Return error receipts for this chunk
        allReceipts.push(...chunk.map(() => ({
          status: 'error' as const,
          message: `Expo API error: ${response.status}`
        })));
        continue;
      }

      const { data } = await response.json();
      allReceipts.push(...data);

    } catch (error) {
      console.error('Error sending push notifications:', error);

      // Return error receipts for this chunk
      allReceipts.push(...chunk.map(() => ({
        status: 'error' as const,
        message: error.message
      })));
    }
  }

  return allReceipts;
}

/**
 * Split array into chunks
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
