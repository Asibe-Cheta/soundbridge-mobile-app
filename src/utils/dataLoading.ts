// src/utils/dataLoading.ts
// Comprehensive data loading utilities for React Native with Supabase

// ========================================
// 1. QUERY TIMEOUT WRAPPER
// ========================================

interface QueryOptions {
  timeout?: number; // milliseconds
  fallback?: any;
  retries?: number;
  retryDelay?: number;
}

/**
 * Wraps any Supabase query with timeout and retry logic
 * Usage: await withQueryTimeout(supabase.from('table').select(), { timeout: 5000 })
 */
export async function withQueryTimeout<T>(
  queryPromise: Promise<{ data: T | null; error: any }>,
  options: QueryOptions = {}
): Promise<{ data: T | null; error: any; timedOut?: boolean }> {
  const {
    timeout = 8000, // 8 seconds default
    fallback = null,
    retries = 1,
    retryDelay = 1000,
  } = options;

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Query timeout after ${timeout}ms`)),
          timeout
        )
      );

      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      // If we got a result, return it
      if ('data' in result || 'error' in result) {
        return result as { data: T | null; error: any };
      }
    } catch (error: any) {
      lastError = error;
      console.warn(`Query attempt ${attempt + 1} failed:`, error.message);
      
      // If not the last retry, wait before retrying
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  // All retries failed
  return {
    data: fallback,
    error: lastError,
    timedOut: true,
  };
}

// ========================================
// 2. PARALLEL LOADING WITH INDIVIDUAL TIMEOUTS
// ========================================

interface ParallelQueryConfig<T> {
  query: () => Promise<{ data: T | null; error: any }>;
  timeout?: number;
  fallback?: T;
  name: string; // For logging
}

/**
 * Loads multiple queries in parallel with individual timeouts
 * Unlike Promise.all(), one hanging query doesn't block others
 */
export async function loadQueriesInParallel<T extends Record<string, any>>(
  queries: Record<string, ParallelQueryConfig<any>>
): Promise<T> {
  const queryEntries = Object.entries(queries);
  
  const results = await Promise.allSettled(
    queryEntries.map(async ([key, { query, timeout, fallback, name }]) => {
      try {
        const result = await withQueryTimeout(query(), {
          timeout,
          fallback,
          retries: 1,
        });
        
        if (result.timedOut) {
          console.warn(`[${name}] Query timed out, using fallback`);
        }
        
        if (result.error && !result.timedOut) {
          console.error(`[${name}] Query error:`, result.error);
        }
        
        return { key, name, data: result.data ?? fallback, error: result.error };
      } catch (error) {
        console.error(`[${name}] Unexpected error:`, error);
        return { key, name, data: fallback, error };
      }
    })
  );

  // Convert array of results to object keyed by name
  const dataObject: any = {};
  results.forEach((result, index) => {
    const { key } = queryEntries[index][1];
    const finalKey = key || queryEntries[index][0];
    
    if (result.status === 'fulfilled') {
      dataObject[finalKey] = result.value.data;
    } else {
      dataObject[finalKey] = queryEntries[index][1].fallback;
    }
  });

  return dataObject as T;
}

// ========================================
// 3. SESSION VALIDATION
// ========================================

/**
 * Validates that the session is ready before making queries
 * Prevents the race condition on first load
 */
export async function waitForValidSession(
  supabase: any,
  maxWait: number = 5000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Session check error:', error);
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      if (session && session.access_token) {
        // Verify token isn't expired
        const exp = session.expires_at ? session.expires_at * 1000 : 0;
        const now = Date.now();
        
        if (exp > now) {
          console.log('✅ Valid session confirmed');
          return true;
        }
        
        console.log('Session expired, waiting for refresh...');
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error checking session:', error);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.warn('Session validation timed out');
  return false;
}

// ========================================
// 4. REQUEST CANCELLATION
// ========================================

export class CancellableQuery {
  private cancelled = false;

  cancel() {
    this.cancelled = true;
  }

  async execute<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    options: QueryOptions = {}
  ): Promise<{ data: T | null; error: any; cancelled?: boolean }> {
    if (this.cancelled) {
      return { data: null, error: new Error('Query cancelled'), cancelled: true };
    }

    const result = await withQueryTimeout(queryFn(), options);

    if (this.cancelled) {
      return { data: null, error: new Error('Query cancelled'), cancelled: true };
    }

    return result;
  }
}

// ========================================
// 5. LOADING STATE MANAGER
// ========================================

export class LoadingStateManager {
  private states: Map<string, boolean> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private callbacks: Set<() => void> = new Set();

  setLoading(key: string, isLoading: boolean, autoTimeout: number = 10000) {
    this.states.set(key, isLoading);
    this.notifyChange();

    // Clear existing timeout
    const existingTimeout = this.timeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set auto-timeout to prevent infinite loading
    if (isLoading && autoTimeout > 0) {
      const timeout = setTimeout(() => {
        console.warn(`[${key}] Loading state timed out after ${autoTimeout}ms`);
        this.setLoading(key, false, 0);
      }, autoTimeout);
      this.timeouts.set(key, timeout);
    }
  }

  isLoading(key: string): boolean {
    return this.states.get(key) ?? false;
  }

  isAnyLoading(): boolean {
    return Array.from(this.states.values()).some(loading => loading);
  }

  reset() {
    // Clear all timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
    this.states.clear();
    this.notifyChange();
  }

  onChange(callback: () => void) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notifyChange() {
    this.callbacks.forEach(cb => cb());
  }
}

