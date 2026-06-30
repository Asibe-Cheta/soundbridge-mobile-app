import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface TrackQualityData {
  track_id: string;
  track_title: string;
  cover_image_url: string | null;
  quality_score: number;
  total_plays: number;
  unique_listeners: number;
  repeat_listens: number;
  tip_count: number;
  tip_rate: number;
  live_interest_yes_count: number;
  live_interest_rate: number;
  share_count: number;
  bookmark_count: number;
}

export interface AffinityFan {
  user_id: string;
  username: string;
  avatar_url: string | null;
  affinity_score: number;
  repeat_listens: number;
  tips_sent: number;
}

class AudienceIntelligenceService {
  async getTrackQualitySignals(session: Session): Promise<TrackQualityData[]> {
    const { data, error } = await supabase
      .from('track_quality_signals')
      .select(`
        track_id,
        quality_score,
        total_plays,
        unique_listeners,
        repeat_listens,
        tip_count,
        tip_rate,
        live_interest_yes_count,
        live_interest_rate,
        share_count,
        bookmark_count,
        audio_tracks!track_quality_signals_track_id_fkey (
          title,
          cover_image_url
        )
      `)
      .eq('creator_id', session.user.id)
      .order('quality_score', { ascending: false })
      .limit(20);

    if (error || !data) return [];

    return (data as any[]).map((row) => ({
      track_id: row.track_id,
      track_title: row.audio_tracks?.title ?? 'Unknown',
      cover_image_url: row.audio_tracks?.cover_image_url ?? null,
      quality_score: Number(row.quality_score),
      total_plays: row.total_plays,
      unique_listeners: row.unique_listeners,
      repeat_listens: row.repeat_listens,
      tip_count: row.tip_count,
      tip_rate: Number(row.tip_rate),
      live_interest_yes_count: row.live_interest_yes_count,
      live_interest_rate: Number(row.live_interest_rate),
      share_count: row.share_count,
      bookmark_count: row.bookmark_count,
    }));
  }

  async getTopAffinityFans(session: Session, limit: number = 10): Promise<AffinityFan[]> {
    const { data, error } = await supabase
      .from('listener_genre_affinity')
      .select(`
        user_id,
        affinity_score,
        repeat_listens,
        tips_sent,
        profiles!listener_genre_affinity_user_id_fkey (
          username,
          avatar_url
        )
      `)
      .eq('creator_id', session.user.id)
      .order('affinity_score', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return (data as any[]).map((row) => ({
      user_id: row.user_id,
      username: row.profiles?.username ?? 'Listener',
      avatar_url: row.profiles?.avatar_url ?? null,
      affinity_score: Number(row.affinity_score),
      repeat_listens: row.repeat_listens,
      tips_sent: row.tips_sent,
    }));
  }
}

export const audienceIntelligenceService = new AudienceIntelligenceService();
