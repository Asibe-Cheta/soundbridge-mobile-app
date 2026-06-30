import { apiFetch } from '../lib/apiClient';
import { supabase } from '../lib/supabase';

export const CREATOR_AGREEMENT_VERSION = 'v1.0';

export interface CreatorUploadAccessResponse {
  success: boolean;
  canUpload: boolean;
  needsBecomeCreator: boolean;
  role: string;
  creator_agreement_accepted: boolean;
  reason: string | null;
}

// Session cache — shared across hook instances and BecomeCreatorModal.
let _sessionAccepted: boolean | null = null;

export const isCreatorAgreementCached = () => _sessionAccepted === true;

export const setCreatorAgreementCached = (accepted: boolean) => {
  _sessionAccepted = accepted ? true : null;
};

class CreatorAgreementService {
  async getUploadAccess(): Promise<CreatorUploadAccessResponse | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      return await apiFetch<CreatorUploadAccessResponse>('/api/user/creator-upload-access', {
        session,
        method: 'GET',
      });
    } catch (err) {
      console.error('[CreatorAgreementService] getUploadAccess error:', err);
      return null;
    }
  }

  async acceptAgreement(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      await apiFetch('/api/user/become-creator', {
        session,
        method: 'POST',
        body: JSON.stringify({
          creator_agreement_accepted: true,
          creator_agreement_version: CREATOR_AGREEMENT_VERSION,
        }),
      });
      setCreatorAgreementCached(true);
      return true;
    } catch (err) {
      console.error('[CreatorAgreementService] acceptAgreement error:', err);
      return false;
    }
  }

  /** Authoritative server check — used before upload / first creator action. */
  async hasAcceptedAgreement(): Promise<boolean> {
    if (_sessionAccepted === true) return true;

    const access = await this.getUploadAccess();
    if (!access) return false;

    if (access.canUpload || access.creator_agreement_accepted) {
      setCreatorAgreementCached(true);
      return true;
    }

    return false;
  }
}

export const creatorAgreementService = new CreatorAgreementService();
