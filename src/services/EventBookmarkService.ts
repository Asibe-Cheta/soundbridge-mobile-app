import { supabase } from '../lib/supabase';

export interface EventBookmark {
  id: string;
  user_id: string;
  event_id: string;
  bookmarked_at: string;
}

class EventBookmarkService {
  async isBookmarked(eventId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('event_bookmarks')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('EventBookmarkService.isBookmarked:', error.message);
      return false;
    }
    return !!data;
  }

  // Returns the new bookmarked state
  async toggle(eventId: string, userId: string): Promise<boolean> {
    const currently = await this.isBookmarked(eventId, userId);

    if (currently) {
      const { error } = await supabase
        .from('event_bookmarks')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) throw error;

      await supabase.rpc('track_event_action', {
        p_event_id: eventId,
        p_action: 'unbookmark',
      });

      return false;
    } else {
      const { error } = await supabase
        .from('event_bookmarks')
        .insert({ event_id: eventId, user_id: userId });

      if (error) throw error;

      await supabase.rpc('track_event_action', {
        p_event_id: eventId,
        p_action: 'bookmark',
      });

      return true;
    }
  }

  async getBookmarkedEventIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('event_bookmarks')
      .select('event_id')
      .eq('user_id', userId)
      .order('bookmarked_at', { ascending: false });

    if (error) {
      console.error('EventBookmarkService.getBookmarkedEventIds:', error.message);
      return [];
    }
    return (data || []).map((row) => row.event_id);
  }
}

export const eventBookmarkService = new EventBookmarkService();
export default eventBookmarkService;
