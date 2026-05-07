import { supabase } from '../lib/supabase';
import { notificationService } from './NotificationService';

// Nudge IDs — must match the values in WEB_TEAM_USER_NUDGES_MIGRATION.md
const NUDGE = {
  CREATOR_SHARE_PROFILE:     'creator_share_profile',
  REQUEST_ROOM_INTRO:        'request_room_intro',
  REQUEST_ROOM_POST_SESSION: 'request_room_post_session',
  POST_EVENT:                'post_event',
  FAN_INVITE:                'fan_invite',
} as const;

type NudgeId = typeof NUDGE[keyof typeof NUDGE];

interface NudgeDef {
  id: NudgeId;
  title: string;
  body: string;
  // Screen name in the React Navigation stack
  screen: string;
  screenParams?: Record<string, unknown>;
}

// Priority order — first eligible unsent nudge fires
const NUDGES: NudgeDef[] = [
  {
    id: NUDGE.CREATOR_SHARE_PROFILE,
    title: 'Your music is live.',
    body: 'Share your profile and let your fans find you here.',
    screen: 'ShareProfile',
  },
  {
    id: NUDGE.REQUEST_ROOM_INTRO,
    title: 'Did you know?',
    body: 'Your live audience can tip you and make song requests in real time. Try the Request Room.',
    screen: 'RequestRoomSetup',
  },
  {
    id: NUDGE.REQUEST_ROOM_POST_SESSION,
    title: 'Tell your audience.',
    body: 'Tell your audience they can follow you on SoundBridge to get notified about your next event. They just need to scan and join.',
    screen: 'ShareProfile',
  },
  {
    id: NUDGE.POST_EVENT,
    title: 'Got a show coming up?',
    body: "Post it here and we'll promote it to the right people in your area automatically.",
    screen: 'CreateEvent',
  },
  {
    id: NUDGE.FAN_INVITE,
    title: 'Know someone who loves music?',
    body: 'Invite them to SoundBridge. When they listen to your tracks and tip you, you keep between 85 and 90% instantly.',
    screen: 'ShareProfile',
  },
];

class NudgeService {
  // One nudge per app session
  private sessionFired = false;

  // Call on every app launch after the user is authenticated
  async evaluateAndFire(userId: string): Promise<void> {
    if (this.sessionFired) return;
    if (!userId) return;

    try {
      // Load all already-sent nudge IDs for this user in one query
      const { data: sent } = await supabase
        .from('user_nudges')
        .select('nudge_id')
        .eq('user_id', userId);

      const sentSet = new Set<string>((sent ?? []).map((r: { nudge_id: string }) => r.nudge_id));

      for (const nudge of NUDGES) {
        if (sentSet.has(nudge.id)) continue;

        const eligible = await this.checkCondition(nudge.id, userId);
        if (!eligible) continue;

        await this.fire(nudge, userId);
        return; // One per session
      }
    } catch {
      // Non-critical — nudges are best-effort
    }
  }

  // Expose for the Request Room dashboard to call when a session ends,
  // so Nudge 3 fires in the same session rather than waiting for next launch.
  async onRequestRoomSessionEnded(userId: string): Promise<void> {
    this.sessionFired = false;
    await this.evaluateAndFire(userId);
  }

  // Reset the per-session lock (called when user signs out)
  reset(): void {
    this.sessionFired = false;
  }

  // ─── Condition checkers ──────────────────────────────────────────────────

  private async checkCondition(nudgeId: NudgeId, userId: string): Promise<boolean> {
    try {
      switch (nudgeId) {
        case NUDGE.CREATOR_SHARE_PROFILE: {
          // Has at least one uploaded track
          const { count } = await supabase
            .from('audio_tracks')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', userId);
          return (count ?? 0) > 0;
        }

        case NUDGE.REQUEST_ROOM_INTRO: {
          // Has never created a Request Room session
          const { count } = await supabase
            .from('request_room_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', userId);
          return (count ?? 0) === 0;
        }

        case NUDGE.REQUEST_ROOM_POST_SESSION: {
          // Has at least one ended/completed Request Room session
          const { count } = await supabase
            .from('request_room_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', userId)
            .in('status', ['ended', 'completed']);
          return (count ?? 0) > 0;
        }

        case NUDGE.POST_EVENT: {
          // Has not created any event in the last 30 days
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { count } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', userId)
            .gte('created_at', thirtyDaysAgo);
          return (count ?? 0) === 0;
        }

        case NUDGE.FAN_INVITE: {
          // Account is older than 7 days
          const { data: profile } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', userId)
            .maybeSingle();
          if (!profile?.created_at) return false;
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return new Date(profile.created_at) < sevenDaysAgo;
        }

        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  // ─── Firing ──────────────────────────────────────────────────────────────

  private async fire(nudge: NudgeDef, userId: string): Promise<void> {
    // Mark as sent BEFORE scheduling so a concurrent call cannot double-fire.
    // upsert is idempotent — safe to call even if a row already exists.
    const { error } = await supabase
      .from('user_nudges')
      .upsert(
        { user_id: userId, nudge_id: nudge.id, sent_at: new Date().toISOString() },
        { onConflict: 'user_id,nudge_id' }
      );

    // If we can't persist the sent state, skip the notification entirely.
    // Better to skip than to fire repeatedly on every launch.
    if (error) return;

    this.sessionFired = true;

    // 5-second delay so the app is fully loaded and visible before the banner appears
    const triggerDate = new Date(Date.now() + 5000);

    await notificationService.scheduleLocalNotification(
      nudge.title,
      nudge.body,
      {
        type: 'nudge' as any,
        nudgeId: nudge.id,
        screen: nudge.screen,
        ...(nudge.screenParams ? { screenParams: nudge.screenParams } : {}),
      },
      triggerDate
    );
  }
}

export const nudgeService = new NudgeService();
