// Platform growth-milestone push notifications ("We just hit over 3,000 users
// on SoundBridge") — server-side, automatic replacement for the per-device
// NudgeService.MILESTONE_GROWTH path (src/services/NudgeService.ts).
//
// That client path only evaluates on a user's own device, only runs if the
// device already has notification permission AND no higher-priority nudge is
// also eligible that session, and even then just schedules a local
// notification 2-5 hours later. Verified live: zero milestone_* rows have
// ever been written to user_nudges, for any user, for any milestone — it has
// never actually fired for anyone.
//
// Designed to be invoked automatically on a schedule (pg_cron, see migration
// 20261109010000_milestone_notification_cron.sql) with no human in the loop —
// unlike send-vote-campaign, which is deliberately manual-only per that
// campaign's own spec. Idempotent: calling it any number of times only ever
// sends once per milestone, guarded by platform_milestone_broadcasts.
//
// POST body: { dryRun?: boolean }
// - dryRun: true => reports what would happen (current milestone, whether
//   already sent, eligible recipient count) without sending or recording
//   anything. Useful for manual testing; the cron job always omits it.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendPushNotifications } from './_lib/expo.ts'

interface EligibleUser {
  id: string;
  expo_push_token: string;
}

serve(async (req) => {
  try {
    let dryRun = false;
    try {
      const body = await req.json();
      dryRun = body?.dryRun === true;
    } catch {
      // No body (e.g. the cron job's plain POST) — defaults to a real run.
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: total, error: countError } = await supabase.rpc('total_registered_users_count');
    if (countError || typeof total !== 'number') {
      return json({ success: false, error: countError?.message ?? 'total_registered_users_count did not return a number' }, 500);
    }

    const milestone = Math.floor(total / 1000) * 1000;
    if (milestone < 1000) {
      return json({ success: true, milestone: 0, message: 'Below the first 1,000-user milestone.' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('platform_milestone_broadcasts')
      .select('milestone, sent_at, recipients')
      .eq('milestone', milestone)
      .maybeSingle();

    if (existingError) {
      return json({ success: false, error: existingError.message }, 500);
    }

    if (existing) {
      return json({ success: true, milestone, alreadySent: true, sentAt: existing.sent_at, recipients: existing.recipients });
    }

    // Eligible: has a push token, and notification_preferences.enabled isn't
    // explicitly false (missing row or null = enabled by default) — same
    // eligibility logic as send-vote-campaign.
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

    const eligible: EligibleUser[] = (candidates ?? [])
      .filter((row: any) => row.expo_push_token && !disabledIds.has(row.id))
      .map((row: any) => ({ id: row.id, expo_push_token: row.expo_push_token }));

    if (dryRun) {
      return json({ success: true, dryRun: true, milestone, alreadySent: false, eligibleCount: eligible.length, totalRegisteredUsers: total });
    }

    const title = `We just hit over ${milestone.toLocaleString()} users on SoundBridge`;
    const body = 'The network is growing. The bigger it gets the more powerful it becomes for every creator here. Share it with one person today.';
    const nudgeId = `milestone_${milestone}`;
    const deepLink = 'soundbridge://share-profile';

    let sent = 0;
    let failed = 0;

    if (eligible.length > 0) {
      const messages = eligible.map(u => ({
        to: u.expo_push_token,
        sound: 'default',
        title,
        body,
        data: { type: 'milestone', nudgeId, screen: 'ShareProfile', deepLink, url: deepLink },
        url: deepLink,
        channelId: 'campaigns',
      }));

      const receipts = await sendPushNotifications(messages);

      const nudgeRows: { user_id: string; nudge_id: string; sent_at: string }[] = [];
      const nowIso = new Date().toISOString();
      for (let i = 0; i < eligible.length; i++) {
        if (receipts[i]?.status === 'ok') {
          sent++;
          nudgeRows.push({ user_id: eligible[i].id, nudge_id: nudgeId, sent_at: nowIso });
        } else {
          failed++;
          console.error(`Failed to send milestone push to ${eligible[i].id}:`, receipts[i]?.message);
        }
      }

      // Also mark it sent in user_nudges — the same table/row shape
      // NudgeService.resolveMilestoneNudge() checks — so that fragile
      // per-device path sees this milestone as already handled and never
      // fires a duplicate, redundant local notification for it.
      if (nudgeRows.length > 0) {
        const { error: nudgeInsertError } = await supabase
          .from('user_nudges')
          .upsert(nudgeRows, { onConflict: 'user_id,nudge_id', ignoreDuplicates: true });
        if (nudgeInsertError) {
          console.error('Failed to record milestone in user_nudges:', nudgeInsertError.message);
        }
      }
    }

    // Record the broadcast as sent even if eligible.length was 0 (e.g. nobody
    // has notifications enabled yet) — the milestone has still been "handled"
    // and must not be retried forever on every cron tick.
    const { error: insertError } = await supabase
      .from('platform_milestone_broadcasts')
      .upsert({ milestone, sent_at: new Date().toISOString(), recipients: sent, failed }, { onConflict: 'milestone' });

    if (insertError) {
      console.error('Failed to record milestone broadcast:', insertError.message);
    }

    return json({ success: true, milestone, sent, failed, totalRegisteredUsers: total });
  } catch (error) {
    console.error('send-milestone-notification error:', error);
    return json({ success: false, error: error.message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, status });
}
