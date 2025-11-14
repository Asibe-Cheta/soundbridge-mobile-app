import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';

export interface TipAnalytics {
  total_tips: number;
  total_amount: string | number;
  total_earnings?: string | number;
  currency?: string;
  tips_by_tier?: Record<string, number>;
}

export interface TipAnalyticsResponse {
  success: boolean;
  analytics?: TipAnalytics;
  recentTips?: Array<Record<string, unknown>>;
  message?: string;
}

export interface TipAnalyticsParams {
  startDate?: string;
  endDate?: string;
}

function buildSupabaseCookie(session: Session | null) {
  if (!session?.access_token) {
    return undefined;
  }

  const parts = [`sb-access-token=${session.access_token}`];
  if (session.refresh_token) {
    parts.push(`sb-refresh-token=${session.refresh_token}`);
  }

  return parts.join('; ');
}

export async function getTipAnalytics(
  session: Session | null,
  params: TipAnalyticsParams = {}
): Promise<TipAnalytics | null> {
  if (!session?.access_token) {
    return null;
  }

  const query = new URLSearchParams();
  if (params.startDate) {
    query.append('start_date', params.startDate);
  }
  if (params.endDate) {
    query.append('end_date', params.endDate);
  }

  const path = `/api/user/tip-analytics${query.size > 0 ? `?${query.toString()}` : ''}`;

  try {
    const cookie = buildSupabaseCookie(session);
    const response = await apiFetch<TipAnalyticsResponse>(path, {
      method: 'GET',
      session,
      headers: cookie ? { Cookie: cookie } : undefined,
    });

    if (!response?.success || !response.analytics) {
      return null;
    }

    return response.analytics;
  } catch (error) {
    console.warn('TipAnalyticsService: failed to load analytics', error);
    return null;
  }
}






