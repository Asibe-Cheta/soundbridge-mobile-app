/**
 * Two-Factor Authentication Types
 * Based on Web Team API Specification
 */

// ============================================
// API Response Types
// ============================================

export interface TwoFactorSetupResponse {
  success: true;
  secret: string; // Base32 encoded secret for manual entry
  qrCodeUrl: string; // Base64 PNG image: "data:image/png;base64,..."
  otpauthUrl: string; // OTPAuth URL for deep linking
  backupCodes: string[]; // 10 codes, 8-char alphanumeric uppercase
  sessionToken: string; // Temporary session for verification
  expiresAt: string; // ISO timestamp
}

export interface TwoFactorVerifySetupResponse {
  success: true;
  enabled: true;
  backupCodesStored: number;
  message: string;
}

export interface TwoFactorCheckRequiredResponse {
  twoFactorRequired: boolean;
  method?: 'totp';
  sessionToken?: string;
}

export interface TwoFactorVerifyCodeResponse {
  success: true;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
  };
}

export interface TwoFactorVerifyBackupCodeResponse {
  success: true;
  accessToken: string;
  refreshToken: string;
  backupCodesRemaining: number;
  warning?: string;
}

export interface TwoFactorDisableResponse {
  success: true;
  message: string;
}

export interface TwoFactorRegenerateBackupCodesResponse {
  success: true;
  backupCodes: string[];
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  method?: 'totp';
  configuredAt?: string;
  lastUsedAt?: string;
  backupCodesRemaining?: number;
  backupCodesExpireAt?: string;
}

// ============================================
// Error Response Types
// ============================================

export type TwoFactorErrorCode =
  // Authentication
  | 'AUTH_REQUIRED'
  | 'INVALID_SESSION'
  | 'SESSION_EXPIRED'
  // Setup
  | '2FA_ALREADY_ENABLED'
  | 'SETUP_FAILED'
  // Verification
  | 'INVALID_CODE'
  | 'CODE_EXPIRED'
  // Backup Codes
  | 'INVALID_BACKUP_CODE'
  | 'BACKUP_CODE_USED'
  | 'BACKUP_CODE_EXPIRED'
  // Rate Limiting
  | 'RATE_LIMIT_EXCEEDED'
  | 'ACCOUNT_LOCKED'
  // Disable
  | '2FA_NOT_ENABLED'
  | 'INVALID_PASSWORD'
  // Generic
  | 'INTERNAL_ERROR'
  | 'VALIDATION_ERROR';

export interface TwoFactorErrorResponse {
  success: false;
  error: string; // Human-readable error message
  code?: TwoFactorErrorCode; // Machine-readable error code
  attemptsRemaining?: number; // Only for rate-limited endpoints
  lockoutTime?: string; // ISO timestamp when lockout expires
  metadata?: Record<string, any>; // Optional additional context
}

// ============================================
// Request Types
// ============================================

export interface TwoFactorSetupRequest {
  userId: string;
}

export interface TwoFactorVerifySetupRequest {
  userId: string;
  sessionToken: string;
  code: string; // 6-digit TOTP code
}

export interface TwoFactorCheckRequiredRequest {
  userId: string;
}

export interface TwoFactorVerifyCodeRequest {
  userId: string;
  sessionToken: string;
  code: string; // 6-digit TOTP code
  trustDevice?: boolean;
}

export interface TwoFactorVerifyBackupCodeRequest {
  userId: string;
  sessionToken: string;
  backupCode: string; // 8-character backup code
}

export interface TwoFactorDisableRequest {
  userId: string;
  password: string;
  code: string; // Current TOTP code or backup code
}

export interface TwoFactorRegenerateBackupCodesRequest {
  userId: string;
  code: string; // Current TOTP code for verification
}

// ============================================
// UI State Types
// ============================================

export interface TwoFactorState {
  enabled: boolean;
  configuredAt?: Date;
  lastUsedAt?: Date;
  backupCodesRemaining: number;
}

export interface TwoFactorSetupData {
  secret: string;
  qrCodeUrl: string;
  otpauthUrl: string;
  backupCodes: string[];
  sessionToken: string;
  expiresAt: Date;
}

// ============================================
// Login Flow Types
// ============================================

export interface LoginResult {
  requires2FA: boolean;
  userId?: string;
  email?: string;
  sessionToken?: string;
  session?: any;
  user?: any;
}

// ============================================
// Error Handling Types
// ============================================

export interface ParsedError {
  title: string;
  message: string;
  action: string;
  lockoutTime?: string;
  attemptsRemaining?: number;
}

