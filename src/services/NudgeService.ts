import { supabase } from '../lib/supabase';
import { notificationService } from './NotificationService';

// How many days between repeat fires for a nudge the user hasn't tapped yet
const REPEAT_INTERVAL_DAYS = 3;

// Nudge IDs — must match the values in WEB_TEAM_USER_NUDGES_MIGRATION.md
const NUDGE = {
  CREATOR_SHARE_PROFILE:     'creator_share_profile',
  REQUEST_ROOM_INTRO:        'request_room_intro',
  REQUEST_ROOM_POST_SESSION: 'request_room_post_session',
  POST_EVENT:                'post_event',
  FAN_INVITE:                'fan_invite',
  // Payout awareness
  PAYOUT_AWARENESS:          'payout_awareness',
  SHARE_TO_WIN_PLAYS:        'share_to_win_plays',
  WHATSAPP_CONVERSION:       'whatsapp_conversion',
  // Event promotion
  EVENT_NO_AD_SPEND:         'event_no_ad_spend',
  EVENT_SMART_AUDIENCE:      'event_smart_audience',
  EVENT_REMINDER_30:         'event_reminder_30',
  // Coming soon
  COMING_SOON_SPONSORSHIP:   'coming_soon_sponsorship',
  COMING_SOON_COMPETITION:   'coming_soon_competition',
  // Milestone (fires per-milestone, not strictly once globally)
  MILESTONE_1000:            'milestone_1000',
  MILESTONE_2000:            'milestone_2000',
  MILESTONE_5000:            'milestone_5000',
  // Service provider
  SERVICE_PROVIDER_GIG_ALERTS: 'service_provider_gig_alerts',
  GENERAL_SERVICE_DISCOVERY:   'general_service_discovery',
  // AI career advisor (links to ComingSoon until advisor is live)
  AI_TRACK_RELEASE_ADVISOR:    'ai_track_release_advisor',
  // Post-activity AI advisor nudge — fires once qualifying engagement is reached
  AI_ADVISOR_POST_ACTIVITY:    'ai_advisor_post_activity',
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

  // ─── Payout awareness ────────────────────────────────────────────────────
  {
    id: NUDGE.PAYOUT_AWARENESS,
    title: 'SoundBridge pays creators every month',
    body: 'The creator with the highest plays this month gets paid directly by SoundBridge. Are you in the running?',
    screen: 'PayoutInfo',
  },
  {
    id: NUDGE.SHARE_TO_WIN_PLAYS,
    title: 'More plays = more chance to get paid',
    body: 'Share your SoundBridge profile on Instagram and WhatsApp. Every play counts toward this month\'s SoundBridge payout.',
    screen: 'PayoutInfo',
  },
  {
    id: NUDGE.WHATSAPP_CONVERSION,
    title: 'Turn your contacts into listeners',
    body: 'Share your SoundBridge profile link on WhatsApp today. Your contacts can listen to your music for free and tip you directly. Every play brings you closer to this month\'s SoundBridge payout.',
    screen: 'ShareProfile',
  },

  // ─── Event promotion ─────────────────────────────────────────────────────
  {
    id: NUDGE.EVENT_NO_AD_SPEND,
    title: 'Stop paying for event ads',
    body: 'SoundBridge promotes your events for free to people who already love your genre in your city. No ad spend needed.',
    screen: 'EventPromotionInfo',
  },
  {
    id: NUDGE.EVENT_SMART_AUDIENCE,
    title: 'Your audience is already here',
    body: 'SoundBridge matches your events to listeners in your area who have opted in for your genre. Post your next event and we will do the rest.',
    screen: 'EventPromotionInfo',
  },
  {
    id: NUDGE.EVENT_REMINDER_30,
    title: 'Got a show coming up?',
    body: 'Post it on SoundBridge. We will promote it to the right people in your city automatically and for free.',
    screen: 'EventPromotionInfo',
  },

  // ─── Coming soon ─────────────────────────────────────────────────────────
  {
    id: NUDGE.COMING_SOON_SPONSORSHIP,
    title: 'SoundBridge is coming to your city',
    body: 'We will soon be sponsoring live music events across the UK and Nigeria. Keep sharing SoundBridge and stay tuned.',
    screen: 'ComingSoon',
  },
  {
    id: NUDGE.COMING_SOON_COMPETITION,
    title: 'Music competitions are coming',
    body: 'SoundBridge will be hosting music competitions with real prizes. The more you grow this community the sooner it happens. Share the platform today.',
    screen: 'ComingSoon',
  },

  // ─── Milestones (fire once per milestone, not once globally) ─────────────
  {
    id: NUDGE.MILESTONE_1000,
    title: 'We just hit 1,000 users on SoundBridge',
    body: 'The network is growing. The bigger it gets the more powerful it becomes for every creator here. Share it with one person today.',
    screen: 'ShareProfile',
  },
  {
    id: NUDGE.MILESTONE_2000,
    title: 'We just hit 2,000 users on SoundBridge',
    body: 'The network is growing. The bigger it gets the more powerful it becomes for every creator here. Share it with one person today.',
    screen: 'ShareProfile',
  },
  {
    id: NUDGE.MILESTONE_5000,
    title: 'We just hit 5,000 users on SoundBridge',
    body: 'The network is growing. The bigger it gets the more powerful it becomes for every creator here. Share it with one person today.',
    screen: 'ShareProfile',
  },

  // ─── AI career advisor ────────────────────────────────────────────────────
  {
    id: NUDGE.AI_TRACK_RELEASE_ADVISOR,
    title: 'Need help releasing your next track?',
    body: 'We can help you plan your release strategy, grow your audience, and maximise your plays — all in one place.',
    screen: 'ComingSoon',
  },
  {
    id: NUDGE.AI_ADVISOR_POST_ACTIVITY,
    title: 'Curious how this is actually performing?',
    body: 'Your AI Career Adviser has real insight now. See what the data actually means for your music.',
    screen: 'AICareerAdvisor',
  },

  // ─── Service provider ─────────────────────────────────────────────────────
  {
    id: NUDGE.SERVICE_PROVIDER_GIG_ALERTS,
    title: 'Never miss a gig opportunity',
    body: 'Set your gig alerts and we will notify you when someone near you needs your services.',
    screen: 'ServiceProviderDashboard',
  },
  {
    id: NUDGE.GENERAL_SERVICE_DISCOVERY,
    title: 'Are you a creator?',
    body: 'Set up your service profile and get notified when gigs matching your skills come up near you.',
    screen: 'ServiceProviderDashboard',
  },
];

