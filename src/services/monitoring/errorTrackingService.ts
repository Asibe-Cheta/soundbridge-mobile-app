import { Platform } from 'react-native';

/**
 * Error Tracking Service
 * 
 * Provides error tracking capabilities with optional Sentry integration.
 * Works without Sentry for basic error logging, or with Sentry for production error tracking.
 * 
 * To enable Sentry:
 * 1. Install: npm install @sentry/react-native
 * 2. Set EXPO_PUBLIC_SENTRY_DSN in your environment
 * 3. Call initialize() with the DSN
 */
export class ErrorTrackingService {
  private initialized = false;
  private sentryAvailable = false;

  /**
   * Initialize error tracking
   * If Sentry DSN is provided and package is installed, Sentry will be used.
   * Otherwise, errors will be logged to console.
   */
  async initialize(dsn?: string, environment: string = 'production'): Promise<void> {
    if (this.initialized) return;

    // Try to use Sentry if available
    if (dsn) {
      try {
        // Dynamic import to avoid breaking if Sentry is not installed
        const Sentry = await import('@sentry/react-native').catch(() => null);
        
        if (Sentry && Sentry.default) {
          Sentry.default.init({
            dsn,
            environment,
            enableAutoSessionTracking: true,
            sessionTrackingIntervalMillis: 30000,
            tracesSampleRate: 1.0,
            enableNative: true,
            enableNativeNagger: false,
            beforeSend(event) {
              // Filter out sensitive data
              if (event.request?.headers) {
                delete event.request.headers.Authorization;
                delete event.request.headers.Cookie;
              }
              return event;
            },
          });

          this.sentryAvailable = true;
          this.initialized = true;
          console.log('✅ Error tracking initialized with Sentry');
          return;
        }
      } catch (error) {
        console.warn('⚠️ Sentry not available, using console logging:', error);
      }
    }

    // Fallback to console logging
    this.initialized = true;
    console.log('✅ Error tracking initialized (console mode)');
  }

  /**
   * Capture exception
   */
  captureException(error: Error, context?: Record<string, any>): void {
    if (!this.initialized) {
      console.error('Error tracking not initialized');
      return;
    }

    if (this.sentryAvailable) {
      try {
        // Dynamic import for Sentry
        import('@sentry/react-native').then(Sentry => {
          Sentry.default.captureException(error, {
            extra: context,
            tags: {
              platform: Platform.OS,
            },
          });
        }).catch(() => {
          this.logError(error, context);
        });
      } catch (err) {
        this.logError(error, context);
      }
    } else {
      this.logError(error, context);
    }
  }

  /**
   * Capture message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (!this.initialized) {
      console.log('Error tracking not initialized');
      return;
    }

    if (this.sentryAvailable) {
      try {
        import('@sentry/react-native').then(Sentry => {
          Sentry.default.captureMessage(message, level);
        }).catch(() => {
          console.log(`[${level.toUpperCase()}] ${message}`);
        });
      } catch (err) {
        console.log(`[${level.toUpperCase()}] ${message}`);
      }
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Set user context
   */
  setUser(user: { id: string; email?: string; username?: string }): void {
    if (!this.initialized) return;

    if (this.sentryAvailable) {
      try {
        import('@sentry/react-native').then(Sentry => {
          Sentry.default.setUser({
            id: user.id,
            email: user.email,
            username: user.username,
          });
        }).catch(() => {
          console.log('Set user context:', user);
        });
      } catch (err) {
        console.log('Set user context:', user);
      }
    } else {
      console.log('Set user context:', user);
    }
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (!this.initialized) return;

    if (this.sentryAvailable) {
      try {
        import('@sentry/react-native').then(Sentry => {
          Sentry.default.setUser(null);
        }).catch(() => {
          console.log('Cleared user context');
        });
      } catch (err) {
        console.log('Cleared user context');
      }
    } else {
      console.log('Cleared user context');
    }
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
    if (!this.initialized) return;

    if (this.sentryAvailable) {
      try {
        import('@sentry/react-native').then(Sentry => {
          Sentry.default.addBreadcrumb({
            message,
            category,
            data,
            level: 'info',
          });
        }).catch(() => {
          console.log(`[Breadcrumb: ${category}] ${message}`, data);
        });
      } catch (err) {
        console.log(`[Breadcrumb: ${category}] ${message}`, data);
      }
    } else {
      console.log(`[Breadcrumb: ${category}] ${message}`, data);
    }
  }

  /**
   * Private helper to log errors
   */
  private logError(error: Error, context?: Record<string, any>): void {
    console.error('🚨 Error captured:', {
      message: error.message,
      stack: error.stack,
      platform: Platform.OS,
      context,
    });
  }
}

export const errorTrackingService = new ErrorTrackingService();

