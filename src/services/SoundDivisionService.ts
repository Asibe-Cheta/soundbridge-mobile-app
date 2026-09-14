/**
 * Sound Movements / Sound Divisions (NSO_STAGE1.MD) — track-level tagging, additive
 * to a creator's existing profile/catalogue display. Generalisable: not specific to
 * New Skool Ogene, any movement/division rows in the DB show up here the same way.
 * Stage 1 only: read-only, no self-service tagging UI or discovery screens yet.
 */
import { supabase } from '../lib/supabase';

export interface TrackSoundTags {
  movementName: string;
  divisionNames: string[];
}

class SoundDivisionService {
  /** One query for a creator's whole track list, not one per track. */
  async getForCreator(creatorId: string): Promise<Map<string, TrackSoundTags>> {
    const map = new Map<string, TrackSoundTags>();
    try {
      const { data, error } = await supabase
        .from('track_sound_divisions')
        .select('track_id, sound_divisions(name, sound_movements(name)), audio_tracks!inner(creator_id)')
        .eq('audio_tracks.creator_id', creatorId);

      if (error || !data) return map;

      for (const row of data as any[]) {
        const trackId: string = row.track_id;
        const divisionName: string | undefined = row.sound_divisions?.name;
        const movementName: string | undefined = row.sound_divisions?.sound_movements?.name;
        if (!divisionName || !movementName) continue;

        const existing = map.get(trackId);
        if (existing) {
          if (!existing.divisionNames.includes(divisionName)) existing.divisionNames.push(divisionName);
        } else {
          map.set(trackId, { movementName, divisionNames: [divisionName] });
        }
      }
    } catch {
      // Fails closed to an empty map — this is purely additive display, never break
      // the existing track list over it.
    }
    return map;
  }
}

export const soundDivisionService = new SoundDivisionService();
