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
  private basePath = '/api/account-deletion';

  async getReasons(): Promise<AccountDeletionReason[]> {
    const response = await apiFetch<{ reasons: AccountDeletionReason[] }>(`${this.basePath}/reasons`);
    const reasons = response.reasons || [];
    return reasons.map((r, i) => ({
      ...r,
      id: r.id || r.label?.toLowerCase().replace(/\s+/g, '_') || String(i),
    }));
  }

  async requestDeletion(session: Session, payload: AccountDeletionRequest) {
    return apiFetch<{ success: boolean; message?: string }>(`${this.basePath}`, {
      method: 'POST',
      session,
      body: JSON.stringify(payload),
    });
  }
}

export const accountDeletionService = new AccountDeletionService();
