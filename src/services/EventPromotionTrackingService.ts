import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/apiClient';

type Source = 'notification' | 'feed_card' | 'direct_search' | 'shared_link' | 'other';

const EventPromotionTrackingService = {
  trackView(eventId: string, source: Source): void {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      apiFetch('/api/events/promotion-interaction', {
        method: 'POST',
        session,
        body: JSON.stringify({ event_id: eventId, source }),
      }).catch(() => {});
    }).catch(() => {});
  },
};

export default EventPromotionTrackingService;
