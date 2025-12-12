/**
 * Event Ticket Service
 * Handles Stripe payment processing for event ticket purchases
 */

import { supabase } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://soundbridge.live/api';

export interface TicketPaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

export interface PurchaseTicketParams {
  eventId: string;
  quantity: number;
  priceGbp?: number;
  priceNgn?: number;
  currency: 'GBP' | 'NGN';
}

export interface EventTicket {
  id: string;
  event_id: string;
  user_id: string;
  ticket_code: string;
  quantity: number;
  amount_paid: number;
  currency: string;
  payment_intent_id: string;
  purchase_date: string;
  status: 'active' | 'used' | 'refunded';
  event?: any;
}

export const EventTicketService = {
  /**
   * Create a payment intent for event ticket purchase
   */
  async createTicketPaymentIntent(params: PurchaseTicketParams): Promise<TicketPaymentIntent> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('User not authenticated');
      }

      console.log('🎟️ Creating payment intent for event ticket:', params);

      const response = await fetch(`${API_URL}/events/create-ticket-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to create payment intent');
      }

      const data = await response.json();
      console.log('✅ Ticket payment intent created:', data.paymentIntentId);

      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
        amount: data.amount,
        currency: data.currency,
      };
    } catch (error) {
      console.error('❌ Error creating ticket payment intent:', error);
      throw error;
    }
  },

  /**
   * Confirm ticket purchase (after Stripe confirmation)
   */
  async confirmTicketPurchase(
    paymentIntentId: string,
    eventId: string,
    quantity: number,
    amount: number,
    currency: string
  ): Promise<EventTicket> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const user = session?.user;

      if (!token || !user) {
        throw new Error('User not authenticated');
      }

      console.log('✅ Confirming ticket purchase:', paymentIntentId);

      const response = await fetch(`${API_URL}/events/confirm-ticket-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentIntentId,
          eventId,
          quantity,
          amount,
          currency,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to confirm ticket purchase');
      }

      const ticket = await response.json();
      console.log('🎟️ Ticket purchase confirmed:', ticket.ticket_code);

      return ticket;
    } catch (error) {
      console.error('❌ Error confirming ticket purchase:', error);
      throw error;
    }
  },

  /**
   * Get user's tickets for an event
   */
  async getUserEventTickets(eventId: string): Promise<EventTicket[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('event_tickets')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', session.user.id)
        .in('status', ['active', 'used'])
        .order('purchase_date', { ascending: false });

      if (error) {
        console.error('Error fetching user tickets:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error getting user event tickets:', error);
      return [];
    }
  },

  /**
   * Get all user's tickets
   */
  async getAllUserTickets(): Promise<EventTicket[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('event_tickets')
        .select(`
          *,
          event:events(
            id,
            title,
            event_date,
            location,
            venue,
            image_url
          )
        `)
        .eq('user_id', session.user.id)
        .in('status', ['active', 'used'])
        .order('purchase_date', { ascending: false });

      if (error) {
        console.error('Error fetching all user tickets:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error getting all user tickets:', error);
      return [];
    }
  },

  /**
   * Validate a ticket code
   */
  async validateTicket(ticketCode: string): Promise<{ valid: boolean; ticket?: EventTicket; message: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${API_URL}/events/validate-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ticketCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          valid: false,
          message: errorData.message || 'Invalid ticket code',
        };
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error validating ticket:', error);
      return {
        valid: false,
        message: 'Failed to validate ticket',
      };
    }
  },

  /**
   * Generate QR code data for ticket
   */
  generateTicketQRData(ticket: EventTicket): string {
    return JSON.stringify({
      ticketId: ticket.id,
      ticketCode: ticket.ticket_code,
      eventId: ticket.event_id,
      userId: ticket.user_id,
      quantity: ticket.quantity,
    });
  },
};

export default EventTicketService;
