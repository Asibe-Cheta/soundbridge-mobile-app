import { InteractionManager, Platform } from 'react-native';

/**
 * Performance Monitoring Service
 * 
 * Tracks performance metrics for screen renders, API calls, and other operations.
 * Uses native Performance API if available, otherwise falls back to manual timing.
 */
export class PerformanceMonitoringService {
  private marks: Map<string, number> = new Map();

  /**
   * Mark performance timestamp
   */
  mark(name: string): void {
    this.marks.set(name, Date.now());
    
    // Try to use native Performance API if available
    if (typeof performance !== 'undefined' && performance.mark) {
      try {
        performance.mark(name);
      } catch (error) {
        // Performance API not available or failed
      }
    }
  }

  /**
   * Measure performance between marks
   */
  measure(name: string, startMark: string, endMark?: string): number | null {
    const startTime = this.marks.get(startMark);
    const endTime = endMark ? this.marks.get(endMark) : Date.now();

    if (!startTime) {
      console.warn(`Missing start mark for measurement: ${name} (${startMark})`);
      return null;
    }

    const duration = endTime - startTime;

    // Try to use native Performance API if available
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, startMark, endMark || `${name}_end`);
      } catch (error) {
        // Performance API not available or failed
      }
    }

    // Log slow operations
    if (duration > 1000) {
      console.warn(`⚠️ Slow operation detected: ${name} took ${duration}ms`);
    }

    return duration;
  }

  /**
   * Track screen render time
   */
  trackScreenRender(screenName: string): () => void {
    const startMark = `${screenName}_render_start`;
    this.mark(startMark);

    return () => {
      const endMark = `${screenName}_render_end`;
      this.mark(endMark);
      
      InteractionManager.runAfterInteractions(() => {
        const duration = this.measure(
          `${screenName}_render`,
          startMark,
          endMark
        );

        if (duration !== null) {
          console.log(`📊 ${screenName} rendered in ${duration}ms`);
        }
      });
    };
  }

  /**
   * Track API call duration
   */
  async trackApiCall<T>(
    name: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startMark = `api_${name}_start`;
    const endMark = `api_${name}_end`;

    this.mark(startMark);

    try {
      const result = await apiCall();
      this.mark(endMark);
      const duration = this.measure(`api_${name}`, startMark, endMark);
      
      if (duration !== null && duration > 2000) {
        console.warn(`⚠️ Slow API call: ${name} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      this.mark(endMark);
      this.measure(`api_${name}_error`, startMark, endMark);
      throw error;
    }
  }

  /**
   * Get memory usage (iOS only, requires native module)
   */
  getMemoryUsage(): number | null {
    if (Platform.OS !== 'ios') return null;

    try {
      // This would require native module implementation
      // For now, return null
      return null;
    } catch (error) {
      console.warn('Failed to get memory usage:', error);
      return null;
    }
  }

  /**
   * Clear old marks to prevent memory leak
   */
  clearOldMarks(olderThan: number = 300000): void {
    const now = Date.now();
    
    for (const [name, timestamp] of this.marks.entries()) {
      if (now - timestamp > olderThan) {
        this.marks.delete(name);
      }
    }
  }

  /**
   * Get all current marks (for debugging)
   */
  getMarks(): Map<string, number> {
    return new Map(this.marks);
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();

