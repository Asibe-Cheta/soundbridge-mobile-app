import { config } from '../config/environment';
import { apiFetch } from '../lib/apiClient';
import type { Session } from '@supabase/supabase-js';

export type AccountDeletionReason = {
  id: string;
  label: string;
  requires_detail?: boolean;
};

export type AccountDeletionRequest = {
  reason_id: string;
  detail?: string;
};

class AccountDeletionService {
  private baseUrl = `${config.apiUrl}/account-deletion`;

  async getReasons(): Promise<AccountDeletionReason[]> {
    const response = await apiFetch<{ reasons: AccountDeletionReason[] }>(`${this.baseUrl}/reasons`);
    return response.reasons || [];
  }

  async requestDeletion(session: Session, payload: AccountDeletionRequest) {
    return apiFetch<{ success: boolean; message?: string }>(`${this.baseUrl}`, {
      method: 'POST',
      session,
      body: payload,
    });
  }
}

export const accountDeletionService = new AccountDeletionService();
