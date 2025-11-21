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

export const loginWithTwoFactorCheck = selectedService.loginWithTwoFactorCheck;
export const setupTOTP = selectedService.setupTOTP;
export const verifySetup = selectedService.verifySetup;
export const verifyCode = selectedService.verifyCode;
export const verifyBackupCode = selectedService.verifyBackupCode;
export const getTwoFactorStatus = selectedService.getTwoFactorStatus;
export const disableTwoFactor = selectedService.disableTwoFactor;
export const regenerateBackupCodes = selectedService.regenerateBackupCodes;
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
