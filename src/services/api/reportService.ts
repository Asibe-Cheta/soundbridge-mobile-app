import { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/apiClient';
import type { ReportContentDto, ReportResponse } from '../../types/report.types';

export class ReportService {
  private baseUrl = '/api/reports/content';

  /**
   * Report content (post, comment, track, profile, playlist)
   */
  async reportContent(
    reportData: ReportContentDto,
    session?: Session | null
  ): Promise<ReportResponse> {
    try {
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      if (!currentSession) {
        throw new Error('Authentication required');
      }

      const response = await apiFetch<ReportResponse>(
        this.baseUrl,
        {
          method: 'POST',
          session: currentSession,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content_type: reportData.contentType,
            content_id: reportData.contentId,
            report_type: reportData.reportType,
            description: reportData.description?.trim() || undefined,
          }),
        } as any
      );

      return response;
    } catch (error: any) {
      console.error('ReportService.reportContent:', error);
      
      if (error.status === 401) {
        throw new Error('Please log in to report content');
      } else if (error.status === 400) {
        throw new Error('Invalid request data');
      } else if (error.status === 500) {
        throw new Error('Something went wrong. Please try again.');
      } else if (error.message) {
        throw error;
      } else {
        throw new Error('Failed to submit report. Please try again.');
      }
    }
  }
}

export const reportService = new ReportService();

