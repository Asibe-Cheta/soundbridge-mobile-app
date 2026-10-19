// "Vote for SoundBridge" campaign push sender (VOTE_FOR_SOUNDBRIDGE.MD Step 5).
//
// Manually invoked — not on a cron trigger. The doc requires "nothing sends
// automatically" and an explicit CONFIRM per real send, which a one-off 3-push
// campaign satisfies more directly as a manually-triggered function than as a
// scheduled job: invoke it once per push, at the chosen moment, with confirm:true.
//
// POST body: { pushNumber: 1 | 2 | 3, confirm?: boolean }
// - confirm omitted or false => DRY RUN: returns the eligible recipient count only,
//   sends nothing, writes nothing.
// - confirm: true => sends for real, and records a vote_campaign_pushes row per
//   successfully-sent user so a re-run (confirm:true again, e.g. after a crash)
//   can never double-send the same push to the same user.
//
// Known limitation (documented, not silently skipped): the doc asks to skip pushes
// 2/3 for anyone who already tapped "Vote now", using the vote_now_tapped analytics
// event as the proxy. That event goes through analyticsService -> POST
// {apiUrl}/api/analytics/events on the separate web/API backend, which this Supabase
// Edge Function has no access to query. Per the doc's own explicit fallback ("if this
// is not trackable, say so and send to everyone"), this sends to everyone eligible
// regardless of whether they've already voted.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendPushNotifications } from './_lib/expo.ts'

// Keep in sync with src/config/voteCampaign.ts — Edge Functions deploy separately
// from the mobile app bundle and can't import its TS config directly.
const VOTE_CLOSES_AT = new Date('2026-11-05T00:00:00Z');
const VOTE_URL = 'https://www.theeasies.com/vote';

const PUSH_COPY: Record<number, { title: string; body: string }> = {
  1: {
    title: 'We just got shortlisted 🎉',
    body: "This one's for you too. A free vote takes a minute and helps us build more for creators. Tap in 👉",
  },
  2: {
    title: 'One week left ⏳',
    body: 'Free vote, one minute, big difference for creators on SoundBridge. Got a minute?',
  },
  3: {
    title: 'Last call to vote 🔔',
    body: "Closes 5 Nov. It's free, it's quick, and when SoundBridge wins, creators and fans win with it 🙏🏾",
  },
};

interface EligibleUser {
  id: string;
  expo_push_token: string;
}

serve(async (req) => {
  try {
    const { pushNumber, confirm } = await req.json();

    if (![1, 2, 3].includes(pushNumber)) {
      return json({ success: false, error: 'pushNumber must be 1, 2, or 3' }, 400);
    }

    if (Date.now() >= VOTE_CLOSES_AT.getTime()) {
      return json({ success: false, error: 'Voting has closed — refusing to send.' }, 200);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Eligible: has a push token, hasn't already received this specific push number,
    // and notification_preferences.enabled isn't explicitly false (missing row or
    // null = enabled by default, matching the mobile app's own ?? true fallback).
    const { data: candidates, error: candidatesError } = await supabase
      .from('profiles')
      .select('id, expo_push_token, notification_preferences(enabled)')
      .not('expo_push_token', 'is', null);

    if (candidatesError) {
      return json({ success: false, error: candidatesError.message }, 500);
    }

    const { data: alreadySent, error: alreadySentError } = await supabase
      .from('vote_campaign_pushes')
      .select('user_id')
      .eq('push_number', pushNumber);

    if (alreadySentError) {
      return json({ success: false, error: alreadySentError.message }, 500);
    }
    const alreadySentIds = new Set((alreadySent ?? []).map((r: { user_id: string }) => r.user_id));

    const eligible: EligibleUser[] = (candidates ?? [])
      .filter((row: any) => {
        if (!row.expo_push_token) return false;
        if (alreadySentIds.has(row.id)) return false;
        const prefs = Array.isArray(row.notification_preferences) ? row.notification_preferences[0] : row.notification_preferences;
        return prefs?.enabled !== false;
      })
      .map((row: any) => ({ id: row.id, expo_push_token: row.expo_push_token }));

    if (!confirm) {
      return json({ success: true, dryRun: true, pushNumber, eligibleCount: eligible.length });
    }

    if (eligible.length === 0) {
      return json({ success: true, dryRun: false, pushNumber, sent: 0, failed: 0 });
    }

    const { title, body } = PUSH_COPY[pushNumber];
    const deepLink = 'soundbridge://campaigns/vote';
    const messages = eligible.map(u => ({
      to: u.expo_push_token,
      sound: 'default',
      title,
      body,
      data: { type: 'campaign', campaignId: 'vote', pushNumber, deepLink, url: deepLink, voteUrl: VOTE_URL },
      url: deepLink,
      channelId: 'campaigns',
    }));

    const receipts = await sendPushNotifications(messages);

    let sent = 0;
    let failed = 0;
    const sentRows: { user_id: string; push_number: number }[] = [];

    for (let i = 0; i < eligible.length; i++) {
      if (receipts[i]?.status === 'ok') {
        sent++;
        sentRows.push({ user_id: eligible[i].id, push_number: pushNumber });
      } else {
        failed++;
        console.error(`Failed to send vote push ${pushNumber} to ${eligible[i].id}:`, receipts[i]?.message);
      }
    }

    if (sentRows.length > 0) {
      // onConflict matches the table's UNIQUE(user_id, push_number) — safe to re-run.
      const { error: insertError } = await supabase
        .from('vote_campaign_pushes')
        .upsert(sentRows, { onConflict: 'user_id,push_number', ignoreDuplicates: true });
      if (insertError) {
        console.error('Failed to record sent vote pushes:', insertError.message);
      }
    }

    return json({ success: true, dryRun: false, pushNumber, sent, failed });
  } catch (error) {
    console.error('send-vote-campaign error:', error);
    return json({ success: false, error: error.message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, status });
}
