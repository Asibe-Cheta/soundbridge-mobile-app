/**
 * Two-Factor Authentication Service Configuration
 * Switch between MOCK and REAL services
 */

// ============================================
// Configuration
// ============================================

/**
 * Set to TRUE to use MOCK service (for development/testing)
 * Set to FALSE to use REAL service (for production with web APIs)
 */
export const USE_MOCK_2FA_SERVICE = false; // ✅ Using REAL 2FA APIs from web team

// ============================================
// Service Imports
// ============================================

import * as MockService from './twoFactorAuthMockService';
import * as RealService from './twoFactorAuthService';

// ============================================
// Service Selection
// ============================================

const selectedService = USE_MOCK_2FA_SERVICE ? MockService : RealService;

// Log service selection
if (USE_MOCK_2FA_SERVICE) {
  console.log('🎭 Using MOCK 2FA Service (Development Mode)');
  console.log('💡 Accepted test code: 123456');
  console.log('💡 To use real APIs, set USE_MOCK_2FA_SERVICE = false in twoFactorAuthConfig.ts');
} else {
  console.log('🔌 Using REAL 2FA Service (Production Mode)');
  console.log('🌐 Connecting to: https://www.soundbridge.live/api/user/2fa');
}

// ============================================
// Exported Functions
// ============================================

// Re-export functions, but for real service, we need to get session from context
import { supabase } from '../lib/supabase';

// Helper to get current session
async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export const loginWithTwoFactorCheck = selectedService.loginWithTwoFactorCheck;

// Export login-specific verification functions
export const verifyCodeDuringLogin = selectedService.verifyCodeDuringLogin;
export const verifyBackupCodeDuringLogin = selectedService.verifyBackupCodeDuringLogin;

// Wrap functions that need session
export async function setupTOTP(...args: any[]) {
  if (USE_MOCK_2FA_SERVICE) {
    return selectedService.setupTOTP(...args);
  }
  const session = await getCurrentSession();
  return selectedService.setupTOTP(session);
}

export async function verifySetup(code: string, secret: string | null, ...args: any[]) {
  if (USE_MOCK_2FA_SERVICE) {
    return selectedService.verifySetup(code, secret, ...args);
  }
  const session = await getCurrentSession();
  return selectedService.verifySetup(code, secret, session);
}

export async function verifyCode(code: string, ...args: any[]) {
  if (USE_MOCK_2FA_SERVICE) {
    return selectedService.verifyCode(code, ...args);
  }
  const session = await getCurrentSession();
  return selectedService.verifyCode(code, session);
}

export async function verifyBackupCode(code: string, ...args: any[]) {
  if (USE_MOCK_2FA_SERVICE) {
    return selectedService.verifyBackupCode(code, ...args);
  }
  const session = await getCurrentSession();
  return selectedService.verifyBackupCode(code, session);
}

export async function getTwoFactorStatus(...args: any[]) {
  if (USE_MOCK_2FA_SERVICE) {
    return selectedService.getTwoFactorStatus(...args);
  }
  const session = await getCurrentSession();
  return selectedService.getTwoFactorStatus(session);
}

export async function disableTwoFactor(code: string, ...args: any[]) {
  if (USE_MOCK_2FA_SERVICE) {
    return selectedService.disableTwoFactor(code, ...args);
  }
  const session = await getCurrentSession();
  return selectedService.disableTwoFactor(code, session);
}

export async function regenerateBackupCodes(...args: any[]) {
  if (USE_MOCK_2FA_SERVICE) {
    return selectedService.regenerateBackupCodes(...args);
  }
  const session = await getCurrentSession();
  return selectedService.regenerateBackupCodes(session);
}

export const parseTwoFactorError = selectedService.parseTwoFactorError;

// ============================================
// Quick Test Function
// ============================================

/**
 * Quick test to verify 2FA service is working
 */
export async function test2FAService() {
  try {
    const status = await getTwoFactorStatus();
    console.log('✅ 2FA Service Test: SUCCESS');
    console.log('📊 Current Status:', status);
    return true;
  } catch (error) {
    console.error('❌ 2FA Service Test: FAILED', error);
    return false;
  }
}
