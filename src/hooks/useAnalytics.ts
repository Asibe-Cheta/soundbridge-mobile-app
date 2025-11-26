import { useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { analyticsService } from '../services/analytics/analyticsService';

export const useAnalytics = () => {
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    // Initialize analytics on mount
    analyticsService.initialize();

    // Track screen views
    const unsubscribe = navigation.addListener('state', () => {
      const currentRoute = navigation.getCurrentRoute();
      if (currentRoute) {
        analyticsService.trackScreen(currentRoute.name, {
          params: currentRoute.params,
        });
      }
    });

    // Track current screen on mount
    if (route) {
      analyticsService.trackScreen(route.name, {
        params: route.params,
      });
    }

    return () => {
      unsubscribe();
    };
  }, [navigation, route]);

  // Return tracking functions
  return {
    trackEvent: analyticsService.trackEvent.bind(analyticsService),
    trackUserAction: analyticsService.trackUserAction.bind(analyticsService),
    trackEngagement: analyticsService.trackEngagement.bind(analyticsService),
    trackError: analyticsService.trackError.bind(analyticsService),
    trackSearch: analyticsService.trackSearch.bind(analyticsService),
    trackShare: analyticsService.trackShare.bind(analyticsService),
  };
};

