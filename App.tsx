import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useTheme } from './src/contexts/ThemeContext';
import GlassmorphicTabBar from './src/components/GlassmorphicTabBar';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import UploadScreen from './src/screens/UploadScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ChatScreen from './src/screens/ChatScreen';
import LiveSessionsScreen from './src/screens/LiveSessionsScreen';
import LiveSessionRoomScreen from './src/screens/LiveSessionRoomScreen';
import CreateLiveSessionScreen from './src/screens/CreateLiveSessionScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AudioPlayerScreen from './src/screens/AudioPlayerScreen';
import CreatorProfileScreen from './src/screens/CreatorProfileScreen';
import CreatorSetupScreen from './src/screens/CreatorSetupScreen';
import PrivacySecurityScreen from './src/screens/PrivacySecurityScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import NotificationPreferencesScreen from './src/screens/NotificationPreferencesScreen';
import NotificationInboxScreen from './src/screens/NotificationInboxScreen';
import ThemeSettingsScreen from './src/screens/ThemeSettingsScreen';
import HelpSupportScreen from './src/screens/HelpSupportScreen';
import AboutScreen from './src/screens/AboutScreen';
import TermsOfServiceScreen from './src/screens/TermsOfServiceScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import PaymentMethodsScreen from './src/screens/PaymentMethodsScreen';
import UpgradeScreen from './src/screens/UpgradeScreen';
import BillingScreen from './src/screens/BillingScreen';
import WalletScreen from './src/screens/WalletScreen';
import TransactionHistoryScreen from './src/screens/TransactionHistoryScreen';
import WithdrawalScreen from './src/screens/WithdrawalScreen';
import WithdrawalMethodsScreen from './src/screens/WithdrawalMethodsScreen';
import AddWithdrawalMethodScreen from './src/screens/AddWithdrawalMethodScreen';
import AllCreatorsScreen from './src/screens/AllCreatorsScreen';
import AllEventsScreen from './src/screens/AllEventsScreen';
import EventDetailsScreen from './src/screens/EventDetailsScreen';
import TrackDetailsScreen from './src/screens/TrackDetailsScreen';
import PlaylistDetailsScreen from './src/screens/PlaylistDetailsScreen';
import OfflineDownloadScreen from './src/screens/OfflineDownloadScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AvailabilityCalendarScreen from './src/screens/AvailabilityCalendarScreen';
import CollaborationRequestsScreen from './src/screens/CollaborationRequestsScreen';
import ServiceProviderOnboardingScreen from './src/screens/ServiceProviderOnboardingScreen';
import ServiceProviderDashboardScreen from './src/screens/ServiceProviderDashboardScreen';
import AudioEnhancementExpoScreen from './src/screens/AudioEnhancementScreen.expo';
import TwoFactorVerificationScreen from './src/screens/TwoFactorVerificationScreen';
import TwoFactorSetupScreen from './src/screens/TwoFactorSetupScreen';
import TwoFactorSettingsScreen from './src/screens/TwoFactorSettingsScreen';

// Import contexts
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AudioPlayerProvider } from './src/contexts/AudioPlayerContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { CollaborationProvider } from './src/contexts/CollaborationContext';

// Import components
import MiniPlayer from './src/components/MiniPlayer';
import SoundBridgeErrorBoundary from './src/components/SoundBridgeErrorBoundary';
import CreateEventScreen from './src/screens/CreateEventScreen';
import CreatePlaylistScreen from './src/screens/CreatePlaylistScreen';

// Import services
import { notificationService } from './src/services/NotificationService';
import * as Linking from 'expo-linking';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main Tab Navigator
function MainTabs() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      tabBar={(props) => (
        <View style={{ paddingBottom: insets.bottom }}>
          <GlassmorphicTabBar {...props} />
        </View>
      )}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Discover') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Upload') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen 
        name="Upload" 
        component={UploadScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'add-circle' : 'add-circle-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen name="Messages" component={MessagesScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    );
  }

