/**
 * Wise API Configuration
 *
 * This module provides type-safe access to Wise API configuration.
 * Environment variables are validated on import to ensure all required
 * values are set before the app attempts to make API calls.
 *
 * @module lib/wise/config
 */

/**
 * Wise API environment type
 */
export type WiseEnvironment = 'live' | 'sandbox';

/**
 * Wise API configuration interface
 */
export interface WiseConfig {
  /** Wise API authentication token */
  apiToken: string;
  /** Wise environment (live or sandbox) */
  environment: WiseEnvironment;
  /** Wise API base URL */
  apiUrl: string;
  /** Webhook secret for verifying Wise webhook signatures */
  webhookSecret: string;
  /** Wise business profile ID */
  profileId: string;
}

/**
 * Get environment variable with validation
 * @throws {Error} if environment variable is not set
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please add ${key} to your .env.local file.\n` +
      `See .env.example for reference.`
    );
  }

  return value;
}

/**
 * Validate Wise environment value
 * @throws {Error} if environment is not 'live' or 'sandbox'
 */
function validateEnvironment(env: string): WiseEnvironment {
  if (env !== 'live' && env !== 'sandbox') {
    throw new Error(
      `Invalid WISE_ENVIRONMENT: "${env}"\n` +
      `Must be either "live" or "sandbox".\n` +
      `Current value: ${env}`
    );
  }
  return env as WiseEnvironment;
}

/**
 * Validate API URL matches environment
 * @throws {Error} if URL doesn't match environment
 */
function validateApiUrl(url: string, environment: WiseEnvironment): void {
  const expectedUrls = {
    live: 'https://api.wise.com',
    sandbox: 'https://api.sandbox.transferwise.tech',
  };

  const expectedUrl = expectedUrls[environment];

  if (url !== expectedUrl) {
    console.warn(
      `⚠️  WARNING: WISE_API_URL doesn't match WISE_ENVIRONMENT\n` +
      `   Environment: ${environment}\n` +
      `   Expected URL: ${expectedUrl}\n` +
      `   Actual URL: ${url}\n` +
      `   This may cause API requests to fail.`
    );
  }
}

/**
 * Validate webhook secret length and format
 * @throws {Error} if webhook secret is too short
 */
function validateWebhookSecret(secret: string): void {
  if (secret.length < 32) {
    throw new Error(
      `WISE_WEBHOOK_SECRET is too short (${secret.length} characters).\n` +
      `Minimum length: 32 characters for security.\n` +
      `Generate a secure secret with:\n` +
      `  openssl rand -hex 32\n` +
      `or:\n` +
      `  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }

  // Warn if using example/placeholder value
  if (secret.includes('your_') || secret.includes('example') || secret === '32_character_webhook_secret_here') {
    console.warn(
      `⚠️  WARNING: WISE_WEBHOOK_SECRET appears to be a placeholder.\n` +
      `   Please generate a real secret for production use.`
    );
  }
}

/**
 * Validate profile ID format
 * @throws {Error} if profile ID is invalid
 */
function validateProfileId(profileId: string): void {
  // Profile ID should be numeric
  if (!/^\d+$/.test(profileId)) {
    throw new Error(
      `Invalid WISE_PROFILE_ID: "${profileId}"\n` +
      `Profile ID should be numeric.\n` +
      `Get your profile ID from: https://wise.com/settings/profiles`
    );
  }
}

/**
 * Load and validate Wise configuration from environment variables
 * @throws {Error} if any required environment variable is missing or invalid
 */
function loadWiseConfig(): WiseConfig {
  // Load environment variables
  const apiToken = getRequiredEnv('WISE_API_TOKEN');
  const environmentStr = getRequiredEnv('WISE_ENVIRONMENT');
  const apiUrl = getRequiredEnv('WISE_API_URL');
  const webhookSecret = getRequiredEnv('WISE_WEBHOOK_SECRET');
  const profileId = getRequiredEnv('WISE_PROFILE_ID');

  // Validate environment
  const environment = validateEnvironment(environmentStr);

  // Validate API URL matches environment
  validateApiUrl(apiUrl, environment);

  // Validate webhook secret
  validateWebhookSecret(webhookSecret);

  // Validate profile ID
  validateProfileId(profileId);

  // Warn if using placeholder API token
  if (apiToken.includes('your_') || apiToken.includes('example')) {
    console.warn(
      `⚠️  WARNING: WISE_API_TOKEN appears to be a placeholder.\n` +
      `   Get your actual token from: https://wise.com/settings/api-tokens`
    );
  }

  // Log configuration (without sensitive values) in development
  if (__DEV__) {
    console.log('💳 Wise API Configuration Loaded:', {
      environment,
      apiUrl,
      profileId,
      apiTokenSet: !!apiToken,
      webhookSecretSet: !!webhookSecret,
    });
  }

  return {
    apiToken,
    environment,
    apiUrl,
    webhookSecret,
    profileId,
  };
}

/**
 * Wise API configuration singleton
 *
 * This is loaded once on app initialization and validated.
 * All Wise API calls should use this configuration object.
 *
 * @example
 * ```typescript
 * import { wiseConfig } from '@/lib/wise/config';
 *
 * const response = await fetch(`${wiseConfig.apiUrl}/v1/profiles`, {
 *   headers: {
 *     'Authorization': `Bearer ${wiseConfig.apiToken}`,
 *   },
 * });
 * ```
 */
export const wiseConfig: WiseConfig = loadWiseConfig();

/**
 * Check if Wise is configured and ready to use
 * @returns true if all Wise environment variables are set
 */
export function isWiseConfigured(): boolean {
  try {
    loadWiseConfig();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get Wise API headers for authenticated requests
 * @returns Headers object with Authorization and common headers
 */
export function getWiseHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${wiseConfig.apiToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

/**
 * Get Wise API endpoint URL
 * @param path - API endpoint path (e.g., '/v1/profiles')
 * @returns Full URL to the endpoint
 */
export function getWiseEndpoint(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${wiseConfig.apiUrl}/${cleanPath}`;
}

/**
 * Helper function to determine if we're in production mode
 * @returns true if WISE_ENVIRONMENT is 'live'
 */
export function isWiseProduction(): boolean {
  return wiseConfig.environment === 'live';
}

/**
 * Helper function to determine if we're in sandbox mode
 * @returns true if WISE_ENVIRONMENT is 'sandbox'
 */
export function isWiseSandbox(): boolean {
  return wiseConfig.environment === 'sandbox';
}

// Log warning if in production mode
if (isWiseProduction() && __DEV__) {
  console.warn(
    `⚠️  WARNING: Wise is configured in PRODUCTION (live) mode!\n` +
    `   All transfers will be REAL and IRREVERSIBLE.\n` +
    `   Make sure you intend to use production credentials.`
  );
}

// Export individual config values for convenience
export const {
  apiToken: WISE_API_TOKEN,
  environment: WISE_ENVIRONMENT,
  apiUrl: WISE_API_URL,
  webhookSecret: WISE_WEBHOOK_SECRET,
  profileId: WISE_PROFILE_ID,
} = wiseConfig;
