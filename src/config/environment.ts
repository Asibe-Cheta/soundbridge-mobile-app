import Constants from 'expo-constants';

type Environment = 'development' | 'staging' | 'production';

interface EnvironmentConfig {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  sentryDsn: string;
  analyticsEnabled: boolean;
  debugMode: boolean;
  revenueCatApiKey: string;
  revenueCatAndroidApiKey: string;
  googlePlacesApiKey: string;
  bypassRevenueCat?: boolean;
  developmentTier?: 'free' | 'premium' | 'unlimited';
  useProfileTier?: boolean; // Use subscription_tier from user profile instead of hardcoded tier
}

const configs: Record<Environment, EnvironmentConfig> = {
  development: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://aunxdbqukbxyyiusaeqi.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTY5OTAsImV4cCI6MjA5MDE1Njk5MH0.8g7dbtWArz_P8pLuo3hykvT2OicG9-hhJSXYf1GPEi4',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
    revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || 'appl_QQannJQTfGORGekvyojIgJoyTlt',
    revenueCatAndroidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '',
    googlePlacesApiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '',
    // Bypass RevenueCat in Expo Go (native IAP not available)
    // Set to false when testing with a development build
    bypassRevenueCat: true,
    // When bypassRevenueCat is true, use database tier from user profile
    // NOTE: Database may be out of sync if Stripe webhook was disabled
    // Set useProfileTier to false and developmentTier to override
    useProfileTier: false, // Set to false to use developmentTier instead
    developmentTier: 'premium', // Waitlist 3-month premium grant confirmed active on this account
    analyticsEnabled: false,
    debugMode: true,
  },
  staging: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://www.soundbridge.live/api',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://aunxdbqukbxyyiusaeqi.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTY5OTAsImV4cCI6MjA5MDE1Njk5MH0.8g7dbtWArz_P8pLuo3hykvT2OicG9-hhJSXYf1GPEi4',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
    revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || 'appl_QQannJQTfGORGekvyojIgJoyTlt',
    revenueCatAndroidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '',
    googlePlacesApiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '',
    analyticsEnabled: true,
    debugMode: true,
  },
  production: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://www.soundbridge.live/api',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://aunxdbqukbxyyiusaeqi.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTY5OTAsImV4cCI6MjA5MDE1Njk5MH0.8g7dbtWArz_P8pLuo3hykvT2OicG9-hhJSXYf1GPEi4',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
    revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || 'appl_QQannJQTfGORGekvyojIgJoyTlt',
    revenueCatAndroidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '',
    googlePlacesApiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '',
    // ✅ CRITICAL: Production MUST use real RevenueCat
    bypassRevenueCat: false,
    // developmentTier is not used in production
    analyticsEnabled: true,
    debugMode: false,
  },
};

const getEnvironment = (): Environment => {
  const releaseChannel = Constants.expoConfig?.extra?.releaseChannel;
  
  if (__DEV__) return 'development';
  if (releaseChannel === 'staging') return 'staging';
  return 'production';
};

export const ENV = getEnvironment();
export const config = configs[ENV];

