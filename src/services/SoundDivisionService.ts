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

export interface RecognisedMovement {
  movementId: string;
  movementName: string;
  divisions: { id: string; slug: string; name: string }[];
}

class SoundDivisionService {
  /**
   * NSO_1B.MD access gating: is this artist the founding/recognised artist of
   * a movement with divisions defined? Returns null for the overwhelming
   * majority of creators, who aren't part of any movement — the self-service
   * tagging UI should render nothing in that case.
   */
  async getRecognisedMovementForArtist(artistId: string): Promise<RecognisedMovement | null> {
    try {
      const { data: movement, error: movementError } = await supabase
        .from('sound_movements')
        .select('id, name')
        .eq('founding_artist_id', artistId)
        .maybeSingle();

      if (movementError || !movement) return null;

      const { data: divisions, error: divisionsError } = await supabase
        .from('sound_divisions')
        .select('id, slug, name')
        .eq('movement_id', movement.id)
        .order('display_order', { ascending: true });

      if (divisionsError || !divisions || divisions.length === 0) return null;

      return { movementId: movement.id, movementName: movement.name, divisions };
    } catch {
      return null;
    }
  }

  /** Currently-assigned division ids for one track, for pre-checking the picker. */
  async getDivisionIdsForTrack(trackId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('track_sound_divisions')
        .select('division_id')
        .eq('track_id', trackId);
      if (error || !data) return [];
      return data.map((row: any) => row.division_id);
    } catch {
      return [];
    }
  }

  /** Replaces a track's division tags with exactly the given set. */
  async setDivisionsForTrack(trackId: string, divisionIds: string[]): Promise<boolean> {
    try {
      const current = await this.getDivisionIdsForTrack(trackId);
      const toAdd = divisionIds.filter((id) => !current.includes(id));
      const toRemove = current.filter((id) => !divisionIds.includes(id));

      if (toAdd.length > 0) {
        const { error } = await supabase
          .from('track_sound_divisions')
          .insert(toAdd.map((division_id) => ({ track_id: trackId, division_id })));
        if (error) return false;
      }

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('track_sound_divisions')
          .delete()
          .eq('track_id', trackId)
          .in('division_id', toRemove);
        if (error) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

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
