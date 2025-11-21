/**
 * Two-Factor Authentication MOCK Service
 * For development and testing without web APIs
 * 
 * Usage: Import this instead of real service during development
 * Switch to real service when APIs are ready
 */

import type {
  TwoFactorSetupResponse,
  TwoFactorVerifySetupResponse,
  TwoFactorCheckRequiredResponse,
  TwoFactorVerifyCodeResponse,
  TwoFactorVerifyBackupCodeResponse,
  TwoFactorDisableResponse,
  TwoFactorRegenerateBackupCodesResponse,
  TwoFactorStatusResponse,
  LoginResult,
} from '../types/twoFactor';
import { formatBackupCode, isValidTOTPCode, isValidBackupCode, parseTwoFactorError } from './twoFactorAuthService';

// ============================================
// Mock Configuration
// ============================================

const MOCK_DELAY = 800; // Simulate API delay
const MOCK_VALID_CODE = '123456'; // Accept this code for testing
const MOCK_BACKUP_CODES = [
  'ABCD1234',
  'EFGH5678',
  'IJKL9012',
  'MNOP3456',
  'QRST7890',
  'UVWX1234',
  'YZAB5678',
  'CDEF9012',
  'GHIJ3456',
  'KLMN7890',
];

// Mock state
let mock2FAEnabled = false;
let mockUsedBackupCodes: Set<string> = new Set();
let mockSetupAttempts = 0;
let mockVerifyAttempts = 0;

/**
 * Simulate API delay
 */
const delay = (ms: number = MOCK_DELAY) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// Login Flow (Mock)
// ============================================

export async function loginWithTwoFactorCheck(
  email: string,
  password: string
): Promise<LoginResult> {
  await delay();
  
  console.log('🎭 MOCK: Login with 2FA check');
  
  // Simulate: Users ending with "2fa" have 2FA enabled
  if (email.toLowerCase().includes('2fa')) {
    console.log('🎭 MOCK: 2FA required for this user');
    return {
      requires2FA: true,
      userId: 'mock-user-id-123',
      email,
      sessionToken: 'mock-session-token-' + Date.now(),
    };
  }
  
  console.log('🎭 MOCK: No 2FA required');
  return {
    requires2FA: false,
    session: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
    user: { id: 'mock-user-id-123', email },
  };
}

// ============================================
// Setup Flow (Mock)
// ============================================

