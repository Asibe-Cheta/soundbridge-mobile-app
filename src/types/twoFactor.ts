/**
 * 2FA Types - Matching Web API Response Format
 * Based on MOBILE_TEAM_2FA_CURRENT_STRUCTURE_UPDATE.md
 */

export interface TwoFactorStatusResponse {
  success: boolean;
  enabled: boolean;
  method: 'totp' | null;
  configuredAt: string | null;
  enabledAt: string | null;
  backupCodesRemaining: number;
  backupCodesTotal: number;
  needsRegenerateBackupCodes: boolean;
  recentActivity?: Array<{
    action: string;
    method: string;
    success: boolean;
    created_at: string;
    ip_address?: string;
  }>;
}

export interface TwoFactorSetupResponse {
  success: boolean;
  data: {
    secret: string;
    qrCode: string;
    otpauthUrl: string;
  };
  error?: string;
  code?: string;
}

export interface TwoFactorVerifySetupResponse {
  success: boolean;
  data?: {
    backupCodes: string[];
  };
  message?: string;
  error?: string;
  code?: string;
}

export interface TwoFactorDisableResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
}

export interface TwoFactorRegenerateBackupCodesResponse {
  success: boolean;
  data?: {
    backupCodes: string[];
  };
  error?: string;
  code?: string;
}

export interface TwoFactorVerifyCodeResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  accessToken?: string; // Returned after successful login verification
  refreshToken?: string; // Returned after successful login verification
  user?: {
    id: string;
    email: string;
    display_name?: string;
  };
  attemptsRemaining?: number;
  lockoutTime?: string;
}

export interface TwoFactorVerifyBackupCodeResponse {
  success: boolean;
  message?: string;
  data?: {
    backupCodesRemaining: number;
  };
  error?: string;
  code?: string;
  accessToken?: string; // Returned after successful login verification
  refreshToken?: string; // Returned after successful login verification
  user?: {
    id: string;
    email: string;
    display_name?: string;
  };
  warning?: string; // Warning about low backup codes
  attemptsRemaining?: number;
  lockoutTime?: string;
}

export interface TwoFactorCheckRequiredResponse {
  success: boolean;
  data?: {
    twoFactorRequired: boolean;
    sessionToken?: string;
    expiresIn?: number;
    message?: string;
    method?: 'totp';
  };
  error?: string;
  code?: string;
  // Legacy format support
  required?: boolean;
  sessionToken?: string;
  method?: 'totp';
}

// Login result type - Updated for secure login-initiate flow
export interface LoginResult {
  requires2FA: boolean;
  userId?: string;
  email?: string;
  verificationSessionId?: string; // New: Temporary session ID for 2FA verification (replaces sessionToken)
  sessionToken?: string; // Legacy: Keep for backward compatibility during transition
  session?: any;
  user?: any;
}

export interface ParsedError {
  title: string;
  message: string;
  action: string;
  lockoutTime?: string;
  attemptsRemaining?: number;
}

export type TwoFactorErrorCode =
  | 'AUTH_REQUIRED'
  | 'INVALID_SESSION'
  | 'SESSION_EXPIRED'
  | '2FA_ALREADY_ENABLED'
  | 'SETUP_FAILED'
  | 'INVALID_CODE'
  | 'CODE_EXPIRED'
  | 'INVALID_BACKUP_CODE'
  | 'BACKUP_CODE_USED'
  | 'BACKUP_CODE_EXPIRED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ACCOUNT_LOCKED'
  | '2FA_NOT_ENABLED'
  | 'INVALID_PASSWORD'
  | 'INTERNAL_ERROR'
  | 'VALIDATION_ERROR';

export interface TwoFactorErrorResponse {
  success: false;
  error: string;
  code?: TwoFactorErrorCode;
  attemptsRemaining?: number;
  lockoutTime?: string;
  metadata?: Record<string, any>;
}
