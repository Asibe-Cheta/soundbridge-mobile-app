import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { currencyService } from './CurrencyService';
import { config } from '../config/environment';

// Revenue breakdown by source
export interface RevenueBySource {
  tips: {
    amount: number;
    count: number;
    currency: string;
    change_percentage?: number;
  };
  eventTickets: {
    amount: number;
    count: number;
    currency: string;
    change_percentage?: number;
  };
  serviceBookings: {
    amount: number;
    count: number;
    currency: string;
    change_percentage?: number;
  };
  downloads: {
    amount: number;
    count: number;
    currency: string;
    change_percentage?: number;
  };
  total: {
    amount: number;
    currency: string;
    change_percentage?: number;
  };
}

// Revenue trend data point
export interface RevenueTrendPoint {
  date: string;
  amount: number;
  tips: number;
  tickets: number;
  bookings: number;
  downloads: number;
}

// Top earning item
export interface TopEarningItem {
  id: string;
  type: 'track' | 'event' | 'service' | 'tip';
  title: string;
  amount: number;
  count: number;
  currency: string;
  imageUrl?: string;
}

// Fan demographic data
export interface FanDemographic {
  city: string;
  country: string;
  fanCount: number;
  totalSpent: number;
  engagementScore: number;
}

// Top fan data
export interface TopFan {
  id: string;
  username: string;
  avatarUrl?: string;
  totalSpent: number;
  tipsGiven: number;
  ticketsPurchased: number;
  city?: string;
  country?: string;
}

// Track performance data
export interface TrackPerformance {
  id: string;
  title: string;
  coverArt?: string;
  plays: number;
  likes: number;
  shares: number;
  downloads: number;
  revenue: number;
  playsChange?: number;
  likesChange?: number;
}

// Monthly growth data
export interface MonthlyGrowth {
  month: string;
  revenue: number;
  newFollowers: number;
  totalPlays: number;
  engagement: number;
  revenueChange?: number;
  followerChange?: number;
}

// Complete earnings summary
export interface CreatorEarningsSummary {
  period: {
    start_date: string;
    end_date: string;
    label: string; // e.g., "This Month", "Last 30 Days"
  };
  revenueBySource: RevenueBySource;
  trend: RevenueTrendPoint[];
  topEarning: TopEarningItem[];
  pendingBalance: number;
  availableForWithdrawal: number;
  totalLifetimeEarnings: number;
  currency: string;
}

// Date range options
export type DateRangeOption = 'today' | 'week' | 'month' | 'year' | 'all_time' | 'custom';

