import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export type NudgeType =
  | 'first_track'
  | 'event_never'
  | 'event_30day'
  | 'venue'
  | 'gig'
  | 'collaborator';

export interface NudgeConfig {
  type: NudgeType;
  icon: string;
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel: string;
  profileColumn: string;
  navigateTo?: string;
}

export const NUDGE_CONFIGS: Record<NudgeType, NudgeConfig> = {
  first_track: {
    type: 'first_track',
    icon: '🎵',
    title: "You haven't uploaded your first track yet",
    body: "Upload now and we'll promote it to listeners who are already looking for your sound.",
    primaryLabel: 'Upload Now',
    secondaryLabel: 'Later',
    profileColumn: 'nudge_first_track_dismissed',
    navigateTo: 'Upload',
  },
  event_never: {
    type: 'event_never',
    icon: '🎤',
    title: 'Promote your events for free',
    body: "Did you know you can promote your events here for free? No ad spend. We send it directly to people in your area who love your genre.",
    primaryLabel: 'Try It Now',
    secondaryLabel: 'Got It',
    profileColumn: 'nudge_event_never_dismissed',
    navigateTo: 'CreateEvent',
  },
  event_30day: {
    type: 'event_30day',
    icon: '📅',
    title: 'Have you got a show coming up?',
    body: "Promote your next event on SoundBridge for free and we'll send it to the right audience in your area.",
    primaryLabel: 'Post an Event',
    secondaryLabel: 'Maybe Later',
    profileColumn: 'nudge_event_30day_dismissed',
    navigateTo: 'CreateEvent',
  },
  venue: {
    type: 'venue',
    icon: '🏛️',
    title: 'Looking for a venue?',
    body: "Looking for a venue for your next show? We can help you find one that fits your budget and location.",
    primaryLabel: 'Find a Venue',
    secondaryLabel: 'Got It',
    profileColumn: 'nudge_venue_search_dismissed',
    navigateTo: 'AllVenues',
  },
  gig: {
    type: 'gig',
    icon: '🥁',
    title: 'Need session musicians?',
    body: "Do you need a drummer, guitarist, or sound engineer for your next session? Post a gig and connect with the right professional instantly.",
    primaryLabel: 'Post a Gig',
    secondaryLabel: 'Maybe Later',
    profileColumn: 'nudge_gig_post_dismissed',
    navigateTo: 'Network',
  },
  collaborator: {
    type: 'collaborator',
    icon: '🤝',
    title: 'Find collaborators near you',
    body: "Are you looking for collaborators, session musicians, or producers near you? Check out who's available on SoundBridge right now.",
    primaryLabel: 'Explore',
    secondaryLabel: 'Got It',
    profileColumn: 'nudge_collaborator_dismissed',
    navigateTo: 'Discover',
  },
};

const PRIORITY_ORDER: NudgeType[] = [
  'first_track',
  'event_never',
  'event_30day',
  'venue',
  'gig',
  'collaborator',
];

// Module-level set — tracks nudges shown in the current app session
const shownThisSession = new Set<NudgeType>();

export function useNudges() {
  const { userProfile } = useAuth();
  const [activeNudge, setActiveNudge] = useState<NudgeType | null>(null);
  const checked = useRef(false);

  const isCreator = userProfile?.role === 'creator';

  const checkNudges = useCallback(async () => {
    if (!userProfile?.id || !isCreator || checked.current) return;
    checked.current = true;

    const profile = userProfile;

    for (const type of PRIORITY_ORDER) {
      if (shownThisSession.has(type)) continue;

      const config = NUDGE_CONFIGS[type];
      const dismissed = (profile as any)[config.profileColumn] === true;
      if (dismissed) continue;

      let eligible = false;

      if (type === 'first_track') {
        const createdAt = new Date(profile.created_at);
        const hoursElapsed = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursElapsed < 48) continue;

        const { count } = await supabase
          .from('audio_tracks')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', profile.id);
        eligible = (count ?? 0) === 0;

      } else if (type === 'event_never') {
        const { count } = await supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', profile.id);
        eligible = (count ?? 0) === 0;

      } else if (type === 'event_30day') {
        const { data } = await supabase
          .from('events')
          .select('created_at')
          .eq('creator_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data?.created_at) {
          const daysSince = (Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60 * 24);
          eligible = daysSince >= 30;
        }

      } else {
        // venue, gig, collaborator — dismissal column is the only gate
        eligible = true;
      }

      if (eligible) {
        shownThisSession.add(type);
        setActiveNudge(type);
        return;
      }
    }
  }, [userProfile, isCreator]);

  useEffect(() => {
    checkNudges();
  }, [checkNudges]);

  const dismiss = useCallback(async () => {
    if (!activeNudge || !userProfile?.id) return;

    const config = NUDGE_CONFIGS[activeNudge];
    setActiveNudge(null);

    await supabase
      .from('profiles')
      .update({ [config.profileColumn]: true })
      .eq('id', userProfile.id);
  }, [activeNudge, userProfile?.id]);

  const activeConfig = activeNudge ? NUDGE_CONFIGS[activeNudge] : null;

  return { activeNudge, activeConfig, dismiss };
}