// Main App Navigator
function AppNavigator() {
  const { user, loading, needsOnboarding } = useAuth();
  const { theme } = useTheme();
  const navigationRef = React.useRef<any>(null);

  // Initialize services
  React.useEffect(() => {
    console.log('🔧 Initializing services...');
    if (user) {
      // Initialize notification service
      notificationService.initialize().then(success => {
        if (success) {
          console.log('✅ Notification service ready');
        }
      });
    }

    // Initialize deep linking
    const handleDeepLink = async (event: { url: string }) => {
      const { path, queryParams } = Linking.parse(event.url);
      console.log('🔗 Deep link received:', path, queryParams);
      
      if (path && navigationRef.current) {
        handleDeepLinkNavigation(path, queryParams);
      }
    };

    // Listen for URL events
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL
    Linking.getInitialURL().then(url => {
      if (url) {
        const { path, queryParams } = Linking.parse(url);
        if (path && navigationRef.current) {
          handleDeepLinkNavigation(path, queryParams);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  // Handle deep link navigation
  const handleDeepLinkNavigation = (path: string, params: any) => {
    if (!navigationRef.current) return;

    // Parse the path and navigate accordingly
    const segments = path.split('/');
    const firstSegment = segments[0];

    switch (firstSegment) {
      case 'event':
        if (segments[1]) {
          navigationRef.current.navigate('EventDetails', { eventId: segments[1] });
        }
        break;
      case 'track':
        if (segments[1]) {
          navigationRef.current.navigate('TrackDetails', { trackId: segments[1] });
        }
        break;
      case 'creator':
        if (segments[1]) {
          navigationRef.current.navigate('CreatorProfile', { creatorId: segments[1] });
        }
        break;
      case 'messages':
        if (segments[1]) {
          navigationRef.current.navigate('Messages', { conversationId: segments[1] });
        } else {
          navigationRef.current.navigate('Messages');
        }
        break;
      case 'wallet':
        navigationRef.current.navigate('Wallet');
        break;
      case 'collaboration':
        if (segments[1]) {
          navigationRef.current.navigate('CollaborationRequests', { requestId: segments[1] });
        }
        break;
      default:
        console.log('Unknown deep link path:', path);
    }
  };

  // Handle navigation ready
  const onNavigationReady = React.useCallback(() => {
    console.log('✅ Navigation ready');
    // Check for pending deep links from notifications
    notificationService.getPendingDeepLink().then(data => {
      if (data && data.deepLink && navigationRef.current) {
        const { path, queryParams } = Linking.parse(data.deepLink);
        if (path) {
          handleDeepLinkNavigation(path, queryParams);
        }
      }
    });
  }, []);

  // No splash screen blocking - navigation works immediately

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <NavigationContainer 
        ref={navigationRef} 
        onReady={onNavigationReady}
        theme={{
          dark: theme.isDark,
          colors: {
            primary: theme.colors.primary,
            background: 'transparent',
            card: 'transparent',
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.primary,
          },
        }}
      >
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            animation: 'fade', // Smooth transition
          }}
        >
        {!user ? (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen 
              name="TwoFactorVerification" 
              component={TwoFactorVerificationScreen}
              options={{
                // Prevent back navigation to this screen (Claude's solution)
                gestureEnabled: false,
              }}
            />
          </>
        ) : needsOnboarding ? (
          // Show onboarding for users who haven't completed it
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="AudioPlayer" component={AudioPlayerScreen} />
            <Stack.Screen name="CreatorSetup" component={CreatorSetupScreen} />
            <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
            <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
            <Stack.Screen name="NotificationInbox" component={NotificationInboxScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="LiveSessions" component={LiveSessionsScreen} />
            <Stack.Screen name="LiveSessionRoom" component={LiveSessionRoomScreen} />
            <Stack.Screen name="CreateLiveSession" component={CreateLiveSessionScreen} />
            <Stack.Screen name="TwoFactorVerification" component={TwoFactorVerificationScreen} />
            <Stack.Screen name="TwoFactorSetup" component={TwoFactorSetupScreen} />
            <Stack.Screen name="TwoFactorSettings" component={TwoFactorSettingsScreen} />
            <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
            <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
            <Stack.Screen name="Upgrade" component={UpgradeScreen} />
            <Stack.Screen name="Billing" component={BillingScreen} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
            <Stack.Screen name="Withdrawal" component={WithdrawalScreen} />
            <Stack.Screen name="WithdrawalMethods" component={WithdrawalMethodsScreen} />
            <Stack.Screen name="AddWithdrawalMethod" component={AddWithdrawalMethodScreen} />
            <Stack.Screen name="AllCreators" component={AllCreatorsScreen} />
            <Stack.Screen name="AllEvents" component={AllEventsScreen} />
            <Stack.Screen name="CreatorProfile" component={CreatorProfileScreen} />
            <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
            <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
            <Stack.Screen name="CreatePlaylist" component={CreatePlaylistScreen} />
            <Stack.Screen name="TrackDetails" component={TrackDetailsScreen} />
            <Stack.Screen name="PlaylistDetails" component={PlaylistDetailsScreen} />
            <Stack.Screen name="OfflineDownloads" component={OfflineDownloadScreen} />
            <Stack.Screen name="AvailabilityCalendar" component={AvailabilityCalendarScreen} />
            <Stack.Screen name="CollaborationRequests" component={CollaborationRequestsScreen} />
            <Stack.Screen name="ServiceProviderOnboarding" component={ServiceProviderOnboardingScreen} />
            <Stack.Screen name="ServiceProviderDashboard" component={ServiceProviderDashboardScreen} />
            <Stack.Screen name="AudioEnhancementExpo" component={AudioEnhancementExpoScreen} options={{ headerShown: false }} />
            {/* Allow access to onboarding even after completion for testing */}
            <Stack.Screen name="OnboardingTest" component={OnboardingScreen} />
          </>
        )}
        </Stack.Navigator>
        {user && !needsOnboarding && <MiniPlayer />}
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  console.log('🚀 SoundBridge Mobile App Loading...');
  
  // Validate environment variables with fallbacks
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://aunxdbqukbxyyiusaeqi.supabase.co';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTA2MTUsImV4cCI6MjA2ODI2NjYxNX0.IP-c4_S7Fkbq6F2UkgzL-TibkoBN49yQ1Cqz4CkMzB0';
  
  // Stripe publishable key - required for event tickets and tips
  const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  
  // Log environment status safely
  console.log('🔍 Environment variables:');
  console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET (using fallback)');
  console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET (using fallback)');
  console.log('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY:', process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'SET' : 'NOT SET');
  
  if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('⚠️ Environment variables not set, using fallback values');
  } else {
    console.log('✅ Environment variables loaded successfully');
  }
  
  if (!stripePublishableKey) {
    console.warn('⚠️ EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set - Stripe features (event tickets, tips) will not work');
  } else {
    console.log('✅ Stripe publishable key loaded - Event tickets and tips are enabled');
  }
  
  // Only render StripeProvider if we have a valid publishable key
  const appContent = (
    <>
      <StatusBar style="light" backgroundColor="#1A1A1A" />
      <AppNavigator />
    </>
  );

  // Render Stripe Provider with error handling
  const renderWithStripe = () => {
    if (!stripePublishableKey) {
      console.warn('⚠️ Stripe not configured - running without Stripe support');
      return appContent;
    }

    try {
      return (
        <StripeProvider 
          publishableKey={stripePublishableKey}
          merchantIdentifier="merchant.com.soundbridge.mobile"
          urlScheme="soundbridge"
        >
          {appContent}
        </StripeProvider>
      );
    } catch (error) {
      console.error('❌ Error initializing Stripe, continuing without it:', error);
      return appContent;
    }
  };

  return (
    <SoundBridgeErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <CollaborationProvider>
              <AudioPlayerProvider>
                {renderWithStripe()}
              </AudioPlayerProvider>
            </CollaborationProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </SoundBridgeErrorBoundary>
  );
}
