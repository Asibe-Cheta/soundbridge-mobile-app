import { supabase } from '../lib/supabase';

type EventType = 'explore_courses_tap' | 'screen_view' | 'resource_tap';

function partnerNameFromResource(resource: string): string | null {
  if (resource.startsWith('sa_')) return 'Sound Academy';
  if (resource.startsWith('t2d_')) return 'Talk2Dan';
  if (resource.startsWith('herts_')) return 'University of Hertfordshire';
  if (resource.startsWith('mbg_')) return 'MBG Sonics';
  return null;
}

const proResourceAnalytics = {
  async track(eventType: EventType, resource?: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('pro_resource_events').insert({
        user_id: user.id,
        event_type: eventType,
        resource: resource ?? null,
      });
      if (eventType === 'resource_tap' && resource) {
        const partnerName = partnerNameFromResource(resource);
        if (partnerName) {
          supabase.from('partner_resource_clicks').insert({
            user_id: user.id,
            partner_name: partnerName,
          }).then(() => {});
        }
      }
    } catch {
      // non-critical, never surface to the user
    }
  },
};

export default proResourceAnalytics;
