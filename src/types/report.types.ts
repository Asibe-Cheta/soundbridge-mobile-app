export type ReportType =
  | 'spam'
  | 'inappropriate'
  | 'harassment'
  | 'fake'
  | 'copyright'
  | 'other';

export type ContentType = 'post' | 'comment' | 'track' | 'profile' | 'playlist';

export interface ReportContentDto {
  contentType: ContentType;
  contentId: string;
  reportType: ReportType;
  description?: string;
}

export interface ReportResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    content_type: ContentType;
    content_id: string;
    report_type: ReportType;
    description?: string;
    created_at: string;
  };
}

