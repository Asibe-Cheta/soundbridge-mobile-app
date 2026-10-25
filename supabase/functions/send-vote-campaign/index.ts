// "Vote for SoundBridge" campaign push sender (VOTE_FOR_SOUNDBRIDGE.MD Step 5).
//
// Manually invoked — not on a cron trigger. The doc requires "nothing sends
// automatically" and an explicit CONFIRM per real send, which this satisfies more
// directly as a manually-triggered function than as a scheduled job: invoke it once
// per push, at the chosen moment, with confirm:true.
//
// POST body: { pushNumber: <any number defined in PUSH_COPY below>, confirm?: boolean }
// - confirm omitted or false => DRY RUN: returns the eligible recipient count only,
//   sends nothing, writes nothing.
// - confirm: true => sends for real, and records a vote_campaign_pushes row per
//   successfully-sent user so a re-run (confirm:true again, e.g. after a crash)
//   can never double-send the same push to the same user.
//
// "Already voted" is tracked properly now (vote_campaign_voted, written by the
// client when the user taps "I've voted" on the Vote screen or home banner) rather
// than the original vote_now_tapped analytics proxy, which only proved a user opened
// the link, not that they completed voting. Those users are excluded from every push.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendPushNotifications } from './_lib/expo.ts'

// Keep in sync with src/config/voteCampaign.ts — Edge Functions deploy separately
// from the mobile app bundle and can't import its TS config directly.
// Voting closes Thursday 29 October 2026; 00:00 UTC on the 30th is the safe/early
// side of "end of day on the 29th". Corrected 2026-10-21 — was wrongly set to 5 Nov.
const VOTE_CLOSES_AT = new Date('2026-10-30T00:00:00Z');
const VOTE_URL = 'https://www.theeasies.com/vote?n=justice-asibe';

// Extended 2026-10-24 from the original hard cap of 3 to a 9-push schedule — pushes
// 4-9 added here once their copy is finalized (src/config/voteCampaign.ts PUSH_SCHEDULE
// is the source of truth; kept in sync by hand since Edge Functions can't import the
// mobile app's TS config directly, see note above).
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
    body: "Closes 29 Oct. It's free, it's quick, and when SoundBridge wins, creators and fans win with it 🙏🏾",
  },
  // Pushes 4-9, added 2026-10-24. Do not edit 1-3 or resend them (already sent 21/22/23 Oct).
  4: {
    title: 'Your vote counts more than you think',
    body: "The public vote carries 80% of the weighting. It's free and takes a minute.",
  },
  5: {
    title: 'Our win is your win',
    body: 'If SoundBridge wins, every creator here wins. Vote and tell one friend.',
  },
  6: {
    title: '2 days to go',
    body: 'Voting closes Thursday night. Have you voted yet?',
  },
  7: {
    title: 'Closing tomorrow',
    body: "Last full day to vote. It's free, and it's quick.",
  },
  8: {
    title: 'Closes tonight',
    body: 'The ESEY vote ends at 11:59pm GMT. Vote now.',
  },
  9: {
    title: 'Final hours',
    body: 'A few hours left. One vote from you helps.',
  },
};

// Days with more than one sanctioned push. Every other day caps at 1 push per user —
// enforced below regardless of which push numbers are actually sent that day, as a
// safety net against an accidental same-day double-send, not just a scheduling guideline.
const MULTI_PUSH_DAYS: Record<string, number> = {
  '2026-10-29': 2, // pushes 8 and 9
};

// Allowed push numbers are whatever PUSH_COPY actually defines — not a separate
// hardcoded list, so adding push 4+ here is the only change needed to make it a
// valid pushNumber.
const ALLOWED_PUSH_NUMBERS = Object.keys(PUSH_COPY).map(Number);

interface EligibleUser {
  id: string;
  expo_push_token: string;
}

