import { Session } from '@supabase/supabase-js';

// Default to production web domain unless overridden at build time
// Using www.soundbridge.live per web team specification for service provider endpoints
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.soundbridge.live';

type RequestOptions = RequestInit & {
  session?: Session | null;
  accessToken?: string;
};

export const getApiBaseUrl = () => API_BASE_URL;

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { session, accessToken, headers, ...rest } = options;
  const token = accessToken || session?.access_token;

  const url = `${API_BASE_URL}${path}`;
  
  console.log(`🌐 API Request: ${rest.method || 'GET'} ${url}`);
  console.log(`🔑 Has token: ${!!token}`);
  console.log(`📦 Has session: ${!!session}`);
  if (token) {
    console.log(`🔐 Token length: ${token.length}, Token preview: ${token.substring(0, 20)}...`);
  }

  // Authentication headers per web team specification:
  // - Use ONLY Authorization: Bearer {token} header (most reliable)
  // - If Cookie header is passed, preserve it (some endpoints require Cookie)
  // Check for Cookie header in various formats (Record, Headers object, etc.)
  let hasCookieAuth = false;
  let cookieValue: string | undefined;
  
  if (headers) {
    if (headers instanceof Headers) {
      cookieValue = headers.get('Cookie') || headers.get('cookie') || undefined;
      hasCookieAuth = !!cookieValue;
    } else if (typeof headers === 'object' && !Array.isArray(headers)) {
      // Handle Record<string, string> or similar
      cookieValue = (headers as any).Cookie || (headers as any).cookie || undefined;
      hasCookieAuth = !!cookieValue || 'Cookie' in headers || 'cookie' in headers;
      if (hasCookieAuth && !cookieValue) {
        cookieValue = (headers as any).Cookie || (headers as any).cookie;
      }
    }
  }
  
  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (hasCookieAuth && cookieValue) {
    // Cookie-based auth: send Cookie header, but also include Bearer token if available
    mergedHeaders['Cookie'] = cookieValue;
    if (token) {
      mergedHeaders['Authorization'] = `Bearer ${token}`;
    }
    // Merge any other headers that were passed (excluding Cookie to avoid duplicates)
    if (headers && typeof headers === 'object' && !Array.isArray(headers) && !(headers instanceof Headers)) {
      Object.keys(headers).forEach(key => {
        if (key.toLowerCase() !== 'cookie' && key !== 'Cookie') {
          mergedHeaders[key] = (headers as any)[key];
        }
      });
    }
    console.log(`🍪 Using Cookie authentication${token ? ' + Bearer token' : ''}`);
    console.log(`🍪 Cookie header: ${cookieValue.substring(0, 50)}...`);
  } else if (token) {
    // Bearer token auth: use ONLY Authorization header per web team recommendation
    mergedHeaders['Authorization'] = `Bearer ${token}`;
    console.log(`🔐 Using Bearer token authentication (Authorization header only)`);
    
    // Merge any other headers that were passed (but don't add extra auth headers)
    if (headers) {
      if (headers instanceof Headers) {
        headers.forEach((value, key) => {
          if (key.toLowerCase() !== 'authorization') {
            mergedHeaders[key] = value;
          }
        });
      } else if (typeof headers === 'object' && !Array.isArray(headers)) {
        Object.assign(mergedHeaders, headers);
      }
    }
  } else if (headers) {
    // No auth token, but headers were passed
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        mergedHeaders[key] = value;
      });
    } else if (typeof headers === 'object' && !Array.isArray(headers)) {
      Object.assign(mergedHeaders, headers);
    }
  }

  try {
    const response = await fetch(url, {
      ...rest,
      headers: mergedHeaders,
    });

    console.log(`📡 API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorBody: unknown = null;
      if (contentType && contentType.includes('application/json')) {
        errorBody = await response.json();
      } else {
        errorBody = await response.text();
      }

      // Log 404s as warnings (expected when endpoints don't exist yet)
      // Log other errors as errors
      if (response.status === 404) {
        console.warn(`⚠️ API Endpoint Not Found (404): ${path}`);
        // Only log error body if it's not HTML (HTML 404 pages are noisy)
        if (typeof errorBody === 'string' && !errorBody.includes('<!DOCTYPE')) {
          console.warn(`⚠️ Response:`, errorBody);
        }
      } else {
        console.error(`❌ API Error (${response.status}):`, errorBody);
      }

      // Provide more specific error messages for common status codes
      let errorMessage = 'API request failed';
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Your session may have expired. Please sign in again.';
        console.error(`🔐 Auth issue - Token present: ${!!token}, Token length: ${token?.length || 0}`);
      } else if (response.status === 403) {
        errorMessage = 'Access forbidden. You may not have permission to perform this action.';
      } else if (response.status === 404) {
        errorMessage = 'Resource not found.';
      } else if (response.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).body = errorBody;
      throw error;
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json() as Promise<T>;
  } catch (error: any) {
    // Enhanced error logging for debugging
    // Don't log detailed error info for 404s (they're expected when endpoints don't exist)
    if (error?.status !== 404) {
      console.error(`❌ Fetch Error Details:`, {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        errno: error?.errno,
        type: error?.type,
        url,
        method: rest.method || 'GET',
        hasToken: !!token,
        hasSession: !!session,
      });
    }

    // Handle network errors (fetch failures, timeouts, etc.)
    if (
      error.message === 'Network request failed' || 
      error.name === 'TypeError' || 
      error.message?.includes('fetch') ||
      error.message?.includes('network') ||
      error.code === 'NETWORK_ERROR' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT'
    ) {
      console.error(`❌ Network Error Detected:`, {
        message: error.message,
        name: error.name,
        code: error.code,
        url,
        hasToken: !!token,
        hasSession: !!session,
      });
      
      // Provide more specific error message based on error type
      let userMessage = 'Network request failed. Please check your internet connection and try again.';
      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        userMessage = 'Request timed out. The server may be slow or unreachable. Please try again.';
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('refused')) {
        userMessage = 'Connection refused. The server may be down or unreachable.';
      }
      
      const networkError = new Error(userMessage);
      (networkError as any).status = 0;
      (networkError as any).body = { 
        error: 'Network request failed', 
        message: userMessage,
        originalError: {
          name: error?.name,
          message: error?.message,
          code: error?.code,
        }
      };
      (networkError as any).isNetworkError = true;
      throw networkError;
    }
    
    // Re-throw other errors (HTTP errors, etc.)
    throw error;
  }
}



