/**
 * 2FA Service - Mobile App Implementation
 * Based on MOBILE_TEAM_2FA_CURRENT_STRUCTURE_UPDATE.md
 * 
 * All endpoints use /api/user/2fa/* with Bearer token authentication
 */

import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';
import { supabase } from '../lib/supabase';
import { config } from '../config/environment';
import { debugLog, debugError, debugWarn, debugInfo } from '../utils/logStore';
import type {
  TwoFactorStatusResponse,
  TwoFactorSetupResponse,
  TwoFactorVerifySetupResponse,
  TwoFactorDisableResponse,
  TwoFactorRegenerateBackupCodesResponse,
  TwoFactorVerifyCodeResponse,
  TwoFactorVerifyBackupCodeResponse,
  TwoFactorCheckRequiredResponse,
  LoginResult,
} from '../types/twoFactor';

const API_BASE = '/api/user/2fa';

/**
 * Complete login flow with 2FA check - Secure Implementation
 * Uses /api/auth/login-initiate endpoint to validate credentials and check 2FA
 * BEFORE creating a session, preventing the brief app flash
 */
export async function loginWithTwoFactorCheck(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password;

    debugLog('🔐 Initiating secure login flow...');
    debugLog('📧 Email:', normalizedEmail);
    
    debugLog('🌐 Calling login-initiate endpoint:', '/api/auth/login-initiate');
    
    // Call the new secure endpoint that validates credentials first
    const data = await apiFetch<any>('/api/auth/login-initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
    });
    debugLog('📊 Login-initiate response:', JSON.stringify({
      success: data.success,
      requires2FA: data.requires2FA,
      hasUserId: !!data.data?.userId,
      hasVerificationSessionId: !!data.data?.verificationSessionId,
      hasAccessToken: !!data.data?.accessToken,
    }, null, 2));
    
    if (!data.success) {
      throw new Error(data.error || 'Login failed');
    }
    
    if (data.requires2FA) {
      debugLog('🔐 2FA required - no session created yet');
      debugLog('👤 User ID:', data.data.userId);
      debugLog('📧 Email:', data.data.email);
      debugLog('🔑 Verification Session ID:', data.data.verificationSessionId?.substring(0, 20) + '...');
      
      // Return 2FA requirement WITHOUT signing in
      // User state remains false, so AppNavigator won't show MainTabs
      return {
        requires2FA: true,
        userId: data.data.userId,
        email: data.data.email,
        verificationSessionId: data.data.verificationSessionId,
        // Legacy support - map verificationSessionId to sessionToken for backward compatibility
        sessionToken: data.data.verificationSessionId,
      };
    } else {
      debugLog('✅ No 2FA required - setting session directly');
      debugLog('🔑 Access token length:', data.data.accessToken?.length || 0);
      debugLog('🔑 Refresh token length:', data.data.refreshToken?.length || 0);
      
      // Set the session in Supabase client
      // This will trigger onAuthStateChange → user becomes true → AppNavigator shows MainTabs
      await setSupabaseSessionFromTokens(
        data.data.accessToken,
        data.data.refreshToken
      );
      
      debugLog('✅ Session set successfully');
      
      return {
        requires2FA: false,
        session: data.data.session,
        user: data.data.user,
      };
    }
  } catch (error: any) {
    debugError('❌ Login initiate error:', error);
    
    // Provide user-friendly error message
    const errorMessage = error?.body?.error || error?.message || error?.toString() || 'Login failed';
    const authError = new Error(errorMessage);
    if (error?.body?.code) {
      (authError as any).code = error.body.code;
    }
    if (error?.status) {
      (authError as any).status = error.status;
    }
    throw authError;
  }
}

/**
 * Get current 2FA status
 * Response format: { success: true, enabled: boolean, ... } (flat, not nested!)
 */
export async function getTwoFactorStatus(
  session: Session | null
): Promise<TwoFactorStatusResponse> {
  if (!session) {
    throw new Error('Session required');
  }

  try {
    const response = await apiFetch<TwoFactorStatusResponse>(
      `${API_BASE}/status`,
      {
        method: 'GET',
        session,
      }
    );

    // Response is already flat format from web team
    return response;
  } catch (error: any) {
    console.error('❌ Failed to get 2FA status:', error);
    throw new Error(error.body?.error || error.message || 'Failed to check 2FA status');
  }
}

