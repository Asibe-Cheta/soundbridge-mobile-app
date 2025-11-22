/**
 * Two-Factor Authentication Service
 * Handles all 2FA API interactions
 */

import { supabase } from '../lib/supabase';
import type {
  TwoFactorSetupResponse,
  TwoFactorVerifySetupResponse,
  TwoFactorCheckRequiredResponse,
  TwoFactorVerifyCodeResponse,
  TwoFactorVerifyBackupCodeResponse,
  TwoFactorDisableResponse,
  TwoFactorRegenerateBackupCodesResponse,
  TwoFactorStatusResponse,
  TwoFactorErrorResponse,
  LoginResult,
  ParsedError,
} from '../types/twoFactor';

const API_BASE_URL = 'https://www.soundbridge.live/api/user/2fa';

// ============================================
// Helper Functions
// ============================================

/**
 * Get current session token for authenticated requests
 */
async function getAuthToken(): Promise<string | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    console.error('❌ No active session');
    return null;
  }
  return session.access_token;
}

/**
 * Parse 2FA error response
 */
export function parseTwoFactorError(error: any): ParsedError {
  const errorData: TwoFactorErrorResponse = error.response?.data || {};
  
  switch (errorData.code) {
    case 'INVALID_CODE':
      return {
        title: 'Invalid Code',
        message: errorData.error || 'The verification code you entered is incorrect',
        action: (errorData.attemptsRemaining || 0) > 0 ? 'Try again' : 'Use backup code',
        attemptsRemaining: errorData.attemptsRemaining,
      };
      
    case 'RATE_LIMIT_EXCEEDED':
    case 'ACCOUNT_LOCKED':
      return {
        title: 'Account Locked',
        message: errorData.error || 'Too many failed attempts',
        lockoutTime: errorData.lockoutTime,
        action: 'Wait and try again',
      };
      
    case 'BACKUP_CODE_USED':
      return {
        title: 'Code Already Used',
        message: 'This backup code has already been used. Please use a different code.',
        action: 'Try different code',
      };
      
    case 'SESSION_EXPIRED':
      return {
        title: 'Session Expired',
        message: 'Your setup session has expired. Please start the setup process again.',
        action: 'Restart setup',
      };
      
    case '2FA_ALREADY_ENABLED':
      return {
        title: '2FA Already Enabled',
        message: 'Two-factor authentication is already enabled for your account.',
        action: 'Disable first to reconfigure',
      };
      
    case 'INVALID_PASSWORD':
      return {
        title: 'Invalid Password',
        message: 'The password you entered is incorrect',
        action: 'Try again',
        attemptsRemaining: errorData.attemptsRemaining,
      };
      
    default:
      return {
        title: 'Error',
        message: errorData.error || 'An unexpected error occurred',
        action: 'Try again',
      };
  }
}

// ============================================
// Login Flow with 2FA
// ============================================

/**
 * Complete login flow with 2FA check
 * Based on Web Team's specification
 */
export async function loginWithTwoFactorCheck(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    console.log('🔐 Step 1: Attempting Supabase login...');
    
    // STEP 1: Login with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      throw new Error(error.message);
    }

    if (!data.session || !data.user) {
      throw new Error('Login failed - no session returned');
    }

    console.log('✅ Step 1 complete: Supabase login successful');
    console.log('👤 User ID:', data.user.id);
    
    // STEP 2: Check if 2FA is required
    console.log('🔒 Step 2: Checking if 2FA is enabled...');
    
    const twoFactorResponse = await fetch(`${API_BASE_URL}/check-required`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({
        userId: data.user.id,
      }),
    });

    if (!twoFactorResponse.ok) {
      throw new Error('Failed to check 2FA status');
    }

    const twoFactorData: TwoFactorCheckRequiredResponse = await twoFactorResponse.json();
    console.log('📊 2FA Status:', twoFactorData);

    // STEP 3: Handle 2FA requirement
    if (twoFactorData.twoFactorRequired) {
      console.log('🔐 2FA IS REQUIRED - User must verify');
      
      // ⚠️ CRITICAL: Sign out from Supabase to prevent bypass
      await supabase.auth.signOut();
      console.log('🚪 Supabase session cleared - awaiting 2FA verification');
      
      return {
        requires2FA: true,
        userId: data.user.id,
        email: data.user.email,
        sessionToken: twoFactorData.sessionToken,
      };
    } else {
      console.log('✅ 2FA NOT REQUIRED - Login complete');
      
      return {
        requires2FA: false,
        session: data.session,
        user: data.user,
      };
    }

  } catch (error: any) {
    console.error('❌ Login error:', error);
    throw error;
  }
}

// ============================================
// Setup Flow
// ============================================

/**
 * Initialize TOTP setup
 */
