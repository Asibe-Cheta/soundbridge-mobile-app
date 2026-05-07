import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/apiClient';

export interface OpportunityPost {
  id: string;
  type: 'collaboration' | 'event' | 'job';
  title: string;
  description: string;
  skills_needed: string[];
  location?: string;
  is_remote: boolean;
  date_from?: string;
  date_to?: string;
  budget_min?: number;
  budget_max?: number;
  budget_currency: string;
  visibility: 'public' | 'connections';
  is_featured: boolean;
  is_active: boolean;
  interest_count: number;
  expires_at: string;
  created_at: string;
  posted_by: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  has_expressed_interest: boolean;
  relevance_score?: number;
}

export interface OpportunityInterest {
  id: string;
  user: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
    headline?: string;
    is_verified?: boolean;
  };
  reason: string;
  message?: string;
  status: 'pending' | 'viewed' | 'accepted' | 'declined';
  created_at: string;
}

export interface OpportunityProject {
  id: string;
  opportunity_id: string;
  interest_id: string;
  poster_user_id: string;
  creator_user_id: string;
  title: string;
  brief: string;
  agreed_amount: number;
  currency: string;
  platform_fee_percent: number;
  platform_fee_amount: number;
  creator_payout_amount: number;
  deadline?: string;
  status:
    | 'awaiting_acceptance'
    | 'payment_pending'
    | 'active'
    | 'delivered'
    | 'completed'
    | 'disputed'
    | 'cancelled'
    | 'declined';
  stripe_payment_intent_id?: string;
  stripe_client_secret?: string;
  chat_thread_id?: string;
  created_at: string;
  completed_at?: string;
  delivered_at?: string;
  opportunity?: {
    title: string;
    type: string;
  };
  other_party?: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
}

async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

class OpportunityService {
  async getFeed(
    limit = 20,
    offset = 0,
    type?: string
  ): Promise<{ items: OpportunityPost[]; has_more: boolean }> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('get_recommended_opportunities', {
      p_user_id: session.user.id,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw error;

    const rawItems: OpportunityPost[] = (data || []).map((row: any) => ({
      ...row,
      posted_at: row.created_at,
    }));

    // Enrich posted_by.is_verified from profiles
    const authorIds = [...new Set(rawItems.map(i => i.posted_by?.id).filter(Boolean))];
    let verifiedMap = new Map<string, boolean>();
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, is_verified')
        .in('id', authorIds);
      profiles?.forEach(p => verifiedMap.set(p.id, p.is_verified ?? false));
    }

    const items = rawItems.map(item => ({
      ...item,
      posted_by: { ...item.posted_by, is_verified: verifiedMap.get(item.posted_by?.id) ?? item.posted_by?.is_verified },
    }));

    const filtered = type ? items.filter((i) => i.type === type) : items;

    return { items: filtered, has_more: filtered.length === limit };
  }

  async getMyOpportunities(): Promise<OpportunityPost[]> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const [result, profileResult] = await Promise.all([
      apiFetch<{ items: OpportunityPost[] }>('/api/opportunities/mine', { session }),
      supabase.from('profiles').select('id, username, display_name, avatar_url, is_verified').eq('id', session.user.id).single(),
    ]);

