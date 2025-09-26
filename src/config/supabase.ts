// Supabase Configuration for Mobile App
// Replace these with your actual Supabase credentials

export const SUPABASE_CONFIG = {
  // Your Supabase project URL - replace with your actual URL
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://aunxdbqukbxyyiusaeqi.supabase.co',
  
  // Your Supabase anon key - replace with your actual key
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTA2MTUsImV4cCI6MjA2ODI2NjYxNX0.IP-c4_S7Fkbq6F2UkgzL-TibkoBN49yQ1Cqz4CkMzB0',
};

// Validation
if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url.includes('your-project')) {
  console.warn('⚠️ Supabase URL not configured. Please update src/config/supabase.ts with your actual Supabase URL');
}

if (!SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.anonKey.includes('your-anon-key')) {
  console.warn('⚠️ Supabase anon key not configured. Please update src/config/supabase.ts with your actual anon key');
}

// Log successful configuration
console.log('✅ Supabase configuration loaded successfully');