// Max nudges delivered in any 24-hour window
const DAILY_CAP = 3;

class NudgeService {
  // One nudge scheduled per app session (prevents flooding on rapid re-opens)
  private sessionFired = false;

  // Call on every app launch after the user is authenticated
  async evaluateAndFire(userId: string): Promise<void> {
    if (this.sessionFired) return;
    if (!userId) return;

    try {
      type NudgeRow = { nudge_id: string; sent_at: string | null; tapped_at: string | null };

      const { data: rows } = await supabase
        .from('user_nudges')
        .select('nudge_id, sent_at, tapped_at')
        .eq('user_id', userId);

      const rowMap = new Map<string, NudgeRow>(
        (rows ?? []).map((r: NudgeRow) => [r.nudge_id, r])
      );

      // Daily cap — count nudges sent in the last 24 hours
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const sentToday = (rows ?? []).filter(
        (r: NudgeRow) => r.sent_at && new Date(r.sent_at).getTime() > oneDayAgo
      ).length;
      if (sentToday >= DAILY_CAP) return;

      for (const nudge of NUDGES) {
        const row = rowMap.get(nudge.id);

        // User tapped through to the screen — this nudge is done
        if (row?.tapped_at) continue;

        // Sent recently — wait for the repeat interval
        if (row?.sent_at) {
          const daysSince = (Date.now() - new Date(row.sent_at).getTime()) / 86_400_000;
          if (daysSince < REPEAT_INTERVAL_DAYS) continue;
        }

        const eligible = await this.checkCondition(nudge.id, userId);
        if (!eligible) continue;

        await this.fire(nudge, userId);
        return; // One scheduled per session
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

        // ─── Payout awareness ──────────────────────────────────────────────

        case NUDGE.PAYOUT_AWARENESS: {
          // Account is at least 3 days old
          const { data: profile } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', userId)
            .maybeSingle();
          if (!profile?.created_at) return false;
          const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
          return new Date(profile.created_at) < threeDaysAgo;
        }

        case NUDGE.SHARE_TO_WIN_PLAYS: {
          // Has at least one track but fewer than 50 total plays
          const { count: trackCount } = await supabase
            .from('audio_tracks')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', userId);
          if ((trackCount ?? 0) === 0) return false;
          const { data: tracks } = await supabase
            .from('audio_tracks')
            .select('play_count')
            .eq('creator_id', userId);
          const totalPlays = (tracks ?? []).reduce((sum: number, t: { play_count: number }) => sum + (t.play_count || 0), 0);
          return totalPlays < 50;
        }

        case NUDGE.WHATSAPP_CONVERSION: {
          // Account is at least 7 days old
          const { data: profile } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', userId)
            .maybeSingle();
          if (!profile?.created_at) return false;
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return new Date(profile.created_at) < sevenDaysAgo;
        }

        // ─── Event promotion ───────────────────────────────────────────────

        case NUDGE.EVENT_NO_AD_SPEND: {
          // Has never created any event
          const { count } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', userId);
          return (count ?? 0) === 0;
        }

        case NUDGE.EVENT_SMART_AUDIENCE: {
          // Has genre and location on profile but no events
          const { data: profile } = await supabase
            .from('profiles')
            .select('genre, location')
            .eq('id', userId)
            .maybeSingle();
          if (!profile?.genre || !profile?.location) return false;
          const { count } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', userId);
          return (count ?? 0) === 0;
        }

        case NUDGE.EVENT_REMINDER_30: {
          // Has not created any event in the last 30 days
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { count } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', userId)
            .gte('created_at', thirtyDaysAgo);
          return (count ?? 0) === 0;
        }

        // ─── Coming soon ───────────────────────────────────────────────────

        case NUDGE.COMING_SOON_SPONSORSHIP: {
          // Account is at least 14 days old
          const { data: profile } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', userId)
            .maybeSingle();
          if (!profile?.created_at) return false;
          const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
          return new Date(profile.created_at) < fourteenDaysAgo;
        }

        case NUDGE.COMING_SOON_COMPETITION: {
          // Has at least one uploaded track
          const { count } = await supabase
            .from('audio_tracks')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', userId);
          return (count ?? 0) > 0;
        }

        // ─── Milestones ────────────────────────────────────────────────────

        case NUDGE.MILESTONE_1000: {
          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true });
          return (count ?? 0) >= 1000;
        }

        case NUDGE.MILESTONE_2000: {
          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true });
          return (count ?? 0) >= 2000;
        }

        case NUDGE.MILESTONE_5000: {
          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true });
          return (count ?? 0) >= 5000;
        }

        // ─── Service provider nudges ───────────────────────────────────────

        case NUDGE.SERVICE_PROVIDER_GIG_ALERTS: {
          // Has a service provider profile but gig alerts not enabled
          const { data: spProfile } = await supabase
            .from('service_provider_profiles')
            .select('user_id')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();
          if (!spProfile) return false;
          const { data: gigPrefs } = await supabase
            .from('service_provider_gig_preferences')
            .select('gig_alerts_enabled')
            .eq('user_id', userId)
            .maybeSingle();
          return !gigPrefs?.gig_alerts_enabled;
        }

        case NUDGE.GENERAL_SERVICE_DISCOVERY: {
          // Has never visited the Service Provider Dashboard (no service profile)
          const { count } = await supabase
            .from('service_provider_profiles')
            .select('user_id', { count: 'exact', head: true })
            .eq('user_id', userId);
          return (count ?? 0) === 0;
        }

        // ─── AI career advisor ─────────────────────────────────────────────

        case NUDGE.AI_ADVISOR_POST_ACTIVITY: {
          // Conditions: at least 3 days since first upload, AND (tip received OR
          // repeat listen OR 20+ total plays). Expires if no qualifying activity
          // within 14 days of first upload.
          const { data: firstTrack } = await supabase
            .from('audio_tracks')
            .select('id, created_at, play_count')
            .eq('creator_id', userId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          if (!firstTrack?.created_at) return false;

          const firstUploadAt = new Date(firstTrack.created_at).getTime();
          const now = Date.now();
          const daysSinceUpload = (now - firstUploadAt) / 86_400_000;

          // Must be at least 3 days old
          if (daysSinceUpload < 3) return false;
          // Expires after 14 days of no qualifying activity
          if (daysSinceUpload > 14) return false;

          // Check qualifying activity: 20+ total plays
          const { data: allTracks } = await supabase
            .from('audio_tracks')
            .select('play_count')
            .eq('creator_id', userId);
          const totalPlays = (allTracks ?? []).reduce(
            (sum: number, t: { play_count: number }) => sum + (t.play_count || 0), 0
          );
          if (totalPlays >= 20) return true;

          // Check: tip received
          const { count: tipCount } = await supabase
            .from('tips')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', userId);
          if ((tipCount ?? 0) > 0) return true;

          // Check: repeat listen (play_logs where same user played twice)
          const { count: repeatCount } = await supabase
            .from('play_logs')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', userId)
            .eq('is_repeat', true);
          if ((repeatCount ?? 0) > 0) return true;

          return false;
        }

        case NUDGE.AI_TRACK_RELEASE_ADVISOR: {
          // Has at least one uploaded track AND account is 5+ days old
          const { data: profile } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', userId)
            .maybeSingle();
          if (!profile?.created_at) return false;
          const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
          if (new Date(profile.created_at) > fiveDaysAgo) return false;
          const { count } = await supabase
            .from('audio_tracks')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', userId);
          return (count ?? 0) > 0;
        }

        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  // ─── Tap tracking ────────────────────────────────────────────────────────

  // Call from any screen that is the destination of a nudge.
  // Marks all nudges pointing to that screen as tapped so they stop repeating.
  async markTappedForScreen(screen: string, userId: string): Promise<void> {
    try {
      const ids = NUDGES.filter(n => n.screen === screen).map(n => n.id);
      if (ids.length === 0) return;
      await supabase
        .from('user_nudges')
        .update({ tapped_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('nudge_id', ids)
        .is('tapped_at', null);
    } catch {}
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

    // Schedule 2–5 hours from now so it fires while the app is in the background
    const minMs = 2 * 60 * 60 * 1000;
    const maxMs = 5 * 60 * 60 * 1000;
    const triggerDate = new Date(Date.now() + minMs + Math.random() * (maxMs - minMs));

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