serve(async (req) => {
  try {
    const { pushNumber, confirm } = await req.json();

    if (!ALLOWED_PUSH_NUMBERS.includes(pushNumber)) {
      return json({ success: false, error: `pushNumber must be one of: ${ALLOWED_PUSH_NUMBERS.join(', ')}` }, 400);
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
    // Three separate queries joined in code, not a PostgREST embedded select — there's no
    // detectable FK relationship between profiles and notification_preferences in the
    // schema cache (confirmed via a real dry run), so profiles.select('...,
    // notification_preferences(enabled)') fails outright rather than just omitting the join.
    const { data: candidates, error: candidatesError } = await supabase
      .from('profiles')
      .select('id, expo_push_token')
      .not('expo_push_token', 'is', null);

    if (candidatesError) {
      return json({ success: false, error: candidatesError.message }, 500);
    }

    const { data: disabledPrefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq('enabled', false);

    if (prefsError) {
      return json({ success: false, error: prefsError.message }, 500);
    }
    const disabledIds = new Set((disabledPrefs ?? []).map((r: { user_id: string }) => r.user_id));

    // Added 2026-10-24: users who tapped "I've voted" (Vote screen or home banner)
    // are skipped on all future pushes, per the extended campaign's own request —
    // more precise than the old vote_now_tapped proxy, which only proves a user
    // opened the link, not that they actually completed voting.
    const { data: voted, error: votedError } = await supabase
      .from('vote_campaign_voted')
      .select('user_id');

    if (votedError) {
      return json({ success: false, error: votedError.message }, 500);
    }
    const votedIds = new Set((voted ?? []).map((r: { user_id: string }) => r.user_id));

    const { data: alreadySent, error: alreadySentError } = await supabase
      .from('vote_campaign_pushes')
      .select('user_id')
      .eq('push_number', pushNumber);

    if (alreadySentError) {
      return json({ success: false, error: alreadySentError.message }, 500);
    }
    const alreadySentIds = new Set((alreadySent ?? []).map((r: { user_id: string }) => r.user_id));

    // Max one push per user per calendar day (UTC), except the days listed in
    // MULTI_PUSH_DAYS. Counts any vote campaign push already sent today, not just
    // this pushNumber, so an accidental same-day double-trigger of two different
    // push numbers still can't double-notify someone.
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const dailyCap = MULTI_PUSH_DAYS[today] ?? 1;
    const { data: sentToday, error: sentTodayError } = await supabase
      .from('vote_campaign_pushes')
      .select('user_id')
      .gte('sent_at', `${today}T00:00:00Z`)
      .lt('sent_at', `${today}T23:59:59.999Z`);

    if (sentTodayError) {
      return json({ success: false, error: sentTodayError.message }, 500);
    }
    const sentTodayCountByUser = new Map<string, number>();
    for (const row of sentToday ?? []) {
      const id = (row as { user_id: string }).user_id;
      sentTodayCountByUser.set(id, (sentTodayCountByUser.get(id) ?? 0) + 1);
    }
    const dailyCapReachedIds = new Set(
      [...sentTodayCountByUser.entries()].filter(([, count]) => count >= dailyCap).map(([id]) => id)
    );

    // Bucket every push-token holder into exactly one outcome, in this priority
    // order, so dry-run counts always add up to the total candidate pool.
    const skipped = { alreadyReceivedThisPush: 0, notificationsDisabled: 0, alreadyVoted: 0, dailyCapReached: 0 };
    const eligible: EligibleUser[] = [];
    for (const row of (candidates ?? []) as any[]) {
      if (!row.expo_push_token) continue;
      if (alreadySentIds.has(row.id)) { skipped.alreadyReceivedThisPush++; continue; }
      if (disabledIds.has(row.id)) { skipped.notificationsDisabled++; continue; }
      if (votedIds.has(row.id)) { skipped.alreadyVoted++; continue; }
      if (dailyCapReachedIds.has(row.id)) { skipped.dailyCapReached++; continue; }
      eligible.push({ id: row.id, expo_push_token: row.expo_push_token });
    }

    if (!confirm) {
      return json({ success: true, dryRun: true, pushNumber, eligibleCount: eligible.length, skipped });
    }

    if (eligible.length === 0) {
      return json({ success: true, dryRun: false, pushNumber, sent: 0, failed: 0, skipped });
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

    return json({ success: true, dryRun: false, pushNumber, sent, failed, skipped });
  } catch (error) {
    console.error('send-vote-campaign error:', error);
    return json({ success: false, error: error.message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, status });
}