/**
 * Generate TOTP secret and QR code for setup
 * Returns: { success: true, data: { secret, qrCode, otpauthUrl } }
 */
export async function setupTOTP(
  session: Session | null
): Promise<TwoFactorSetupResponse> {
  if (!session) {
    throw new Error('Session required');
  }

  try {
    const response = await apiFetch<TwoFactorSetupResponse>(
      `${API_BASE}/setup-totp`,
      {
        method: 'POST',
        session,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    return response;
  } catch (error: any) {
    console.error('❌ Failed to setup TOTP:', error);
    const errorMessage = error.body?.error || error.message || 'Failed to setup 2FA';
    return {
      success: false,
      error: errorMessage,
      code: error.body?.code,
      data: {
        secret: '',
        qrCode: '',
        otpauthUrl: '',
      },
    };
  }
}

/**
 * Verify TOTP code and complete 2FA setup
 * Returns backup codes after successful verification
 */
export async function verifySetup(
  code: string,
  secret: string | null,
  session: Session | null
): Promise<TwoFactorVerifySetupResponse> {
  if (!session) {
    throw new Error('Session required');
  }

  if (!code || code.length !== 6) {
    return {
      success: false,
      error: 'Please enter a valid 6-digit code',
      code: 'INVALID_CODE',
    };
  }

  try {
    const body: { code: string; secret?: string } = { code };
    if (secret) {
      body.secret = secret;
    }

    const response = await apiFetch<TwoFactorVerifySetupResponse>(
      `${API_BASE}/verify-setup`,
      {
        method: 'POST',
        session,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    return response;
  } catch (error: any) {
    console.error('❌ Failed to verify setup:', error);
    return {
      success: false,
      error: error.body?.error || error.message || 'Invalid verification code',
      code: error.body?.code || 'VERIFICATION_FAILED',
    };
  }
}

/**
 * Disable 2FA (requires TOTP code, NOT password!)
 */
export async function disableTwoFactor(
  code: string,
  session: Session | null
): Promise<TwoFactorDisableResponse> {
  if (!session) {
    throw new Error('Session required');
  }

  if (!code || code.length !== 6) {
    return {
      success: false,
      error: 'Please enter a valid 6-digit code',
      code: 'INVALID_CODE',
    };
  }

  try {
    const response = await apiFetch<TwoFactorDisableResponse>(
      `${API_BASE}/disable`,
      {
        method: 'POST',
        session,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      }
    );

    return response;
  } catch (error: any) {
    console.error('❌ Failed to disable 2FA:', error);
    return {
      success: false,
      error: error.body?.error || error.message || 'Failed to disable 2FA',
      code: error.body?.code || 'DISABLE_FAILED',
    };
  }
}

/**
 * Regenerate backup codes (invalidates old ones)
 */
export async function regenerateBackupCodes(
  session: Session | null
): Promise<TwoFactorRegenerateBackupCodesResponse> {
  if (!session) {
    throw new Error('Session required');
  }

  try {
    const response = await apiFetch<TwoFactorRegenerateBackupCodesResponse>(
      `${API_BASE}/regenerate-backup-codes`,
      {
        method: 'POST',
        session,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    return response;
  } catch (error: any) {
    console.error('❌ Failed to regenerate backup codes:', error);
    return {
      success: false,
      error: error.body?.error || error.message || 'Failed to regenerate backup codes',
      code: error.body?.code || 'REGENERATE_FAILED',
    };
  }
}

/**
 * Verify TOTP code during login (uses verificationSessionId, not Supabase session)
 * Updated to use verificationSessionId from secure login-initiate flow
 */
export async function verifyCodeDuringLogin(
  userId: string,
  verificationSessionId: string, // Changed from sessionToken to verificationSessionId
  code: string,
  trustDevice: boolean = false
): Promise<TwoFactorVerifyCodeResponse> {
  if (!code || code.length !== 6) {
    return {
      success: false,
      error: 'Please enter a valid 6-digit code',
      code: 'INVALID_CODE',
    };
  }

  // Validate code format (6 digits only)
  if (!/^\d{6}$/.test(code)) {
    return {
      success: false,
      error: 'Code must be exactly 6 digits',
      code: 'INVALID_CODE_FORMAT',
    };
  }

  try {
    debugLog('🔐 Verifying 2FA code during login...');
    debugLog('📝 Request details:', {
      endpoint: `${API_BASE}/verify-code`,
      verificationSessionId: verificationSessionId.substring(0, 20) + '...',
      code: code,
      codeLength: code.length,
    });
    
    // ✅ UPDATED FORMAT (Secure login-initiate flow):
    // - NO Authorization header
    // - verificationSessionId and code in body
    // - NO userId, NO trustDevice
    // Use direct fetch instead of apiFetch to avoid automatic Authorization header
    const API_BASE_URL = config.apiUrl.replace(/\/api\/?$/, '');
    const url = `${API_BASE_URL}${API_BASE}/verify-code`;
    
    debugLog('🌐 Calling verify-code endpoint:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ✅ NO Authorization header
      },
      body: JSON.stringify({ 
        verificationSessionId, // ✅ Use verificationSessionId from login-initiate
        code,                  // ✅ Only code in body (6-digit string)
        // ❌ REMOVED: userId, trustDevice, sessionToken (legacy)
      }),
    });
    
    debugLog('📡 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Verify-code failed:', errorData);
      throw {
        status: response.status,
        body: errorData,
      };
    }
    
    const responseData = await response.json();
    debugLog('📊 Verify-code response data (FULL):', JSON.stringify(responseData, null, 2));
    
    // Web team confirmed: tokens are in data.accessToken and data.refreshToken
    const accessToken = responseData.data?.accessToken;
    const refreshToken = responseData.data?.refreshToken;
    
    debugLog('🔑 Token extraction:', {
      hasData: !!responseData.data,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0,
      dataKeys: responseData.data ? Object.keys(responseData.data) : 'no data',
    });
    
    // Transform response to match expected format
    // Web team: success is true and data.verified is true when verification succeeds
    const isSuccess = responseData.success === true && responseData.data?.verified === true;
    const transformedResponse: TwoFactorVerifyCodeResponse = {
      success: isSuccess,
      error: responseData.error,
      code: responseData.code,
      attemptsRemaining: responseData.attemptsRemaining,
      lockoutTime: responseData.lockoutTime,
    };
    
    debugLog('📊 Verify-code API response:', {
      success: transformedResponse.success,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      error: transformedResponse.error,
    });

    // If successful, the response should contain new access/refresh tokens
    // We need to set these in Supabase
    if (transformedResponse.success) {
      if (accessToken && refreshToken) {
        debugLog('✅ 2FA verification successful, setting Supabase session...');
        debugLog('🔑 Access token length:', accessToken.length);
        debugLog('🔑 Refresh token length:', refreshToken.length);
        debugLog('🔧 About to call setSupabaseSessionFromTokens...');
        
        try {
          await setSupabaseSessionFromTokens(accessToken, refreshToken);
          debugLog('✅ Supabase session set successfully');
        } catch (sessionError: any) {
          debugError('❌ Failed to set Supabase session:', sessionError);
          debugError('❌ Error details:', {
            message: sessionError?.message,
            name: sessionError?.name,
            stack: sessionError?.stack,
          });
          // Don't throw - let the screen handle it
          // But mark the response as having an issue
          (transformedResponse as any).sessionError = sessionError.message;
        }
        
        // Store tokens in the response object so the screen can access them
        (transformedResponse as any).accessToken = accessToken;
        (transformedResponse as any).refreshToken = refreshToken;
      } else {
        debugError('❌ No access/refresh tokens in response:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          responseDataKeys: Object.keys(responseData),
          dataKeys: responseData.data ? Object.keys(responseData.data) : 'no data',
          fullResponse: JSON.stringify(responseData, null, 2),
        });
        // Mark as failed if no tokens
        transformedResponse.success = false;
        transformedResponse.error = 'Verification succeeded but no tokens received. Please try again.';
      }
    } else {
      debugError('❌ Verification failed:', transformedResponse.error);
    }

    return transformedResponse;
  } catch (error: any) {
    debugError('❌ Failed to verify code:', error);
    return {
      success: false,
      error: error.body?.error || error.message || 'Invalid verification code',
      code: error.body?.code || 'VERIFICATION_FAILED',
      attemptsRemaining: error.body?.attemptsRemaining,
      lockoutTime: error.body?.lockoutTime,
    };
  }
}

/**
 * Verify backup code during login (uses verificationSessionId, not Supabase session)
 * Updated to use verificationSessionId from secure login-initiate flow
 */
export async function verifyBackupCodeDuringLogin(
  userId: string,
  verificationSessionId: string, // Changed from sessionToken to verificationSessionId
  code: string
): Promise<TwoFactorVerifyBackupCodeResponse> {
  if (!code) {
    return {
      success: false,
      error: 'Please enter a backup code',
      code: 'INVALID_CODE',
    };
  }

  // Clean the code (remove spaces and hyphens)
  const cleanedCode = code.replace(/[\s-]/g, '');

  try {
    debugLog('🔐 Verifying backup code during login...');
    debugLog('📝 Request details:', {
      endpoint: `${API_BASE}/verify-backup-code`,
      verificationSessionId: verificationSessionId.substring(0, 20) + '...',
      codeLength: cleanedCode.length,
    });
    
    // Use direct fetch instead of apiFetch to avoid automatic Authorization header
    const API_BASE_URL = config.apiUrl.replace(/\/api\/?$/, '');
    const url = `${API_BASE_URL}${API_BASE}/verify-backup-code`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ✅ NO Authorization header - use verificationSessionId in body
      },
      body: JSON.stringify({ 
        verificationSessionId, // ✅ Use verificationSessionId from login-initiate
        backupCode: cleanedCode,
        // ❌ REMOVED: userId, sessionToken (legacy)
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw {
        status: response.status,
        body: errorData,
      };
    }
    
    const responseData = await response.json();
    debugLog('📊 Verify-backup-code response data (FULL):', JSON.stringify(responseData, null, 2));

    // If successful, the response should contain new access/refresh tokens
    // Check both nested (data.accessToken) and flat (accessToken) formats
    const accessToken = responseData.data?.accessToken || responseData.accessToken;
    const refreshToken = responseData.data?.refreshToken || responseData.refreshToken;
    
    debugLog('🔑 Token extraction:', {
      hasData: !!responseData.data,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0,
    });
    
    if (responseData.success && accessToken && refreshToken) {
      debugLog('✅ Backup code verification successful, setting Supabase session...');
      debugLog('🔑 Access token length:', accessToken.length);
      debugLog('🔑 Refresh token length:', refreshToken.length);
      await setSupabaseSessionFromTokens(accessToken, refreshToken);
      debugLog('✅ Supabase session set successfully');
    } else if (responseData.success) {
      debugWarn('⚠️ Backup code verification succeeded but no tokens in response');
    }

    // Transform to match expected response format
    const transformedResponse: TwoFactorVerifyBackupCodeResponse = {
      success: responseData.success === true,
      error: responseData.error,
      code: responseData.code,
      attemptsRemaining: responseData.attemptsRemaining,
      lockoutTime: responseData.lockoutTime,
      warning: responseData.warning,
    };
    
    // Store tokens in response if available
    if (accessToken && refreshToken) {
      (transformedResponse as any).accessToken = accessToken;
      (transformedResponse as any).refreshToken = refreshToken;
    }

    return transformedResponse;
  } catch (error: any) {
    console.error('❌ Failed to verify backup code:', error);
    return {
      success: false,
      error: error.body?.error || error.message || 'Invalid backup code',
      code: error.body?.code || 'VERIFICATION_FAILED',
      attemptsRemaining: error.body?.attemptsRemaining,
      lockoutTime: error.body?.lockoutTime,
    };
  }
}

/**
 * Helper: Set Supabase session from access/refresh tokens
 * This is called after successful 2FA verification
 * 
 * ⚠️ WORKAROUND: Uses onAuthStateChange listener because setSession() hangs in React Native
 */
async function setSupabaseSessionFromTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  debugLog('🔧🔧🔧 setSupabaseSessionFromTokens CALLED - START 🔧🔧🔧');
  debugLog('🔧 Using onAuthStateChange workaround for React Native');
  debugLog('🔑 Access token (first 50 chars):', accessToken.substring(0, 50) + '...');
  debugLog('🔑 Refresh token (first 20 chars):', refreshToken.substring(0, 20) + '...');
  
  return new Promise((resolve, reject) => {
    let resolved = false;
    let subscription: any = null;
    
    debugLog('🔐 Setting up session listener...');
    
    // Set up listener BEFORE calling setSession (Claude's solution)
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!resolved && event === 'SIGNED_IN' && session) {
          debugLog('✅ SIGNED_IN event received');
          resolved = true;
          
          // Unsubscribe from this temporary listener (Claude's solution)
          if (subscription) {
            subscription.unsubscribe();
          }
          
          // Small delay to ensure state propagates (Claude's solution)
          setTimeout(() => {
            resolve();
          }, 100);
        }
      }
    );
    
    subscription = authSubscription;
    
    // Set timeout for the operation (Claude's solution)
    const timeout = setTimeout(() => {
      if (!resolved) {
        debugError('❌ Session setup timed out');
        resolved = true;
        if (subscription) {
          subscription.unsubscribe();
        }
        reject(new Error('Session setup timed out'));
      }
    }, 10000); // 10 second timeout
    
    // Call setSession (Claude's solution)
    debugLog('🔐 Calling setSession...');
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    }).then(({ error }) => {
      if (error && !resolved) {
        debugError('❌ setSession error:', error);
        resolved = true;
        clearTimeout(timeout);
        if (subscription) {
          subscription.unsubscribe();
        }
        reject(error);
      }
    }).catch((err) => {
      if (!resolved) {
        debugError('❌ setSession exception:', err);
        resolved = true;
        clearTimeout(timeout);
        if (subscription) {
          subscription.unsubscribe();
        }
        reject(err);
      }
    });
  });
}

