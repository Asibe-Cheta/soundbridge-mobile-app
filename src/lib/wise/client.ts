/**
 * Wise API Client
 *
 * Base HTTP client for making authenticated requests to the Wise API.
 * Handles authentication, headers, error parsing, and response validation.
 *
 * @module lib/wise/client
 */

import { wiseConfig, getWiseHeaders, getWiseEndpoint } from './config';
import type { WiseErrorResponse } from './types';

/**
 * Custom error class for Wise API errors
 */
export class WiseAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WiseAPIError';
  }
}

/**
 * Wise API Client Class
 *
 * Provides authenticated HTTP methods for interacting with Wise API.
 *
 * @example
 * ```typescript
 * const client = new WiseClient();
 * const profiles = await client.get('/v1/profiles');
 * ```
 */
export class WiseClient {
  private apiToken: string;
  private apiUrl: string;
  private profileId: string;

  constructor() {
    this.apiToken = wiseConfig.apiToken;
    this.apiUrl = wiseConfig.apiUrl;
    this.profileId = wiseConfig.profileId;
  }

  /**
   * Get default headers for Wise API requests
   */
  private getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    return {
      ...getWiseHeaders(),
      ...additionalHeaders,
    };
  }

  /**
   * Parse error response from Wise API
   */
  private async parseError(response: Response): Promise<never> {
    let errorMessage = `Wise API Error (${response.status})`;
    let errorCode: string | undefined;
    let details: any;

    try {
      const errorData: WiseErrorResponse = await response.json();

      if (errorData.message) {
        errorMessage = errorData.message;
      }

      if (errorData.error) {
        errorCode = errorData.error;
      }

      if (errorData.errors && errorData.errors.length > 0) {
        details = errorData.errors;
        // Use first error message if available
        errorMessage = errorData.errors[0].message || errorMessage;
      }
    } catch (parseError) {
      // If we can't parse error JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }

    throw new WiseAPIError(errorMessage, response.status, errorCode, details);
  }

  /**
   * Make GET request to Wise API
   */
  async get<T>(path: string, queryParams?: Record<string, string>): Promise<T> {
    let url = getWiseEndpoint(path);

    // Add query parameters if provided
    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      await this.parseError(response);
    }

    return response.json();
  }

  /**
   * Make POST request to Wise API
   */
  async post<T>(
    path: string,
    body?: any,
    additionalHeaders?: Record<string, string>
  ): Promise<T> {
    const url = getWiseEndpoint(path);

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(additionalHeaders),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      await this.parseError(response);
    }

    return response.json();
  }

  /**
   * Make PUT request to Wise API
   */
  async put<T>(
    path: string,
    body?: any,
    additionalHeaders?: Record<string, string>
  ): Promise<T> {
    const url = getWiseEndpoint(path);

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(additionalHeaders),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      await this.parseError(response);
    }

    return response.json();
  }

  /**
   * Make DELETE request to Wise API
   */
  async delete<T>(path: string): Promise<T> {
    const url = getWiseEndpoint(path);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      await this.parseError(response);
    }

    // DELETE might return empty response
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  /**
   * Get default profile ID
   */
  getProfileId(): string {
    return this.profileId;
  }

  /**
   * Test API connection
   * @returns true if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get('/v1/profiles');
      return true;
    } catch (error) {
      console.error('Wise API connection test failed:', error);
      return false;
    }
  }

  /**
   * Get all profiles
   */
  async getProfiles() {
    return this.get('/v1/profiles');
  }

  /**
   * Get balances for profile
   */
  async getBalances(profileId?: string) {
    const pid = profileId || this.profileId;
    return this.get(`/v1/profiles/${pid}/balances`);
  }
}

/**
 * Singleton instance of Wise client
 */
export const wiseClient = new WiseClient();