    const items = result.items || [];
    const profile = profileResult.data;
    return items.map(item => ({
      ...item,
      posted_by: {
        id: item.posted_by?.id ?? profile?.id ?? session.user.id,
        username: item.posted_by?.username ?? profile?.username ?? '',
        display_name: item.posted_by?.display_name || profile?.display_name || '',
        avatar_url: item.posted_by?.avatar_url ?? profile?.avatar_url,
        is_verified: item.posted_by?.is_verified ?? profile?.is_verified ?? false,
      },
    }));
  }

  async getActivePostCount(): Promise<number> {
    const session = await getSession();
    if (!session) return 0;

    const { count } = await supabase
      .from('opportunity_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    return count || 0;
  }

  async createOpportunity(data: {
    type: 'collaboration' | 'event' | 'job';
    title: string;
    description: string;
    skills_needed?: string[];
    location?: string;
    is_remote?: boolean;
    date_from?: string;
    date_to?: string;
    budget_min?: number;
    budget_max?: number;
    budget_currency?: string;
    visibility?: 'public' | 'connections';
  }): Promise<OpportunityPost> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    return apiFetch<OpportunityPost>('/api/opportunities', {
      method: 'POST',
      body: JSON.stringify(data),
      session,
    });
  }

  async deactivateOpportunity(id: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('opportunity_posts')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) throw new Error(error.message);
  }

  async deleteOpportunity(id: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // Check for active linked projects before attempting delete
    const { data: projects } = await supabase
      .from('opportunity_projects')
      .select('id, status')
      .eq('opportunity_id', id);

    const TERMINAL = ['completed', 'cancelled', 'declined'];
    const blocking = (projects || []).filter(p => !TERMINAL.includes(p.status));
    if (blocking.length > 0) {
      throw new Error('Cannot delete — there is an active project linked to this opportunity. Complete or cancel the project first.');
    }

    // Delete terminal projects if any exist
    if ((projects || []).length > 0) {
      const { error: projErr } = await supabase
        .from('opportunity_projects').delete().eq('opportunity_id', id);
      if (projErr) throw new Error(`Failed to remove linked projects: ${projErr.message}`);
    }

    // Delete interests (poster has permission to remove interests on their own opportunity)
    const { error: intErr } = await supabase
      .from('opportunity_interests').delete().eq('opportunity_id', id);
    if (intErr) throw new Error(`Failed to remove applicants: ${intErr.message}`);

    const { error } = await supabase
      .from('opportunity_posts')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) throw new Error(error.message);
  }

  async expressInterest(
    opportunityId: string,
    data: { reason: string; message?: string }
  ): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    await apiFetch(`/api/opportunities/${opportunityId}/interest`, {
      method: 'POST',
      body: JSON.stringify(data),
      session,
    });
  }

  async getInterests(opportunityId: string): Promise<OpportunityInterest[]> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const result = await apiFetch<{ items: OpportunityInterest[] }>(
      `/api/opportunities/${opportunityId}/interests`,
      { session }
    );
    return result.items || [];
  }

  async acceptInterestAndCreateProject(
    opportunityId: string,
    interestId: string,
    data: {
      agreed_amount: number;
      currency: string;
      deadline?: string;
      brief: string;
    }
  ): Promise<{ project: OpportunityProject; client_secret: string; customer_id?: string; ephemeral_key_secret?: string }> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    return apiFetch<{ project: OpportunityProject; client_secret: string; customer_id?: string; ephemeral_key_secret?: string }>(
      `/api/opportunities/${opportunityId}/interests/${interestId}/accept`,
      {
        method: 'POST',
        body: JSON.stringify(data),
        session,
      }
    );
  }

  async getMyProjects(
    role?: 'poster' | 'creator'
  ): Promise<OpportunityProject[]> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const query = role ? `?role=${role}` : '';
    const result = await apiFetch<{ items: OpportunityProject[] }>(
      `/api/opportunity-projects${query}`,
      { session }
    );
    return result.items || [];
  }

  async getProject(projectId: string): Promise<OpportunityProject> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    return apiFetch<OpportunityProject>(`/api/opportunity-projects/${projectId}`, {
      session,
    });
  }

  async acceptAgreement(projectId: string): Promise<OpportunityProject> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    return apiFetch<OpportunityProject>(
      `/api/opportunity-projects/${projectId}/accept-agreement`,
      { method: 'POST', session }
    );
  }

  async declineAgreement(projectId: string): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    await apiFetch(`/api/opportunity-projects/${projectId}/decline-agreement`, {
      method: 'POST',
      session,
    });
  }

  async markDelivered(projectId: string): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    await apiFetch(`/api/opportunity-projects/${projectId}/mark-delivered`, {
      method: 'POST',
      session,
    });
  }

  async confirmDelivery(projectId: string): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    await apiFetch(`/api/opportunity-projects/${projectId}/confirm-delivery`, {
      method: 'POST',
      session,
    });
  }

  async retryPayment(projectId: string): Promise<{ client_secret: string; customer_id?: string; ephemeral_key_secret?: string }> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    return apiFetch<{ client_secret: string; customer_id?: string; ephemeral_key_secret?: string }>(
      `/api/opportunity-projects/${projectId}/retry-payment`,
      { method: 'POST', session }
    );
  }

  /**
   * Called immediately after a successful Payment Sheet.
   * POST /api/opportunity-projects/:id/confirm-payment
   * Backend verifies the PaymentIntent with Stripe, advances project to
   * 'awaiting_acceptance', and sends a push notification to the provider.
   * This is belt-and-suspenders alongside the Stripe webhook.
   */
  async confirmPayment(projectId: string): Promise<OpportunityProject> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    return apiFetch<OpportunityProject>(
      `/api/opportunity-projects/${projectId}/confirm-payment`,
      { method: 'POST', session }
    );
  }

  /**
   * Raise a dispute for a project.
   * POST /api/disputes
   * Returns { success: true, data: { dispute_id: string } }
   */
  async raiseDispute(
    projectId: string,
    reason: string,
    description: string,
    evidenceUrls?: string[]
  ): Promise<{ dispute_id: string }> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const result = await apiFetch<{ success: boolean; data: { dispute_id: string } }>(
      '/api/disputes',
      {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          reason,
          description,
          ...(evidenceUrls && evidenceUrls.length > 0 && { evidence_urls: evidenceUrls }),
        }),
        session,
      }
    );
    return result.data;
  }
}

export const opportunityService = new OpportunityService();