export async function setupTOTP(): Promise<TwoFactorSetupResponse> {
  await delay();
  
  console.log('🎭 MOCK: Setting up 2FA');
  
  // Simulate rate limiting
  mockSetupAttempts++;
  if (mockSetupAttempts > 3) {
    throw {
      response: {
        data: {
          success: false,
          error: 'Too many setup attempts. Please try again in 1 hour.',
          code: 'RATE_LIMIT_EXCEEDED',
          attemptsRemaining: 0,
          lockoutTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }
      }
    };
  }
  
  // Simulate already enabled
  if (mock2FAEnabled) {
    throw {
      response: {
        data: {
          success: false,
          error: '2FA is already enabled. Disable it first to reconfigure.',
          code: '2FA_ALREADY_ENABLED',
        }
      }
    };
  }
  
  return {
    success: true,
    secret: 'JBSWY3DPEHPK3PXP',
    qrCodeUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // 1x1 red pixel (placeholder)
    otpauthUrl: 'otpauth://totp/SoundBridge:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SoundBridge',
    backupCodes: [...MOCK_BACKUP_CODES],
    sessionToken: 'mock-setup-session-' + Date.now(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
}

export async function verifySetup(
  sessionToken: string,
  code: string
): Promise<TwoFactorVerifySetupResponse> {
  await delay();
  
  console.log('🎭 MOCK: Verifying setup code:', code);
  
  // Simulate session expiration
  if (sessionToken.startsWith('expired-')) {
    throw {
      response: {
        data: {
          success: false,
          error: 'Invalid or expired session',
          code: 'SESSION_EXPIRED',
        }
      }
    };
  }
  
  // Accept the mock valid code
  if (code === MOCK_VALID_CODE) {
    mock2FAEnabled = true;
    mockUsedBackupCodes.clear();
    console.log('🎭 MOCK: 2FA enabled successfully');
    
    return {
      success: true,
      enabled: true,
      backupCodesStored: 10,
      message: '2FA successfully enabled',
    };
  }
  
  // Simulate attempts
  mockVerifyAttempts++;
  throw {
    response: {
      data: {
        success: false,
        error: 'Invalid verification code',
        code: 'INVALID_CODE',
        attemptsRemaining: Math.max(0, 3 - mockVerifyAttempts),
      }
    }
  };
}

// ============================================
// Verification Flow (Mock)
// ============================================

export async function verifyCode(
  userId: string,
  sessionToken: string,
  code: string,
  trustDevice: boolean = false
): Promise<TwoFactorVerifyCodeResponse> {
  await delay();
  
  console.log('🎭 MOCK: Verifying 2FA code:', code);
  
  // Simulate rate limiting
  mockVerifyAttempts++;
  if (mockVerifyAttempts > 5) {
    throw {
      response: {
        data: {
          success: false,
          error: 'Too many verification attempts. Account locked for 15 minutes.',
          code: 'ACCOUNT_LOCKED',
          attemptsRemaining: 0,
          lockoutTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        }
      }
    };
  }
  
  // Accept the mock valid code
  if (code === MOCK_VALID_CODE) {
    mockVerifyAttempts = 0; // Reset attempts on success
    console.log('🎭 MOCK: 2FA verification successful');
    
    return {
      success: true,
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      user: {
        id: userId,
        email: 'test@example.com',
      },
    };
  }
  
  throw {
    response: {
      data: {
        success: false,
        error: 'Invalid verification code',
        code: 'INVALID_CODE',
        attemptsRemaining: Math.max(0, 5 - mockVerifyAttempts),
      }
    }
  };
}

export async function verifyBackupCode(
  userId: string,
  sessionToken: string,
  backupCode: string
): Promise<TwoFactorVerifyBackupCodeResponse> {
  await delay();
  
  const cleanCode = backupCode.replace(/[\s-]/g, '').toUpperCase();
  console.log('🎭 MOCK: Verifying backup code:', cleanCode);
  
  // Check if code was already used
  if (mockUsedBackupCodes.has(cleanCode)) {
    throw {
      response: {
        data: {
          success: false,
          error: 'This backup code has already been used',
          code: 'BACKUP_CODE_USED',
        }
      }
    };
  }
  
  // Check if code is valid
  if (MOCK_BACKUP_CODES.includes(cleanCode)) {
    mockUsedBackupCodes.add(cleanCode);
    const remaining = MOCK_BACKUP_CODES.length - mockUsedBackupCodes.size;
    
    console.log('🎭 MOCK: Backup code verified, remaining:', remaining);
    
    return {
      success: true,
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      backupCodesRemaining: remaining,
      warning: remaining < 3 ? `You have ${remaining} backup codes remaining. Consider regenerating them.` : undefined,
    };
  }
  
  throw {
    response: {
      data: {
        success: false,
        error: 'Invalid or already used backup code',
        code: 'INVALID_BACKUP_CODE',
      }
    }
  };
}

// ============================================
// Management (Mock)
// ============================================

export async function getTwoFactorStatus(): Promise<TwoFactorStatusResponse> {
  await delay(300);
  
  console.log('🎭 MOCK: Getting 2FA status');
  
  if (!mock2FAEnabled) {
    return {
      enabled: false,
    };
  }
  
  return {
    enabled: true,
    method: 'totp',
    configuredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    backupCodesRemaining: MOCK_BACKUP_CODES.length - mockUsedBackupCodes.size,
    backupCodesExpireAt: new Date(Date.now() + 83 * 24 * 60 * 60 * 1000).toISOString(), // 83 days from now
  };
}

export async function disableTwoFactor(
  password: string,
  code: string
): Promise<TwoFactorDisableResponse> {
  await delay();
  
  console.log('🎭 MOCK: Disabling 2FA');
  
  // Simulate invalid password
  if (password !== 'password123') {
    throw {
      response: {
        data: {
          success: false,
          error: 'Invalid password. Please try again.',
          code: 'INVALID_PASSWORD',
          attemptsRemaining: 2,
        }
      }
    };
  }
  
  // Simulate invalid code
  if (code !== MOCK_VALID_CODE) {
    throw {
      response: {
        data: {
          success: false,
          error: 'Invalid verification code',
          code: 'INVALID_CODE',
          attemptsRemaining: 2,
        }
      }
    };
  }
  
  mock2FAEnabled = false;
  mockUsedBackupCodes.clear();
  mockSetupAttempts = 0;
  mockVerifyAttempts = 0;
  
  console.log('🎭 MOCK: 2FA disabled successfully');
  
  return {
    success: true,
    message: '2FA disabled successfully',
  };
}

export async function regenerateBackupCodes(
  code: string
): Promise<TwoFactorRegenerateBackupCodesResponse> {
  await delay();
  
  console.log('🎭 MOCK: Regenerating backup codes');
  
  // Simulate invalid code
  if (code !== MOCK_VALID_CODE) {
    throw {
      response: {
        data: {
          success: false,
          error: 'Invalid verification code',
          code: 'INVALID_CODE',
          attemptsRemaining: 2,
        }
      }
    };
  }
  
  // Generate new backup codes (same as original for mock)
  mockUsedBackupCodes.clear();
  
  console.log('🎭 MOCK: Backup codes regenerated');
  
  return {
    success: true,
    backupCodes: [...MOCK_BACKUP_CODES],
  };
}

// ============================================
// Mock Control Functions (for testing)
// ============================================

/**
 * Reset mock state (for testing)
 */
export function resetMockState() {
  mock2FAEnabled = false;
  mockUsedBackupCodes.clear();
  mockSetupAttempts = 0;
  mockVerifyAttempts = 0;
  console.log('🎭 MOCK: State reset');
}

/**
 * Enable 2FA for testing (skip setup flow)
 */
export function mockEnable2FA() {
  mock2FAEnabled = true;
  console.log('🎭 MOCK: 2FA enabled (manual)');
}

/**
 * Get mock configuration
 */
export function getMockConfig() {
  return {
    validCode: MOCK_VALID_CODE,
    backupCodes: [...MOCK_BACKUP_CODES],
    enabled: mock2FAEnabled,
    usedBackupCodes: Array.from(mockUsedBackupCodes),
  };
}

// Re-export utility functions
export { formatBackupCode, isValidTOTPCode, isValidBackupCode, parseTwoFactorError };