/**
 * Verify TOTP code (for authenticated users, uses Supabase session)
 * This is for other flows, not login
 */
export async function verifyCode(
  code: string,
  session: Session | null
): Promise<TwoFactorVerifyCodeResponse> {
  if (!session) {
    throw new Error('Session required');
  }

  if (!code || code.length !== 6) {
    return {
      success: false,
      error: 'Please enter a valid 6-digit code',
      code: 'INVALID_CODE',
    };
  }

  try {
    const response = await apiFetch<TwoFactorVerifyCodeResponse>(
      `${API_BASE}/verify-code`,
      {
        method: 'POST',
        session,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      }
    );

    return response;
  } catch (error: any) {
    console.error('❌ Failed to verify code:', error);
    return {
      success: false,
      error: error.body?.error || error.message || 'Invalid verification code',
      code: error.body?.code || 'VERIFICATION_FAILED',
    };
  }
}

/**
 * Verify backup code (for authenticated users, uses Supabase session)
 * This is for other flows, not login
 */
export async function verifyBackupCode(
  code: string,
  session: Session | null
): Promise<TwoFactorVerifyBackupCodeResponse> {
  if (!session) {
    throw new Error('Session required');
  }

  if (!code) {
    return {
      success: false,
      error: 'Please enter a backup code',
      code: 'INVALID_CODE',
    };
  }

  try {
    const response = await apiFetch<TwoFactorVerifyBackupCodeResponse>(
      `${API_BASE}/verify-backup-code`,
      {
        method: 'POST',
        session,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      }
    );

    return response;
  } catch (error: any) {
    console.error('❌ Failed to verify backup code:', error);
    return {
      success: false,
      error: error.body?.error || error.message || 'Invalid backup code',
      code: error.body?.code || 'VERIFICATION_FAILED',
    };
  }
}

