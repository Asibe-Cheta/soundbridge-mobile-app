import { supabase } from '../lib/supabase';

type ResponseType = 'yes' | 'maybe_later' | 'auto_dismissed';
type AvailabilityType = 'weekends' | 'weekday_evenings' | 'any_time' | 'not_sure';

interface RecordResponseParams {
  trackId: string;
  userId: string;
  creatorId: string;
  response: ResponseType;
  availability?: AvailabilityType | null;
  profileLocation?: string | null;
  profileCity?: string | null;
  profileCountry?: string | null;
  currentLocationLat?: number | null;
  currentLocationLng?: number | null;
  currentCity?: string | null;
  currentCountry?: string | null;
}

export interface LiveInterestLocationCount {
  city: string;
  country: string;
  count: number;
}

export interface LiveInterestStats {
  trackId: string;
  trackTitle: string;
  yesCount: number;
  locationBreakdown: LiveInterestLocationCount[];
  availabilityBreakdown: Record<AvailabilityType, number>;
  totalResponses: number;
}

class LiveInterestService {
  async hasResponded(userId: string, trackId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('live_interest_responses')
        .select('id')
        .eq('user_id', userId)
        .eq('track_id', trackId)
        .maybeSingle();
      return !!data;
    } catch {
      return false;
    }
  }

  async recordResponse(params: RecordResponseParams): Promise<void> {
    try {
      await supabase.from('live_interest_responses').upsert(
        {
          track_id: params.trackId,
          user_id: params.userId,
          creator_id: params.creatorId,
          responded: params.response === 'yes',
          response: params.response,
          availability: params.availability ?? null,
          profile_location: params.profileLocation ?? null,
          profile_city: params.profileCity ?? null,
          profile_country: params.profileCountry ?? null,
          current_location_lat: params.currentLocationLat ?? null,
          current_location_lng: params.currentLocationLng ?? null,
          current_city: params.currentCity ?? null,
          current_country: params.currentCountry ?? null,
          responded_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,track_id' }
      );
    } catch (err) {
      console.error('Failed to record live interest response:', err);
    }
  }

  async getStatsForCreator(creatorId: string): Promise<LiveInterestStats[]> {
    try {
      const { data: responses } = await supabase
        .from('live_interest_responses')
        .select(
          'track_id, response, availability, profile_city, profile_country, audio_tracks(title)'
        )
        .eq('creator_id', creatorId);

      if (!responses || responses.length === 0) return [];

      const trackMap = new Map<string, LiveInterestStats>();

      for (const r of responses) {
        const trackId = r.track_id;
        const trackTitle = (r as any).audio_tracks?.title ?? '';

        if (!trackMap.has(trackId)) {
          trackMap.set(trackId, {
            trackId,
            trackTitle,
            yesCount: 0,
            locationBreakdown: [],
            availabilityBreakdown: {
              weekends: 0,
              weekday_evenings: 0,
              any_time: 0,
              not_sure: 0,
            },
            totalResponses: 0,
          });
        }

        const stats = trackMap.get(trackId)!;
        stats.totalResponses++;

        if (r.response === 'yes') {
          stats.yesCount++;

          if (r.availability) {
            stats.availabilityBreakdown[r.availability as AvailabilityType]++;
          }

          const city = r.profile_city || '';
          const country = r.profile_country || '';
          if (city || country) {
            const existing = stats.locationBreakdown.find(
              (l) => l.city === city && l.country === country
            );
            if (existing) {
              existing.count++;
            } else {
              stats.locationBreakdown.push({ city, country, count: 1 });
            }
          }
        }
      }

      return Array.from(trackMap.values())
        .filter((s) => s.yesCount > 0)
        .map((s) => ({
          ...s,
          locationBreakdown: s.locationBreakdown.sort((a, b) => b.count - a.count),
        }));
    } catch (err) {
      console.error('Failed to fetch live interest stats:', err);
      return [];
    }
  }
}

export const liveInterestService = new LiveInterestService();
