import { supabase } from '../lib/supabase';

export type CheckinStatus = 'close' | 'difficulty';

export interface EventCheckin {
  id: string;
  event_id: string;
  user_id: string;
  status: CheckinStatus;
  created_at: string;
  updated_at: string;
}

class EventCheckinService {
  /** All check-ins for an event — organiser/co-organiser view. */
  async getCheckins(eventId: string): Promise<EventCheckin[]> {
    const { data, error } = await supabase
      .from('event_checkins')
      .select('*')
      .eq('event_id', eventId);

    if (error) {
      console.error('EventCheckinService.getCheckins:', error.message);
      return [];
    }
    return data || [];
  }

  /** The current user's own check-in status for an event, if any. */
  async getMyCheckin(eventId: string): Promise<EventCheckin | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('event_checkins')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('EventCheckinService.getMyCheckin:', error.message);
      return null;
    }
    return data;
  }

  /**
   * Upserts the current user's check-in status for an event. On 'difficulty',
   * also fires a one-time in-app notification to the event's organiser and every
   * tagged co-organiser, naming the attendee — reuses the existing direct-insert-
   * into-`notifications` pattern already used elsewhere in this codebase (e.g.
   * AdminDistributionScreen.tsx, MyCommunityScreen.tsx) rather than building new
   * delivery infrastructure.
   */
  async checkIn(eventId: string, status: CheckinStatus): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('event_checkins')
      .upsert(
        { event_id: eventId, user_id: user.id, status, updated_at: new Date().toISOString() },
        { onConflict: 'event_id,user_id' }
      );

    if (error) {
      console.error('EventCheckinService.checkIn:', error.message);
      return false;
    }

    if (status === 'difficulty') {
      this.notifyDifficulty(eventId, user.id);
    }

    return true;
  }

  private async notifyDifficulty(eventId: string, attendeeId: string): Promise<void> {
    try {
      const [{ data: event }, { data: attendeeProfile }, { data: coOrganizers }] = await Promise.all([
        supabase.from('events').select('id, title, creator_id').eq('id', eventId).maybeSingle(),
        supabase.from('profiles').select('display_name, username').eq('id', attendeeId).maybeSingle(),
        supabase.from('event_co_organizers').select('user_id').eq('event_id', eventId),
      ]);

      if (!event) return;

      const attendeeName = attendeeProfile?.display_name || attendeeProfile?.username || 'An attendee';
      const recipientIds = new Set<string>();
      if (event.creator_id) recipientIds.add(event.creator_id);
      (coOrganizers || []).forEach((row: any) => recipientIds.add(row.user_id));
      recipientIds.delete(attendeeId); // don't notify the attendee about themselves

      if (recipientIds.size === 0) return;

      const rows = Array.from(recipientIds).map((userId) => ({
        user_id: userId,
        type: 'event_checkin_difficulty',
        title: 'Difficulty getting to your event',
        body: `${attendeeName} is having difficulty getting to ${event.title}.`,
        data: { event_id: eventId, checkin_user_id: attendeeId },
        read: false,
      }));

      const { error } = await supabase.from('notifications').insert(rows);
      if (error) console.error('EventCheckinService.notifyDifficulty:', error.message);
    } catch (err) {
      console.error('EventCheckinService.notifyDifficulty:', err);
    }
  }

  /** Live-updates callback for the organiser's visualization while the screen is open. */
  subscribeToCheckins(
    eventId: string,
    onChange: (checkin: EventCheckin) => void
  ): () => void {
    const channel = supabase
      .channel(`event-checkins-${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_checkins', filter: `event_id=eq.${eventId}` },
        (payload) => onChange(payload.new as EventCheckin)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'event_checkins', filter: `event_id=eq.${eventId}` },
        (payload) => onChange(payload.new as EventCheckin)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const eventCheckinService = new EventCheckinService();
export default eventCheckinService;
