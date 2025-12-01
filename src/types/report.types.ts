export type ReportType =
  | 'copyright_infringement'
  | 'spam'
  | 'inappropriate_content'
  | 'harassment'
  | 'fake_content'
  | 'unauthorized_use'
  | 'other';

export type ContentType = 'post' | 'comment' | 'track' | 'profile' | 'playlist';

export interface ReportContentDto {
  contentType: ContentType;
  contentId: string;
  reportType: ReportType;
  reason: string; // REQUIRED - minimum 10 characters
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

