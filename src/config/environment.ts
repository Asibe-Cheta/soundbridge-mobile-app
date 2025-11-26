import Constants from 'expo-constants';

type Environment = 'development' | 'staging' | 'production';

interface EnvironmentConfig {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  sentryDsn: string;
  analyticsEnabled: boolean;
  debugMode: boolean;
}

const configs: Record<Environment, EnvironmentConfig> = {
  development: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://aunxdbqukbxyyiusaeqi.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTA2MTUsImV4cCI6MjA2ODI2NjYxNX0.IP-c4_S7Fkbq6F2UkgzL-TibkoBN49yQ1Cqz4CkMzB0',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
    analyticsEnabled: false,
    debugMode: true,
  },
  staging: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://soundbridge.live/api',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://aunxdbqukbxyyiusaeqi.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTA2MTUsImV4cCI6MjA2ODI2NjYxNX0.IP-c4_S7Fkbq6F2UkgzL-TibkoBN49yQ1Cqz4CkMzB0',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
    analyticsEnabled: true,
    debugMode: true,
  },
  production: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://soundbridge.live/api',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://aunxdbqukbxyyiusaeqi.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTA2MTUsImV4cCI6MjA2ODI2NjYxNX0.IP-c4_S7Fkbq6F2UkgzL-TibkoBN49yQ1Cqz4CkMzB0',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
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

