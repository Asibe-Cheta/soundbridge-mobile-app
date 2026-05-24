import { supabase } from '../lib/supabase';

export interface EventAnalytics {
  id: string;
  event_id: string;
  creator_id: string;

  // Reach
  notifications_sent: number;
  notifications_opened: number;
  event_page_views: number;

  // Engagement
  bookmarks_count: number;
  shares_link_count: number;
  shares_card_count: number;

  // Conversion
  ticket_sales_count: number;
  ticket_sales_revenue: number;

  // Advanced (Unlimited only)
  views_by_city?: Record<string, number> | null;
  views_by_genre_match?: Record<string, number> | null;
  notification_open_rate?: number | null;
  peak_view_hour?: number | null;

  updated_at: string;
}

class EventAnalyticsService {
  async trackAction(
    eventId: string,
    action: 'view' | 'bookmark' | 'unbookmark' | 'share_link' | 'share_card',
  ): Promise<void> {
    const { error } = await supabase.rpc('track_event_action', {
      p_event_id: eventId,
      p_action: action,
    });
    if (error) console.error('EventAnalyticsService.trackAction:', error.message);
  }

  async getForEvent(eventId: string): Promise<EventAnalytics | null> {
    const { data, error } = await supabase
      .from('event_analytics')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (error) {
      console.error('EventAnalyticsService.getForEvent:', error.message);
      return null;
    }
    return data as EventAnalytics | null;
  }

  // Used by creator dashboard — returns analytics for all events by a creator
  async getAllForCreator(creatorId: string): Promise<EventAnalytics[]> {
    const { data, error } = await supabase
      .from('event_analytics')
      .select('*')
      .eq('creator_id', creatorId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('EventAnalyticsService.getAllForCreator:', error.message);
      return [];
    }
    return (data || []) as EventAnalytics[];
  }
}

export const eventAnalyticsService = new EventAnalyticsService();
export default eventAnalyticsService;
