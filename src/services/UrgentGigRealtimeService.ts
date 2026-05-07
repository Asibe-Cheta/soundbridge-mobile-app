// src/services/UrgentGigRealtimeService.ts
// C7 — Supabase Realtime subscriptions for urgent gig screens.
// Follows the same channel pattern as src/services/realtime/realtimeService.ts.

import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

class UrgentGigRealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();

  // ---------------------------------------------------------------------------
  // Requester: watch gig_responses for a specific gig (UrgentGigResponsesScreen)
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to INSERT and UPDATE events on gig_responses for a given gig.
   * Called from UrgentGigResponsesScreen to get live provider cards.
   * Returns an unsubscribe function — call on screen unmount.
   */
  subscribeToGigResponses(
    gigId: string,
    onInsert: (response: any) => void,
    onUpdate: (response: any) => void
  ): () => void {
    const channelName = `gig-responses-${gigId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gig_responses',
          filter: `gig_id=eq.${gigId}`,
        },
        (payload) => {
          onInsert(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gig_responses',
          filter: `gig_id=eq.${gigId}`,
        },
        (payload) => {
          onUpdate(payload.new);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  // ---------------------------------------------------------------------------
  // Either party: watch a gig's urgent_status (ProviderGigDetailScreen,
  //               CreateUrgentGigScreen step 3)
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to UPDATE events on opportunity_posts (urgent gigs table) for a
   * specific gig.  Fires whenever urgent_status, selected_provider_id, etc. change.
   * Returns an unsubscribe function.
   */
  subscribeToGigStatus(
    gigId: string,
    onUpdate: (gig: any) => void
  ): () => void {
    const channelName = `gig-status-${gigId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'opportunity_posts',
          filter: `id=eq.${gigId}`,
        },
        (payload) => {
          onUpdate(payload.new);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  // ---------------------------------------------------------------------------
  // Unsubscribe all (call on logout / cleanup)
  // ---------------------------------------------------------------------------

  unsubscribeAll(): void {
    this.channels.forEach((channel) => channel.unsubscribe());
    this.channels.clear();
  }
}

export const urgentGigRealtimeService = new UrgentGigRealtimeService();
