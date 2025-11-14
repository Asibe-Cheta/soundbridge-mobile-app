import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';

export interface EarningsSummaryPeriod {
  start_date: string;
  end_date: string;
}

export interface EarningsSummaryTips {
  amount: string | number;
  count: number;
  currency: string;
}

export interface EarningsSummaryStreams {
  count: number;
  top_tracks: Array<{
    id: string;
    title: string;
    plays: number;
    likes?: number;
  }>;
}

export interface EarningsSummaryFollowers {
  new_count: number;
  total_count: number;
}

export interface EarningsSummaryEngagement {
  likes: number;
  comments: number;
  shares: number;
}

export interface CreatorEarningsSummary {
  success: boolean;
  month?: string;
  period: EarningsSummaryPeriod;
  tips: EarningsSummaryTips;
  streams: EarningsSummaryStreams;
  followers: EarningsSummaryFollowers;
  engagement: EarningsSummaryEngagement;
}

interface EarningsApiResponse extends CreatorEarningsSummary {
  message?: string;
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

export async function getCreatorEarningsSummary(
  session: Session | null,
  month?: string
): Promise<CreatorEarningsSummary | null> {
  if (!session?.access_token) {
    return null;
  }

  const params = new URLSearchParams();
  if (month) {
    params.append('month', month);
  }

  const path = `/api/creator/earnings-summary${params.size > 0 ? `?${params.toString()}` : ''}`;

  try {
    const cookie = buildSupabaseCookie(session);
    const response = await apiFetch<EarningsApiResponse>(path, {
      method: 'GET',
      session,
      headers: cookie ? { Cookie: cookie } : undefined,
    });

    if (!response?.success) {
      return null;
    }

    return response;
  } catch (error) {
    console.warn('EarningsService: failed to load earnings summary', error);
    return null;
  }
}






