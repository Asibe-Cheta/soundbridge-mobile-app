import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/apiClient';

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
  timestamp: string;
}

export class AnalyticsService {
  private eventsQueue: AnalyticsEvent[] = [];
  private isInitialized = false;
  private flushInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize analytics
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Start periodic flush of events
      this.flushInterval = setInterval(() => {
        this.flushEvents();
      }, 30000); // Flush every 30 seconds

      this.isInitialized = true;
      console.log('✅ Analytics service initialized');
    } catch (error) {
      console.error('Error initializing analytics:', error);
    }
  }

  /**
   * Track screen view
   */
  async trackScreen(screenName: string, properties?: Record<string, any>): Promise<void> {
    try {
      await this.trackEvent('Screen View', 'view', screenName, undefined, properties);
      console.log('📊 Screen tracked:', screenName);
    } catch (error) {
      console.error('Error tracking screen:', error);
    }
  }

  /**
   * Track event
   */
  async trackEvent(
    category: string,
    action: string,
    label?: string,
    value?: number,
    properties?: Record<string, any>
  ): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        category,
        action,
        label,
        value,
        properties,
        timestamp: new Date().toISOString(),
      };

      this.eventsQueue.push(event);

      // Flush immediately for important events
      if (category === 'Error' || category === 'Purchase') {
        await this.flushEvents();
      }
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  /**
   * Track user action
   */
  async trackUserAction(action: string, properties?: Record<string, any>): Promise<void> {
    await this.trackEvent('User Action', action, undefined, undefined, properties);
  }

  /**
   * Track engagement
   */
  async trackEngagement(
    type: 'post' | 'comment' | 'reaction' | 'connection' | 'share',
    properties?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent('Engagement', type, undefined, undefined, properties);
  }

  /**
   * Track error
   */
  async trackError(error: Error, context?: string, properties?: Record<string, any>): Promise<void> {
    await this.trackEvent('Error', error.message, context, undefined, {
      ...properties,
      errorName: error.name,
      errorStack: error.stack,
    });
  }

  /**
   * Track search
   */
  async trackSearch(query: string, resultsCount: number, type?: string): Promise<void> {
    await this.trackEvent('Search', 'query', type || 'all', resultsCount, {
      query,
      resultsCount,
    });
  }

  /**
   * Track share
   */
  async trackShare(contentType: string, contentId: string, method?: string): Promise<void> {
    await this.trackEvent('Share', contentType, method, undefined, {
      contentId,
      method,
    });
  }

  /**
   * Flush events queue to backend
   */
  private async flushEvents(): Promise<void> {
    if (this.eventsQueue.length === 0) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Store events locally if not authenticated
        return;
      }

      const eventsToFlush = [...this.eventsQueue];
      this.eventsQueue = [];

      await apiFetch('/api/analytics/events', {
        method: 'POST',
        session,
        body: JSON.stringify({ events: eventsToFlush }),
      });

      console.log(`📊 Flushed ${eventsToFlush.length} analytics events`);
    } catch (error) {
      console.error('Error flushing analytics events:', error);
      // Re-add events to queue if flush failed
      this.eventsQueue.unshift(...this.eventsQueue);
    }
  }

  /**
   * Get analytics summary (for debugging)
   */
  getQueueLength(): number {
    return this.eventsQueue.length;
  }

  /**
   * Clear events queue
   */
  clearQueue(): void {
    this.eventsQueue = [];
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flushEvents(); // Flush remaining events
  }
}

export const analyticsService = new AnalyticsService();

