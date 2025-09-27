import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Linking } from 'react-native';
import type { User, Session } from '@supabase/supabase-js';
import { authService } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ success: boolean; error?: any }>;
  signOut: () => Promise<{ success: boolean; error?: any }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: any }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: any }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: any }>;
  resendConfirmation: (email: string) => Promise<{ success: boolean; error?: any }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');
        const { success, session } = await authService.getSession();
        console.log('Initial session result:', { success, session: !!session });
        
        if (success && session) {
          setSession(session);
          setUser(session.user);
        }
      } catch (err) {
        console.error('Error getting initial session:', err);
        setError('Failed to get initial session');
      } finally {
        // Always set loading to false after a reasonable timeout
        console.log('Setting loading to false');
        setLoading(false);
      }
    };

    // Set a timeout to ensure loading doesn't stay true forever
    timeoutId = setTimeout(() => {
      console.log('Auth loading timeout - forcing loading to false');
      setLoading(false);
    }, 5000); // 5 second timeout

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Clear timeout when auth state changes
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        setLoading(false);
      }
    );

        // Handle deep linking for auth callbacks
        const handleDeepLink = (url: string) => {
          console.log('Deep link received:', url);
          
          // Handle both custom scheme and Expo development URLs
          if (url.includes('soundbridge://auth/callback') || url.includes('exp://') && url.includes('/auth/callback')) {
            console.log('Auth callback received via deep link');
            
            // Extract parameters from URL
            let urlParams: URLSearchParams;
            if (url.includes('?')) {
              urlParams = new URLSearchParams(url.split('?')[1]);
            } else {
              urlParams = new URLSearchParams();
            }
            
            const verified = urlParams.get('verified');
            const next = urlParams.get('next');
            
            if (verified === 'true') {
              console.log('Email verification completed via deep link');
              // The user is already verified, we can proceed
              setLoading(false);
              
              // If there's a next parameter, we could handle navigation here
              if (next) {
                console.log('Next destination:', next);
              }
            } else {
              // Handle regular auth callback - Supabase will automatically process this
              console.log('Regular auth callback processing');
            }
          }
        };

    // Listen for deep links
    const linkingListener = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Check for initial deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
      linkingListener?.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { success, error } = await authService.signIn(email, password);
      
      if (!success) {
        setError(error?.message || 'Sign in failed');
        setLoading(false);
        return { success: false, error };
      }
      
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: err };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const { success, error } = await authService.signUp(email, password, metadata);
      
      if (!success) {
        setError(error?.message || 'Sign up failed');
        setLoading(false);
        return { success: false, error };
      }
      
      // Set loading to false on successful sign up
      setLoading(false);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: err };
    }
  };

  const signOut = async () => {
    setLoading(true);
    
    try {
      const { success, error } = await authService.signOut();
      
      if (!success) {
        setError(error?.message || 'Sign out failed');
        setLoading(false);
        return { success: false, error };
      }
      
      setUser(null);
      setSession(null);
      setLoading(false);
      
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: err };
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { success, error } = await authService.signInWithProvider('google');
      
      if (!success) {
        setError(error?.message || 'Google sign in failed');
        setLoading(false);
        return { success: false, error };
      }
      
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google sign in failed';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: err };
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { success, error } = await authService.resetPassword(email);
      
      if (!success) {
        setError(error?.message || 'Password reset failed');
        setLoading(false);
        return { success: false, error };
      }
      
      setLoading(false);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Password reset failed';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: err };
    }
  };

  const updatePassword = async (newPassword: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { success, error } = await authService.updatePassword(newPassword);
      
      if (!success) {
        setError(error?.message || 'Password update failed');
        setLoading(false);
        return { success: false, error };
      }
      
      setLoading(false);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Password update failed';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: err };
    }
  };

  const resendConfirmation = async (email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { success, error } = await authService.resendConfirmation(email);
      
      if (!success) {
        setError(error?.message || 'Failed to resend confirmation');
        setLoading(false);
        return { success: false, error };
      }
      
      setLoading(false);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend confirmation';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: err };
    }
  };

  const refreshUser = async () => {
    try {
      const { success, session } = await authService.getSession();
      if (success && session) {
        setSession(session);
        setUser(session.user);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    resendConfirmation,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