export async function setupTOTP(): Promise<TwoFactorSetupResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('🔧 Initializing 2FA setup...');
    
    const response = await fetch(`${API_BASE_URL}/setup-totp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Setup API error:', errorData);
      throw { response: { data: errorData } };
    }

    const apiResponse = await response.json();
    console.log('✅ 2FA setup API response:', apiResponse);
    
    // Normalize the response (web API returns data in nested 'data' object)
    const normalizedData: TwoFactorSetupResponse = {
      success: true,
      secret: apiResponse.data?.secret || apiResponse.secret || '',
      qrCode: apiResponse.data?.qrCode || apiResponse.qrCodeUrl || '',
      otpauthUrl: apiResponse.data?.otpauthUrl || apiResponse.otpauthUrl || '',
      backupCodes: apiResponse.backupCodes || [], // Empty array if not provided (will get after verification)
      sessionToken: apiResponse.sessionToken || '', // May not be needed
      expiresAt: apiResponse.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min default
    };
    
    console.log('✅ 2FA setup initialized (normalized)');
    
    return normalizedData;
  } catch (error: any) {
    console.error('❌ Setup error:', error);
    throw error;
  }
}

/**
 * Verify and complete TOTP setup
 */
export async function verifySetup(
  sessionToken: string,
  code: string
): Promise<TwoFactorVerifySetupResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    console.log('🔐 Verifying 2FA setup code...');
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const response = await fetch(`${API_BASE_URL}/verify-setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: user?.id,
        sessionToken,
        code,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw { response: { data: errorData } };
    }

    const data: TwoFactorVerifySetupResponse = await response.json();
    console.log('✅ 2FA enabled successfully');
    
    return data;
  } catch (error: any) {
    console.error('❌ Verification error:', error);
    throw error;
  }
}

// ============================================
// Verification Flow
// ============================================

/**
 * Verify TOTP code during login
 */
export async function verifyCode(
  userId: string,
  sessionToken: string,
  code: string,
  trustDevice: boolean = false
): Promise<TwoFactorVerifyCodeResponse> {
  try {
    console.log('🔐 Verifying 2FA code...');
    
    const response = await fetch(`${API_BASE_URL}/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        sessionToken,
        code,
        trustDevice,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw { response: { data: errorData } };
    }

    const data: TwoFactorVerifyCodeResponse = await response.json();
    console.log('✅ 2FA verification successful');

    // Set session in Supabase client
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    });

    if (sessionError) {
      console.error('❌ Failed to set session:', sessionError);
      throw new Error('Failed to establish session');
    }

    console.log('✅ Session established successfully');
    
    return data;
  } catch (error: any) {
    console.error('❌ Verification error:', error);
    throw error;
  }
}

/**
 * Verify backup code during login
 */
export async function verifyBackupCode(
  userId: string,
  sessionToken: string,
  backupCode: string
): Promise<TwoFactorVerifyBackupCodeResponse> {
  try {
    console.log('🔐 Verifying backup code...');
    
    // Clean backup code (remove hyphens, spaces, lowercase)
    const cleanCode = backupCode.replace(/[\s-]/g, '').toUpperCase();
    
    const response = await fetch(`${API_BASE_URL}/verify-backup-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        sessionToken,
        backupCode: cleanCode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw { response: { data: errorData } };
    }

    const data: TwoFactorVerifyBackupCodeResponse = await response.json();
    console.log('✅ Backup code verification successful');
    console.log(`📊 Backup codes remaining: ${data.backupCodesRemaining}`);

    // Set session in Supabase client
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    });

    if (sessionError) {
      console.error('❌ Failed to set session:', sessionError);
      throw new Error('Failed to establish session');
    }

    console.log('✅ Session established successfully');
    
    return data;
  } catch (error: any) {
    console.error('❌ Backup code verification error:', error);
    throw error;
  }
}

// ============================================
// Management
// ============================================

/**
 * Get 2FA status
 */
export async function getTwoFactorStatus(): Promise<TwoFactorStatusResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw { response: { data: errorData } };
    }

    const data: TwoFactorStatusResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error('❌ Status check error:', error);
    throw error;
  }
}

/**
 * Disable 2FA
 */
export async function disableTwoFactor(
  password: string,
  code: string
): Promise<TwoFactorDisableResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const { data: { user } } = await supabase.auth.getUser();

    console.log('🔓 Disabling 2FA...');
    
    const response = await fetch(`${API_BASE_URL}/disable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: user?.id,
        password,
        code,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw { response: { data: errorData } };
    }

    const data: TwoFactorDisableResponse = await response.json();
    console.log('✅ 2FA disabled successfully');
    
    return data;
  } catch (error: any) {
    console.error('❌ Disable error:', error);
    throw error;
  }
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(
  code: string
): Promise<TwoFactorRegenerateBackupCodesResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const { data: { user } } = await supabase.auth.getUser();

    console.log('🔄 Regenerating backup codes...');
    
    const response = await fetch(`${API_BASE_URL}/regenerate-backup-codes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: user?.id,
        code,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw { response: { data: errorData } };
    }

    const data: TwoFactorRegenerateBackupCodesResponse = await response.json();
    console.log('✅ Backup codes regenerated successfully');
    
    return data;
  } catch (error: any) {
    console.error('❌ Regenerate error:', error);
    throw error;
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format backup code for display (ABCD1234 → ABCD-1234)
 */
export function formatBackupCode(code: string): string {
  if (code.length !== 8) return code;
  return `${code.substring(0, 4)}-${code.substring(4)}`;
}

/**
 * Validate 6-digit TOTP code
 */
export function isValidTOTPCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Validate 8-character backup code
 */
export function isValidBackupCode(code: string): boolean {
  const cleaned = code.replace(/[\s-]/g, '');
  return /^[A-Z0-9]{8}$/i.test(cleaned);
}

