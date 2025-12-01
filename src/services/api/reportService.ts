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

      // Build request body - use camelCase field names as per API spec
      const requestBody: any = {
        contentType: reportData.contentType,
        contentId: reportData.contentId,
        reportType: reportData.reportType,
        reason: reportData.reason, // REQUIRED - minimum 10 characters
      };

      // Only include description if it's provided and not empty
      if (reportData.description && reportData.description.trim().length > 0) {
        requestBody.description = reportData.description.trim();
      }

      console.log('📋 ReportService: Submitting report:', {
        url: this.baseUrl,
        body: requestBody,
        bodyString: JSON.stringify(requestBody),
      });

      const response = await apiFetch<ReportResponse>(
        this.baseUrl,
        {
          method: 'POST',
          session: currentSession,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        } as any
      );

      return response;
    } catch (error: any) {
      console.error('ReportService.reportContent:', error);
      console.error('ReportService error details:', {
        status: error.status,
        body: error.body,
        bodyType: typeof error.body,
        bodyString: typeof error.body === 'string' ? error.body : JSON.stringify(error.body, null, 2),
        message: error.message,
      });
      
      // Try to log the full error object
      try {
        console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error('Could not stringify error:', e);
      }
      
      // Extract detailed error message from response body
      let errorMessage = 'Failed to submit report. Please try again.';
      
      if (error.status === 401) {
        errorMessage = 'Please log in to report content';
      } else if (error.status === 400) {
        // Try to extract specific error message from response body
        if (error.body) {
          if (typeof error.body === 'string') {
            try {
              const parsed = JSON.parse(error.body);
              errorMessage = parsed.error || parsed.message || 'Invalid request data. Please check your input.';
            } catch {
              errorMessage = error.body || 'Invalid request data. Please check your input.';
            }
          } else if (typeof error.body === 'object') {
            errorMessage = error.body.error || error.body.message || error.body.details || 'Invalid request data. Please check your input.';
          }
        } else {
          errorMessage = 'Invalid request data. Please check your input.';
        }
      } else if (error.status === 500) {
        errorMessage = 'Something went wrong. Please try again.';
      } else if (error.message && error.message !== 'API request failed') {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }
}

export const reportService = new ReportService();

