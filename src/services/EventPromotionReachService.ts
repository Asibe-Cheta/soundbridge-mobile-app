import { supabase } from '../lib/supabase';

export interface PromotionReachByCity {
  city: string;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
}

export interface PromotionReachFunnel {
  sent: number;
  reached: number;
  opened: number;
  booked: number;
}

export interface PromotionReach {
  byCity: PromotionReachByCity[];
  funnel: PromotionReachFunnel;
}

class EventPromotionReachService {
  async getPromotionReach(eventId: string): Promise<PromotionReach> {
    const [notificationRows, bookedTotal] = await Promise.all([
      this.getNotificationReachByCity(eventId),
      this.getBookedCount(eventId),
    ]);

    const funnel: PromotionReachFunnel = notificationRows.reduce(
      (acc, row) => ({
        sent: acc.sent + row.sentCount,
        reached: acc.reached + row.deliveredCount,
        opened: acc.opened + row.openedCount,
        booked: acc.booked,
      }),
      { sent: 0, reached: 0, opened: 0, booked: bookedTotal }
    );

    return { byCity: notificationRows, funnel };
  }

  private async getNotificationReachByCity(eventId: string): Promise<PromotionReachByCity[]> {
    const { data, error } = await supabase.rpc('get_event_promotion_reach', {
      p_event_id: eventId,
    });

    if (error) {
      console.error('EventPromotionReachService.getNotificationReachByCity:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      city: row.city,
      sentCount: Number(row.sent_count) || 0,
      deliveredCount: Number(row.delivered_count) || 0,
      openedCount: Number(row.opened_count) || 0,
    }));
  }

  private async getBookedCount(eventId: string): Promise<number> {
    // Real status vocabulary is IN ('active','used','refunded','cancelled') — 'confirmed'
    // is never a real value (confirmed with the web team earlier this session, same fix
    // already applied to CreatorRevenueService.ts). This file predated that finding, so it
    // still had the same always-zero bug CreatorRevenueService.ts had.
    const { data, error } = await supabase
      .from('purchased_event_tickets')
      .select('quantity')
      .eq('event_id', eventId)
      .in('status', ['active', 'used']);

    if (error) {
      console.error('EventPromotionReachService.getBookedCount:', error.message);
      return 0;
    }

    return (data || []).reduce((sum: number, row: any) => sum + (row.quantity || 0), 0);
  }
}

export const eventPromotionReachService = new EventPromotionReachService();
export default eventPromotionReachService;
