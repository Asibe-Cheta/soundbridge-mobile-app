/**
 * One-time broadcast push notification script.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/broadcast-push.js
 *
 * Or with a .env file: npx dotenv -e .env -- node scripts/broadcast-push.js
 *
 * What it does:
 *   1. Fetches all profiles that have an expo_push_token
 *   2. Sends the broadcast push notification in batches of 100 (Expo limit)
 *   3. Logs success / failure counts
 *
 * Safe to re-run: Expo deduplicates identical tokens, and we only log outcomes.
 */

const BROADCAST_ID = 'broadcast_location_notifications_v1';

const TITLE = 'Action Required — Keep Your Location & Notifications On';
const BODY =
  'Everything SoundBridge does for you depends on location and notifications being active ' +
  '— from getting discovered by fans nearby, to event recommendations, collaboration matching, ' +
  'real-time tips, and your AI Career Adviser. Open the app to read the full message.';

// ─── Load env ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function fetchAllPushTokens() {
  let allTokens = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=id,expo_push_token&expo_push_token=not.is.null&limit=${pageSize}&offset=${from}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase query failed: ${err}`);
    }

    const page = await res.json();
    if (!page.length) break;
    allTokens = allTokens.concat(page);
    from += pageSize;
    if (page.length < pageSize) break;
  }

  return allTokens;
}

async function sendBatch(messages) {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Expo push failed: ${err}`);
  }

  return res.json();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀  SoundBridge broadcast: ${BROADCAST_ID}\n`);

  // 1. Fetch tokens
  console.log('📡  Fetching push tokens from Supabase...');
  const profiles = await fetchAllPushTokens();
  console.log(`✅  Found ${profiles.length} users with a push token\n`);

  if (!profiles.length) {
    console.log('Nothing to send. Exiting.');
    return;
  }

  // 2. Build Expo push messages
  const messages = profiles.map(({ expo_push_token }) => ({
    to: expo_push_token,
    sound: 'default',
    title: TITLE,
    body: BODY,
    data: {
      type: 'broadcast',
      broadcastId: BROADCAST_ID,
    },
    priority: 'high',
    channelId: 'messages', // reuse existing Android channel
  }));

  // 3. Send in batches of 100
  const BATCH = 100;
  let sent = 0;
  let errors = 0;

  for (let i = 0; i < messages.length; i += BATCH) {
    const batch = messages.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;
    const totalBatches = Math.ceil(messages.length / BATCH);

    try {
      const result = await sendBatch(batch);
      const batchErrors = (result.data || []).filter(
        (r) => r.status === 'error'
      ).length;
      const batchOk = batch.length - batchErrors;
      sent += batchOk;
      errors += batchErrors;
      console.log(
        `  Batch ${batchNum}/${totalBatches}: ✅ ${batchOk} sent, ❌ ${batchErrors} failed`
      );
    } catch (err) {
      errors += batch.length;
      console.error(`  Batch ${batchNum}/${totalBatches}: ❌ Batch failed:`, err.message);
    }

    // Small delay to avoid rate limiting
    if (i + BATCH < messages.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`\n📊  Final results:`);
  console.log(`    ✅  Successfully sent: ${sent}`);
  console.log(`    ❌  Failed:            ${errors}`);
  console.log(`    📨  Total attempted:   ${messages.length}\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
