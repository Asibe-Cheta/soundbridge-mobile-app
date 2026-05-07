import { supabase } from '../lib/supabase';
import { config } from '../config/environment';

const API_BASE_URL = config.apiUrl.replace(/\/api\/?$/, '');

export interface DMCANoticeData {
  content_id: string;
  content_type: 'track' | 'post' | 'playlist';
  copyrighted_work_description: string;
  infringing_url: string;
  claimant_name: string;
  claimant_email: string;
  claimant_address: string;
  claimant_phone?: string;
  good_faith_statement: true;
  accuracy_statement: true;
  signature: string;
  jurisdiction: 'DMCA' | 'CDPA';
}

export interface CounterNoticeData {
  statement: string;
  penalty_of_perjury_consent: true;
  court_jurisdiction_consent: true;
  service_address: string;
}

export interface TakedownRecord {
  id: string;
  content_id: string;
  content_type: string;
  status: 'pending' | 'actioned' | 'counter_notice_received' | 'restored' | 'dismissed';
  claimant_name: string;
  claimant_email: string;
  jurisdiction: 'DMCA' | 'CDPA';
  created_at: string;
  actioned_at?: string;
  counter_notice_at?: string;
  restore_after?: string;
}

class TakedownService {
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async submitTakedownNotice(data: DMCANoticeData): Promise<{ takedown_id: string }> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required to submit a takedown notice');
    }

    const response = await fetch(`${API_BASE_URL}/api/takedowns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit takedown notice');
    }

    return { takedown_id: result.takedown_id };
  }

  async submitCounterNotice(takedownId: string, data: CounterNoticeData): Promise<void> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required to submit a counter-notice');
    }

    const response = await fetch(`${API_BASE_URL}/api/takedowns/${takedownId}/counter-notice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit counter-notice');
    }
  }

  async getTakedownStatus(takedownId: string): Promise<TakedownRecord> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/api/takedowns/${takedownId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch takedown status');
    }

    return result as TakedownRecord;
  }
}

export const takedownService = new TakedownService();
