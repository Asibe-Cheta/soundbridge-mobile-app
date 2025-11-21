import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { CreatorType } from '../types';
import { fetchCreatorTypes } from '../services/creatorExpansionService';

// CRITICAL: Complete the auth session after OAuth redirect
WebBrowser.maybeCompleteAuthSession();

interface UserProfile {
  id: string;
  email: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  role?: 'creator' | 'listener';
  onboarding_completed?: boolean;
  country?: string;
  location?: string;
  created_at: string;
  creator_types?: CreatorType[];
  primary_creator_type?: CreatorType | null;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  needsOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ success: boolean; error?: any; needsEmailVerification?: boolean }>;
  signOut: () => Promise<{ success: boolean; error?: any }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: any }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: any }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: any }>;
  resendConfirmation: (email: string) => Promise<{ success: boolean; error?: any }>;
  refreshUser: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: any }>;
  completeOnboarding: () => Promise<{ success: boolean; error?: any }>;
  checkOnboardingStatus: () => Promise<{ needsOnboarding: boolean; profile?: any; onboarding?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session result:', { session: !!session, error });
        
        if (session && !error) {
          setSession(session);
          setUser(session.user);
          await loadUserProfile(session.user.id);
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
    const { data: { subscription }} = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUserProfile(null);
          setNeedsOnboarding(false);
        }
        
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

  // Helper function to map error messages to user-friendly text
  const mapAuthError = (errorMessage: string): string => {
    const errorMap: Record<string, string> = {
      'Email not confirmed': 'Please verify your email before signing in',
      'Invalid login credentials': 'Invalid email or password',
      'User already registered': 'An account with this email already exists',
      'Authentication required': 'Please sign in to continue',
      'Password should be at least 6 characters': 'Password must be at least 6 characters long',
      'invalid request: both auth code and code verifier should be non-empty': 'OAuth session expired. Please try again',
    };

    for (const [key, value] of Object.entries(errorMap)) {
      if (errorMessage.includes(key)) {
        return value;
      }
    }
    return errorMessage;
  };

  // Check onboarding status using web API with Bearer token
  const checkOnboardingStatus = async (): Promise<{ needsOnboarding: boolean; profile?: any; onboarding?: any }> => {
    try {
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !currentSession) {
        console.error('❌ No active session for onboarding check');
        return { needsOnboarding: true };
      }

      console.log('🔍 Checking onboarding status via API...');
      const response = await fetch('https://www.soundbridge.live/api/user/onboarding-status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      if (!response.ok) {
        console.error('❌ Onboarding status check failed:', response.status);
        // Fallback to checking profile directly
        if (userProfile) {
          return { needsOnboarding: !userProfile.onboarding_completed };
        }
        return { needsOnboarding: true };
      }

      const data = await response.json();
      console.log('✅ Onboarding status:', data);
      
      return {
        needsOnboarding: data.needsOnboarding || false,
        profile: data.profile,
        onboarding: data.onboarding,
      };
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      // Fallback to local check
      if (userProfile) {
        return { needsOnboarding: !userProfile.onboarding_completed };
      }
      return { needsOnboarding: true };
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔐 Attempting login for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        const friendlyError = mapAuthError(error.message);
        console.error('❌ Login error:', friendlyError);
        setError(friendlyError);
        setLoading(false);
        
        // Check for specific error cases
        if (error.message.includes('Email not confirmed')) {
          return { 
            success: false, 
            error: { message: friendlyError, needsEmailVerification: true } 
          };
        }
        
        return { success: false, error: { message: friendlyError } };
      }

      if (data.session && data.user) {
        console.log('✅ Login successful:', data.user.id);
        console.log('🔑 Access token obtained');
        
        // Auth state change listener will handle the rest
        // But we can check onboarding status here for immediate feedback
        setLoading(false);
        return { success: true };
      }
      
      setLoading(false);
      return { success: false, error: { message: 'Unknown login error' } };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      const friendlyError = mapAuthError(errorMessage);
      console.error('❌ Unexpected login error:', friendlyError);
      setError(friendlyError);
      setLoading(false);
      return { success: false, error: { message: friendlyError } };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📝 Starting registration for:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      
      if (error) {
        const friendlyError = mapAuthError(error.message);
        console.error('❌ Registration error:', friendlyError);
        setError(friendlyError);
        setLoading(false);
        return { success: false, error: { message: friendlyError } };
      }

      if (data.user) {
        console.log('✅ Registration successful:', data.user.id);
        const needsEmailVerification = !data.session;
        
        if (needsEmailVerification) {
          console.log('📧 Confirmation email sent to:', email);
        }
        
        setLoading(false);
        return {
          success: true,
          needsEmailVerification,
        };
      }
      
      setLoading(false);
      return { success: false, error: { message: 'Unknown error during registration' } };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      const friendlyError = mapAuthError(errorMessage);
      console.error('❌ Unexpected registration error:', friendlyError);
      setError(friendlyError);
      setLoading(false);
      return { success: false, error: { message: friendlyError } };
    }
  };

  const signOut = async () => {
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        setError(error.message || 'Sign out failed');
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
      console.log('🔐 Starting Google OAuth flow');
      
      // Create redirect URL for the app (using app scheme from app.json)
      const redirectTo = 'soundbridge://auth/callback';
      console.log('📍 Redirect URL:', redirectTo);
      
      // Initiate OAuth with Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });
      
      if (error) {
        const friendlyError = mapAuthError(error.message);
        console.error('❌ OAuth error:', friendlyError);
        setError(friendlyError);
        setLoading(false);
        return { success: false, error: { message: friendlyError } };
      }

      if (data.url) {
        console.log('🌐 Opening OAuth URL');
        
        // Open browser for OAuth
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo
        );

        console.log('📱 Browser result:', result.type);

        if (result.type === 'success') {
          // Extract tokens from URL
          const { url } = result;
          const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
          
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          
          if (access_token && refresh_token) {
            console.log('🔑 Tokens extracted, setting session...');
            // Set session in Supabase client
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (sessionError) {
              const friendlyError = mapAuthError(sessionError.message);
              console.error('❌ Session error:', friendlyError);
              setError(friendlyError);
              setLoading(false);
              return { success: false, error: { message: friendlyError } };
            }

            console.log('✅ Google OAuth successful');
            setLoading(false);
            return { success: true };
          }
        }

        setLoading(false);
        return { success: false, error: { message: 'OAuth was cancelled or failed' } };
      }

      setLoading(false);
      return { success: false, error: { message: 'No OAuth URL received' } };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google sign in failed';
      const friendlyError = mapAuthError(errorMessage);
      console.error('❌ Unexpected OAuth error:', friendlyError);
      setError(friendlyError);
      setLoading(false);
      return { success: false, error: { message: friendlyError } };
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📧 Requesting password reset for:', email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://www.soundbridge.live/update-password',
      });
      
      if (error) {
        const friendlyError = mapAuthError(error.message);
        console.error('❌ Password reset request error:', friendlyError);
        setError(friendlyError);
        setLoading(false);
        return { success: false, error: { message: friendlyError } };
      }
      
      console.log('✅ Password reset email sent');
      setLoading(false);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Password reset failed';
      const friendlyError = mapAuthError(errorMessage);
      console.error('❌ Unexpected error:', friendlyError);
      setError(friendlyError);
      setLoading(false);
      return { success: false, error: { message: friendlyError } };
    }
  };

  const updatePassword = async (newPassword: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) {
        setError(error.message || 'Password update failed');
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
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      
      if (error) {
        setError(error.message || 'Failed to resend confirmation');
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

  // Load user profile from database
  const loadUserProfile = async (userId: string, activeSession: Session | null = session) => {
    try {
      console.log('🔍 Loading user profile for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('❌ Error loading user profile:', error);
        // If profile doesn't exist, user needs onboarding
        setNeedsOnboarding(true);
        return;
      }
      
      if (data) {
        let creatorTypes: CreatorType[] = [];
        try {
          if (activeSession) {
            creatorTypes = await fetchCreatorTypes(userId, { session: activeSession });
          } else {
            const { data: { session: latestSession } } = await supabase.auth.getSession();
            if (latestSession) {
              creatorTypes = await fetchCreatorTypes(userId, { session: latestSession });
            }
          }
        } catch (creatorTypeError) {
          console.warn('⚠️ Unable to load creator types:', creatorTypeError);
        }

        console.log('✅ User profile loaded:', data);
        setUserProfile({
          ...data,
          creator_types: creatorTypes,
          primary_creator_type: creatorTypes[0] ?? null,
        });
        // Check if user needs onboarding
        const needsOnboarding = !data.onboarding_completed;
        setNeedsOnboarding(needsOnboarding);
        console.log('🎯 User needs onboarding:', needsOnboarding);
      }
    } catch (err) {
      console.error('❌ Error loading user profile:', err);
      setNeedsOnboarding(true);
    }
  };

  const refreshUser = async () => {
    try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (currentSession && !error) {
          setSession(currentSession);
          setUser(currentSession.user);
          await loadUserProfile(currentSession.user.id, currentSession);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user?.id) {
        return { success: false, error: 'No user logged in' };
      }
      
      console.log('💾 Updating user profile:', updates);
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error updating user profile:', error);
        return { success: false, error };
      }
      
      if (data) {
        console.log('✅ User profile updated:', data);
        setUserProfile(data);
        // Update onboarding status if needed
        if (updates.onboarding_completed !== undefined) {
          setNeedsOnboarding(!updates.onboarding_completed);
        }
      }
      
      return { success: true };
    } catch (err) {
      console.error('❌ Error updating user profile:', err);
      return { success: false, error: err };
    }
  };

  const completeOnboarding = async () => {
    try {
      console.log('🎉 Completing onboarding for user:', user?.id);
      const result = await updateUserProfile({ onboarding_completed: true });
      
      if (result.success) {
        console.log('✅ Onboarding completed successfully');
        setNeedsOnboarding(false);
      }
      
      return result;
    } catch (err) {
      console.error('❌ Error completing onboarding:', err);
      return { success: false, error: err };
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    session,
    loading,
    error,
    needsOnboarding,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    resendConfirmation,
    refreshUser,
    updateUserProfile,
    completeOnboarding,
    checkOnboardingStatus,
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