class CreatorRevenueService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.apiUrl.replace(/\/api\/?$/, '');
  }

  /**
   * Get comprehensive earnings summary for a creator
   */
  async getEarningsSummary(
    session: Session,
    dateRange: DateRangeOption = 'month',
    customStart?: string,
    customEnd?: string
  ): Promise<CreatorEarningsSummary> {
    try {
      const params = new URLSearchParams({
        range: dateRange,
      });

      if (customStart) params.append('start_date', customStart);
      if (customEnd) params.append('end_date', customEnd);

      const response = await fetch(
        `${this.baseUrl}/api/creator/earnings-summary?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch earnings summary: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching earnings summary:', error);
      throw error;
    }
  }

  /**
   * Get revenue breakdown by source (tips, tickets, bookings, downloads)
   * @param targetCurrency - The currency to display amounts in (e.g., 'GBP', 'USD')
   */
  async getRevenueBySource(
    session: Session,
    startDate?: string,
    endDate?: string,
    targetCurrency: string = 'GBP'
  ): Promise<RevenueBySource> {
    try {
      const userId = session.user.id;

      // Fetch exchange rates first
      await currencyService.fetchExchangeRates('USD');

      // Get tips revenue from wallet transactions (actual amount received after fees)
      // We query wallet_transactions instead of creator_tips to get the real revenue after platform fees
      const { data: tipsData, error: tipsError } = await supabase
        .from('wallet_transactions')
        .select('amount, currency, created_at, status')
        .eq('user_id', userId)
        .eq('transaction_type', 'tip_received')
        .in('status', ['completed', 'pending'])
        .gte('created_at', startDate || new Date(0).toISOString())
        .lte('created_at', endDate || new Date().toISOString());

      if (tipsError) throw tipsError;

      console.log('💰 DEBUG: Tips data from wallet_transactions table:', JSON.stringify(tipsData, null, 2));
      console.log('💰 DEBUG: User ID:', userId);
      console.log('💰 DEBUG: Date range:', startDate, 'to', endDate);
      console.log('💰 DEBUG: Target currency:', targetCurrency);

      // Convert each tip to target currency and sum
      let tipsAmount = 0;
      if (tipsData) {
        for (const tip of tipsData) {
          const converted = await currencyService.convertCurrency(tip.amount, tip.currency || 'USD', targetCurrency);
          tipsAmount += converted;
        }
      }
      const tipsCount = tipsData?.length || 0;

      console.log('💰 DEBUG: Calculated tips amount (converted to', targetCurrency + '):', tipsAmount, 'Count:', tipsCount);

      // Get event tickets revenue (where user is the event creator)
      const { data: eventsData } = await supabase
        .from('events')
        .select('id')
        .eq('creator_id', userId);

      const eventIds = eventsData?.map(e => e.id) || [];

      let ticketsAmount = 0;
      let ticketsCount = 0;

      if (eventIds.length > 0) {
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('purchased_event_tickets')
          .select('amount_paid, purchase_date')
          .in('event_id', eventIds)
          .eq('status', 'confirmed')
          .gte('purchase_date', startDate || new Date(0).toISOString())
          .lte('purchase_date', endDate || new Date().toISOString());

        if (!ticketsError && ticketsData) {
          ticketsAmount = ticketsData.reduce((sum, ticket) => sum + ticket.amount_paid, 0);
          ticketsCount = ticketsData.length;
        }
      }

      // Get service bookings revenue
      // TODO: Fix this when we know the actual column names in service_bookings table
      // The TypeScript types say price_total exists but the actual DB schema doesn't have it
      let bookingsAmount = 0;
      let bookingsCount = 0;

      // Temporarily disabled until we fix the schema mismatch
      /*
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('service_bookings')
        .select('price_total, status, created_at')
        .eq('provider_id', userId)
        .in('status', ['confirmed', 'completed'])
        .gte('created_at', startDate || new Date(0).toISOString())
        .lte('created_at', endDate || new Date().toISOString());

      if (bookingsError) console.warn('⚠️ Service bookings error:', bookingsError);

      bookingsAmount = bookingsData?.reduce((sum, booking) => sum + (booking.price_total || 0), 0) || 0;
      bookingsCount = bookingsData?.length || 0;
      */

      // Get downloads revenue (if applicable)
      // For now, we'll return 0 as there's no download purchase tracking yet
      const downloadsAmount = 0;
      const downloadsCount = 0;

      const totalAmount = tipsAmount + ticketsAmount + bookingsAmount + downloadsAmount;

      return {
        tips: {
          amount: tipsAmount,
          count: tipsCount,
          currency: targetCurrency,
        },
        eventTickets: {
          amount: ticketsAmount,
          count: ticketsCount,
          currency: targetCurrency,
        },
        serviceBookings: {
          amount: bookingsAmount,
          count: bookingsCount,
          currency: targetCurrency,
        },
        downloads: {
          amount: downloadsAmount,
          count: downloadsCount,
          currency: targetCurrency,
        },
        total: {
          amount: totalAmount,
          currency: targetCurrency,
        },
      };
    } catch (error) {
      console.error('❌ Error fetching revenue by source:', error);
      throw error;
    }
  }

  /**
   * Get revenue trend over time (for charts)
   */
  async getRevenueTrend(
    session: Session,
    period: 'week' | 'month' | 'year' = 'month'
  ): Promise<RevenueTrendPoint[]> {
    try {
      const userId = session.user.id;
      const now = new Date();
      let startDate: Date;
      let groupBy: 'day' | 'week' | 'month';

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          groupBy = 'month';
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
      }

      // Get tips trend
      const { data: tipsData } = await supabase
        .from('creator_tips')
        .select('amount, created_at')
        .eq('creator_id', userId)
        .gte('created_at', startDate.toISOString());

      // Get event IDs for this creator
      const { data: eventsData } = await supabase
        .from('events')
        .select('id')
        .eq('creator_id', userId);

      const eventIds = eventsData?.map(e => e.id) || [];

      // Get tickets trend
      let ticketsData: any[] = [];
      if (eventIds.length > 0) {
        const { data } = await supabase
          .from('purchased_event_tickets')
          .select('amount_paid, purchase_date')
          .in('event_id', eventIds)
          .eq('status', 'confirmed')
          .gte('purchase_date', startDate.toISOString());

        ticketsData = data || [];
      }

      // Get bookings trend
      // TODO: Fix this when we know the actual column names in service_bookings table
      const bookingsData: any[] = []; // Temporarily disabled
      /*
      const { data: bookingsData } = await supabase
        .from('service_bookings')
        .select('price_total, created_at')
        .eq('provider_id', userId)
        .in('status', ['confirmed', 'completed'])
        .gte('created_at', startDate.toISOString());
      */

      // Group data by date
      const trendMap = new Map<string, RevenueTrendPoint>();

      // Initialize all dates in range
      const dateFormat = groupBy === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';
      let currentDate = new Date(startDate);
      while (currentDate <= now) {
        const dateKey = this.formatDate(currentDate, groupBy);
        trendMap.set(dateKey, {
          date: dateKey,
          amount: 0,
          tips: 0,
          tickets: 0,
          bookings: 0,
          downloads: 0,
        });

        if (groupBy === 'day') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }

      // Aggregate tips
      tipsData?.forEach(tip => {
        const dateKey = this.formatDate(new Date(tip.created_at), groupBy);
        const point = trendMap.get(dateKey);
        if (point) {
          point.tips += tip.amount;
          point.amount += tip.amount;
        }
      });

      // Aggregate tickets
      ticketsData?.forEach(ticket => {
        const dateKey = this.formatDate(new Date(ticket.purchase_date), groupBy);
        const point = trendMap.get(dateKey);
        if (point) {
          point.tickets += ticket.amount_paid;
          point.amount += ticket.amount_paid;
        }
      });

      // Aggregate bookings
      bookingsData?.forEach(booking => {
        const dateKey = this.formatDate(new Date(booking.created_at), groupBy);
        const point = trendMap.get(dateKey);
        if (point && booking.price_total) {
          point.bookings += booking.price_total;
          point.amount += booking.price_total;
        }
      });

      return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('❌ Error fetching revenue trend:', error);
      throw error;
    }
  }

  /**
   * Get top earning items (tracks, events, services)
   */
  async getTopEarningItems(
    session: Session,
    limit: number = 5,
    startDate?: string,
    endDate?: string
  ): Promise<TopEarningItem[]> {
    try {
      const userId = session.user.id;
      const topEarnings: TopEarningItem[] = [];

      // Get top earning events (by ticket sales)
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, cover_image')
        .eq('creator_id', userId);

      if (eventsData && eventsData.length > 0) {
        const eventIds = eventsData.map(e => e.id);

        const { data: ticketSales } = await supabase
          .from('purchased_event_tickets')
          .select('event_id, amount_paid')
          .in('event_id', eventIds)
          .eq('status', 'confirmed')
          .gte('purchase_date', startDate || new Date(0).toISOString())
          .lte('purchase_date', endDate || new Date().toISOString());

        // Group by event
        const eventRevenue = new Map<string, { amount: number; count: number }>();
        ticketSales?.forEach(ticket => {
          const current = eventRevenue.get(ticket.event_id) || { amount: 0, count: 0 };
          current.amount += ticket.amount_paid;
          current.count += 1;
          eventRevenue.set(ticket.event_id, current);
        });

        // Convert to top earning items
        eventRevenue.forEach((revenue, eventId) => {
          const event = eventsData.find(e => e.id === eventId);
          if (event) {
            topEarnings.push({
              id: event.id,
              type: 'event',
              title: event.title,
              amount: revenue.amount,
              count: revenue.count,
              currency: 'GBP',
              imageUrl: event.cover_image,
            });
          }
        });
      }

      // Get top tippers (users who sent the most tips)
      const { data: tipData } = await supabase
        .from('creator_tips')
        .select('tipper_id, amount, profiles!creator_tips_tipper_id_fkey(username, avatar_url)')
        .eq('creator_id', userId)
        .gte('created_at', startDate || new Date(0).toISOString())
        .lte('created_at', endDate || new Date().toISOString());

      // Group by tipper
      const tipperRevenue = new Map<string, { amount: number; count: number; username: string; avatar: string }>();
      tipData?.forEach((tip: any) => {
        const current = tipperRevenue.get(tip.tipper_id) || {
          amount: 0,
          count: 0,
          username: tip.profiles?.username || 'Anonymous',
          avatar: tip.profiles?.avatar_url || '',
        };
        current.amount += tip.amount;
        current.count += 1;
        tipperRevenue.set(tip.tipper_id, current);
      });

      // Add top tippers
      tipperRevenue.forEach((revenue, tipperId) => {
        topEarnings.push({
          id: tipperId,
          type: 'tip',
          title: `Tips from ${revenue.username}`,
          amount: revenue.amount,
          count: revenue.count,
          currency: 'GBP',
          imageUrl: revenue.avatar,
        });
      });

      // Sort by amount and return top items
      return topEarnings.sort((a, b) => b.amount - a.amount).slice(0, limit);
    } catch (error) {
      console.error('❌ Error fetching top earning items:', error);
      return [];
    }
  }

  /**
   * Format date for grouping
   */
  private formatDate(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (groupBy === 'day') {
      return `${year}-${month}-${day}`;
    } else if (groupBy === 'month') {
      return `${year}-${month}`;
    }

    return `${year}-${month}-${day}`;
  }

  /**
   * Get earnings comparison (current vs previous period)
   */
  async getEarningsComparison(
    session: Session,
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string
  ): Promise<{ current: RevenueBySource; previous: RevenueBySource }> {
    try {
      const [current, previous] = await Promise.all([
        this.getRevenueBySource(session, currentStart, currentEnd),
        this.getRevenueBySource(session, previousStart, previousEnd),
      ]);

      // Calculate change percentages
      const calculateChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      current.tips.change_percentage = calculateChange(current.tips.amount, previous.tips.amount);
      current.eventTickets.change_percentage = calculateChange(
        current.eventTickets.amount,
        previous.eventTickets.amount
      );
      current.serviceBookings.change_percentage = calculateChange(
        current.serviceBookings.amount,
        previous.serviceBookings.amount
      );
      current.downloads.change_percentage = calculateChange(
        current.downloads.amount,
        previous.downloads.amount
      );
      current.total.change_percentage = calculateChange(current.total.amount, previous.total.amount);

      return { current, previous };
    } catch (error) {
      console.error('❌ Error fetching earnings comparison:', error);
      throw error;
    }
  }

  /**
   * Get fan demographics (cities with most engagement)
   */
  async getFanDemographics(
    session: Session,
    limit: number = 10,
    startDate?: string,
    endDate?: string
  ): Promise<FanDemographic[]> {
    try {
      const userId = session.user.id;

      // Get all fans who have spent money (tips + tickets)
      const { data: tipData } = await supabase
        .from('creator_tips')
        .select('tipper_id, amount, profiles!creator_tips_tipper_id_fkey(city, country)')
        .eq('creator_id', userId)
        .gte('created_at', startDate || new Date(0).toISOString())
        .lte('created_at', endDate || new Date().toISOString());

      // Get event tickets
      const { data: eventsData } = await supabase
        .from('events')
        .select('id')
        .eq('creator_id', userId);

      const eventIds = eventsData?.map(e => e.id) || [];
      let ticketData: any[] = [];

      if (eventIds.length > 0) {
        const { data } = await supabase
          .from('purchased_event_tickets')
          .select('user_id, amount_paid, profiles!purchased_event_tickets_user_id_fkey(city, country)')
          .in('event_id', eventIds)
          .eq('status', 'confirmed')
          .gte('purchase_date', startDate || new Date(0).toISOString())
          .lte('purchase_date', endDate || new Date().toISOString());

        ticketData = data || [];
      }

      // Group by city
      const cityMap = new Map<string, { country: string; fanIds: Set<string>; totalSpent: number }>();

      tipData?.forEach((tip: any) => {
        const city = tip.profiles?.city || 'Unknown';
        const country = tip.profiles?.country || 'Unknown';
        const key = `${city}, ${country}`;

        const current = cityMap.get(key) || { country, fanIds: new Set(), totalSpent: 0 };
        current.fanIds.add(tip.tipper_id);
        current.totalSpent += tip.amount;
        cityMap.set(key, current);
      });

      ticketData?.forEach((ticket: any) => {
        const city = ticket.profiles?.city || 'Unknown';
        const country = ticket.profiles?.country || 'Unknown';
        const key = `${city}, ${country}`;

        const current = cityMap.get(key) || { country, fanIds: new Set(), totalSpent: 0 };
        current.fanIds.add(ticket.user_id);
        current.totalSpent += ticket.amount_paid;
        cityMap.set(key, current);
      });

      // Convert to array and calculate engagement score
      const demographics: FanDemographic[] = [];
      cityMap.forEach((data, cityKey) => {
        const city = cityKey.split(', ')[0];
        demographics.push({
          city,
          country: data.country,
          fanCount: data.fanIds.size,
          totalSpent: data.totalSpent,
          engagementScore: data.fanIds.size * data.totalSpent, // Simple engagement metric
        });
      });

      return demographics
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, limit);
    } catch (error) {
      console.error('❌ Error fetching fan demographics:', error);
      return [];
    }
  }

  /**
   * Get top fans (highest spenders)
   */
  async getTopFans(
    session: Session,
    limit: number = 10,
    startDate?: string,
    endDate?: string
  ): Promise<TopFan[]> {
    try {
      const userId = session.user.id;

      // Get tips
      const { data: tipData } = await supabase
        .from('creator_tips')
        .select('tipper_id, amount, profiles!creator_tips_tipper_id_fkey(username, avatar_url, city, country)')
        .eq('creator_id', userId)
        .gte('created_at', startDate || new Date(0).toISOString())
        .lte('created_at', endDate || new Date().toISOString());

      // Get event tickets
      const { data: eventsData } = await supabase
        .from('events')
        .select('id')
        .eq('creator_id', userId);

      const eventIds = eventsData?.map(e => e.id) || [];
      let ticketData: any[] = [];

      if (eventIds.length > 0) {
        const { data } = await supabase
          .from('purchased_event_tickets')
          .select('user_id, amount_paid, profiles!purchased_event_tickets_user_id_fkey(username, avatar_url, city, country)')
          .in('event_id', eventIds)
          .eq('status', 'confirmed')
          .gte('purchase_date', startDate || new Date(0).toISOString())
          .lte('purchase_date', endDate || new Date().toISOString());

        ticketData = data || [];
      }

      // Group by fan
      const fanMap = new Map<string, {
        username: string;
        avatarUrl?: string;
        totalSpent: number;
        tipsGiven: number;
        ticketsPurchased: number;
        city?: string;
        country?: string;
      }>();

      tipData?.forEach((tip: any) => {
        const current = fanMap.get(tip.tipper_id) || {
          username: tip.profiles?.username || 'Anonymous',
          avatarUrl: tip.profiles?.avatar_url,
          totalSpent: 0,
          tipsGiven: 0,
          ticketsPurchased: 0,
          city: tip.profiles?.city,
          country: tip.profiles?.country,
        };
        current.totalSpent += tip.amount;
        current.tipsGiven += 1;
        fanMap.set(tip.tipper_id, current);
      });

      ticketData?.forEach((ticket: any) => {
        const current = fanMap.get(ticket.user_id) || {
          username: ticket.profiles?.username || 'Anonymous',
          avatarUrl: ticket.profiles?.avatar_url,
          totalSpent: 0,
          tipsGiven: 0,
          ticketsPurchased: 0,
          city: ticket.profiles?.city,
          country: ticket.profiles?.country,
        };
        current.totalSpent += ticket.amount_paid;
        current.ticketsPurchased += 1;
        fanMap.set(ticket.user_id, current);
      });

      // Convert to array
      const topFans: TopFan[] = [];
      fanMap.forEach((data, fanId) => {
        topFans.push({
          id: fanId,
          username: data.username,
          avatarUrl: data.avatarUrl,
          totalSpent: data.totalSpent,
          tipsGiven: data.tipsGiven,
          ticketsPurchased: data.ticketsPurchased,
          city: data.city,
          country: data.country,
        });
      });

      return topFans.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, limit);
    } catch (error) {
      console.error('❌ Error fetching top fans:', error);
      return [];
    }
  }

  /**
   * Get track performance data
   */
  async getTrackPerformance(
    session: Session,
    limit: number = 10,
    startDate?: string,
    endDate?: string
  ): Promise<TrackPerformance[]> {
    try {
      const userId = session.user.id;

      // Get all tracks for this creator
      const { data: tracksData, error } = await supabase
        .from('audio_tracks')
        .select('id, title, cover_art_url, play_count, likes_count, shares_count, created_at')
        .eq('creator_id', userId)
        .order('play_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // For now, we don't have revenue per track, so we'll use 0
      // In the future, this could be calculated from download purchases
      const tracks: TrackPerformance[] = tracksData?.map(track => ({
        id: track.id,
        title: track.title,
        coverArt: track.cover_art_url,
        plays: track.play_count || 0,
        likes: track.likes_count || 0,
        shares: track.shares_count || 0,
        downloads: 0, // download_count column doesn't exist in schema
        revenue: 0, // TODO: Calculate from download purchases
      })) || [];

      return tracks;
    } catch (error) {
      console.error('❌ Error fetching track performance:', error);
      return [];
    }
  }

  /**
   * Get monthly growth trends
   */
  async getMonthlyGrowth(
    session: Session,
    months: number = 6
  ): Promise<MonthlyGrowth[]> {
    try {
      const userId = session.user.id;
      const growthData: MonthlyGrowth[] = [];

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

        // Get revenue for this month
        const revenueData = await this.getRevenueBySource(
          session,
          monthStart.toISOString(),
          monthEnd.toISOString()
        );

        // Get new followers for this month
        const { count: newFollowers } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        // Get total plays for this month (would need play history table)
        // For now, we'll use 0
        const totalPlays = 0;

        // Calculate engagement (likes + shares + tips)
        const engagement = revenueData.tips.count + (revenueData.eventTickets.count * 2);

        growthData.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: revenueData.total.amount,
          newFollowers: newFollowers || 0,
          totalPlays,
          engagement,
        });
      }

      // Calculate change percentages
      for (let i = 1; i < growthData.length; i++) {
        const current = growthData[i];
        const previous = growthData[i - 1];

        if (previous.revenue > 0) {
          current.revenueChange = ((current.revenue - previous.revenue) / previous.revenue) * 100;
        }

        if (previous.newFollowers > 0) {
          current.followerChange = ((current.newFollowers - previous.newFollowers) / previous.newFollowers) * 100;
        }
      }

      return growthData;
    } catch (error) {
      console.error('❌ Error fetching monthly growth:', error);
      return [];
    }
  }
}

export const creatorRevenueService = new CreatorRevenueService();