/**
 * Check if 2FA is required after login
 * Matches web team's API specification: POST /api/user/2fa/check-required
 */
export async function checkTwoFactorRequired(
  session: Session | null,
  userId: string
): Promise<TwoFactorCheckRequiredResponse> {
  if (!session) {
    throw new Error('Session required');
  }

  if (!userId) {
    throw new Error('User ID required');
  }

  try {
    debugLog('🔍 Checking 2FA requirement for user:', userId);
    debugLog('🔑 Using access token:', session.access_token.substring(0, 20) + '...');
    debugLog('🌐 API endpoint:', `${API_BASE}/check-required`);
    
    const response = await apiFetch<TwoFactorCheckRequiredResponse>(
      `${API_BASE}/check-required`,
      {
        method: 'POST', // ✅ POST method per web team spec
        session,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId, // ✅ Include userId in body per web team spec
        }),
      }
    );

    debugLog('📊 2FA check raw response:', JSON.stringify(response, null, 2));
    debugLog('📊 Response type:', typeof response);
    debugLog('📊 Has success:', 'success' in response);
    debugLog('📊 Has data:', 'data' in response);
    debugLog('📊 Has required:', 'required' in response);

    // Handle both new format (nested) and legacy format (flat)
    if (response && typeof response === 'object') {
      // Check for new nested format: { success: true, data: { twoFactorRequired: true, sessionToken: "..." } }
      if ('success' in response && response.success && 'data' in response && response.data) {
        const data = response.data as any;
        debugLog('✅ Using nested format');
        debugLog('📊 twoFactorRequired:', data.twoFactorRequired);
        debugLog('📊 sessionToken:', data.sessionToken ? data.sessionToken.substring(0, 20) + '...' : 'missing');
        
        return {
          success: true,
          data: {
            twoFactorRequired: data.twoFactorRequired ?? false,
            sessionToken: data.sessionToken,
            expiresIn: data.expiresIn,
            message: data.message,
            method: data.method || 'totp',
          },
          required: data.twoFactorRequired ?? false, // For backward compatibility
          sessionToken: data.sessionToken,
          method: data.method || 'totp',
        };
      }
      
      // Check for legacy flat format: { required: true, sessionToken: "..." }
      if ('required' in response) {
        debugLog('✅ Using legacy flat format');
        debugLog('📊 required:', (response as any).required);
        debugLog('📊 sessionToken:', (response as any).sessionToken ? (response as any).sessionToken.substring(0, 20) + '...' : 'missing');
        
        return {
          success: true,
          data: {
            twoFactorRequired: (response as any).required ?? false,
            sessionToken: (response as any).sessionToken,
            method: (response as any).method || 'totp',
          },
          required: (response as any).required ?? false,
          sessionToken: (response as any).sessionToken,
          method: (response as any).method || 'totp',
        };
      }
    }
    
    // If we get here, the response format is unexpected
    debugWarn('⚠️ Unexpected response format, defaulting to 2FA not required');
    debugWarn('📊 Response:', JSON.stringify(response, null, 2));
    
    return {
      success: true,
      data: {
        twoFactorRequired: false,
      },
      required: false,
    };
  } catch (error: any) {
    debugError('❌ Failed to check 2FA required:', error);
    debugError('📊 Error type:', error?.constructor?.name);
    debugError('📊 Error message:', error?.message);
    debugError('📊 Error status:', error?.status);
    debugError('📊 Error body:', JSON.stringify(error?.body, null, 2));
    
    // Re-throw the error so the caller can handle it
    throw error;
  }
}

// ============================================
// Utility Functions
// ============================================

import type { ParsedError, TwoFactorErrorResponse } from '../types/twoFactor';

/**
 * Parse 2FA error response into user-friendly format
 */
export function parseTwoFactorError(error: any): ParsedError {
  const errorData: TwoFactorErrorResponse = error?.response?.data || error?.body || {};
  
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
      
    default:
      return {
        title: 'Error',
        message: errorData.error || error?.message || 'An unexpected error occurred',
        action: 'Try again',
      };
  }
}

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
