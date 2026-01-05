import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, TouchableOpacity, Text, Image } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StripeProvider } from '@stripe/stripe-react-native';
import { CopilotProvider, walkthroughable } from 'react-native-copilot';
import { useTheme } from './src/contexts/ThemeContext';
import GlassmorphicTabBar from './src/components/GlassmorphicTabBar';
import { useUnreadMessages } from './src/hooks/useUnreadMessages';
import GlobalSearchBar from './src/components/GlobalSearchBar';
import TourTooltip from './src/components/TourTooltip';

// Create walkthroughable components for tour
const WalkthroughableTouchable = walkthroughable(TouchableOpacity);

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import FeedScreen from './src/screens/FeedScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import UploadScreen from './src/screens/UploadScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import NetworkScreen from './src/screens/NetworkScreen';
import ChatScreen from './src/screens/ChatScreen';
import LiveSessionsScreen from './src/screens/LiveSessionsScreen';
import LiveSessionRoomScreen from './src/screens/LiveSessionRoomScreen';
import CreateLiveSessionScreen from './src/screens/CreateLiveSessionScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AudioPlayerScreen from './src/screens/AudioPlayerScreen';
import QueueViewScreen from './src/screens/QueueViewScreen';
import LyricsViewScreen from './src/screens/LyricsViewScreen';
import SongDetailScreen from './src/screens/SongDetailScreen';
import CreatorProfileScreen from './src/screens/CreatorProfileScreen';
import CreatorSetupScreen from './src/screens/CreatorSetupScreen';
import PrivacySecurityScreen from './src/screens/PrivacySecurityScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import NotificationPreferencesScreen from './src/screens/NotificationPreferencesScreen';
import NotificationInboxScreen from './src/screens/NotificationInboxScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ThemeSettingsScreen from './src/screens/ThemeSettingsScreen';
import HelpSupportScreen from './src/screens/HelpSupportScreen';
import AboutScreen from './src/screens/AboutScreen';
import TermsOfServiceScreen from './src/screens/TermsOfServiceScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import PaymentMethodsScreen from './src/screens/PaymentMethodsScreen';
import RequestPayoutScreen from './src/screens/RequestPayoutScreen';
import UpgradeScreen from './src/screens/UpgradeScreen';
import BillingScreen from './src/screens/BillingScreen';
import WalletScreen from './src/screens/WalletScreen';
import TransactionHistoryScreen from './src/screens/TransactionHistoryScreen';
import WithdrawalScreen from './src/screens/WithdrawalScreen';
import WithdrawalMethodsScreen from './src/screens/WithdrawalMethodsScreen';
import AddWithdrawalMethodScreen from './src/screens/AddWithdrawalMethodScreen';
import AllCreatorsScreen from './src/screens/AllCreatorsScreen';
import AllEventsScreen from './src/screens/AllEventsScreen';
import AllTracksScreen from './src/screens/AllTracksScreen';
import AllAlbumsScreen from './src/screens/AllAlbumsScreen';
import AllPlaylistsScreen from './src/screens/AllPlaylistsScreen';
import AllServicesScreen from './src/screens/AllServicesScreen';
import AllVenuesScreen from './src/screens/AllVenuesScreen';
import EventDetailsScreen from './src/screens/EventDetailsScreen';
import TrackDetailsScreen from './src/screens/TrackDetailsScreen';
import AppealFormScreen from './src/screens/AppealFormScreen';
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
import SearchScreen from './src/screens/SearchScreen';
import ExperienceManagementScreen from './src/screens/ExperienceManagementScreen';
import SkillsManagementScreen from './src/screens/SkillsManagementScreen';
import InstrumentsManagementScreen from './src/screens/InstrumentsManagementScreen';
import AnalyticsDashboardScreen from './src/screens/AnalyticsDashboardScreen';
import BrandingCustomizationScreen from './src/screens/BrandingCustomizationScreen';
import TracksListScreen from './src/screens/TracksListScreen';
import FollowersListScreen from './src/screens/FollowersListScreen';
import FollowingListScreen from './src/screens/FollowingListScreen';
import AlbumDetailsScreen from './src/screens/AlbumDetailsScreen';
import SavedPostsScreen from './src/screens/SavedPostsScreen';
import StorageManagementScreen from './src/screens/StorageManagementScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';

// Import contexts
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AudioPlayerProvider } from './src/contexts/AudioPlayerContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { CollaborationProvider } from './src/contexts/CollaborationContext';
import { ToastProvider } from './src/contexts/ToastContext';

// Import components
import MiniPlayer from './src/components/MiniPlayer';
import SoundBridgeErrorBoundary from './src/components/SoundBridgeErrorBoundary';
import CreateEventScreen from './src/screens/CreateEventScreen';
import CreatePlaylistScreen from './src/screens/CreatePlaylistScreen';

// Import services
import { notificationService } from './src/services/NotificationService';
import { offlineQueueService } from './src/services/offline/offlineQueueService';
import { analyticsService } from './src/services/analytics/analyticsService';
import { errorTrackingService } from './src/services/monitoring/errorTrackingService';
import { performanceMonitoringService } from './src/services/monitoring/performanceMonitoringService';
import { config } from './src/config/environment';
import * as Linking from 'expo-linking';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main Tab Navigator
function MainTabs() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { unreadCount } = useUnreadMessages();
  const { userProfile } = useAuth();
  
  // Track current tab to hide header on Discover screen
  const [currentTab, setCurrentTab] = React.useState('Feed');
  
  return (
    <>
      {/* CUSTOM HEADER - Hidden on Discover screen */}
      {currentTab !== 'Discover' && (
      <View style={{
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingTop: insets.top,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
          {/* Profile Pic / Logo - Left - Step 3 */}
          <WalkthroughableTouchable
            order={3}
            name="profile_hub"
            text="Your profile is your professional hub. Tap to access: Digital wallet setup (get paid!), Earnings & analytics, Create events & sell tickets, Privacy settings, and grow your network. Build your professional presence here."
          >
            <TouchableOpacity onPress={() => navigation.navigate('Profile' as never)}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
              }}>
                {userProfile?.avatar_url ? (
                  <Image
                    source={{ uri: userProfile.avatar_url }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={20} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
          </WalkthroughableTouchable>

          {/* Search Bar - Center */}
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <GlobalSearchBar />
          </View>

          {/* Messages Icon - Right */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Messages' as never)}
            style={{ position: 'relative' }}
          >
            <Ionicons name="chatbubbles-outline" size={24} color={theme.colors.text} />
            {/* Unread Badge - Only show if there are unread messages */}
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute',
                top: -4,
                right: -4,
                backgroundColor: theme.colors.error,
                borderRadius: unreadCount > 9 ? 8 : 10,
                minWidth: unreadCount > 9 ? 20 : 16,
                height: 16,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: unreadCount > 9 ? 4 : 0,
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      )}

      {/* TAB NAVIGATOR */}
      <Tab.Navigator
        screenListeners={({ navigation: tabNavigation }) => ({
          state: () => {
            const state = tabNavigation.getState();
            if (state?.routes?.[state.index]) {
              const tabName = state.routes[state.index].name;
              setCurrentTab(tabName);
            }
          },
        })}
        tabBar={(props) => (
          <View style={{ paddingBottom: insets.bottom }}>
            <GlassmorphicTabBar {...props} />
          </View>
        )}
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Feed') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Discover') {
              iconName = focused ? 'search' : 'search-outline';
            } else if (route.name === 'Upload') {
              iconName = focused ? 'add-circle' : 'add-circle-outline';
            } else if (route.name === 'Network') {
              iconName = focused ? 'people' : 'people-outline';
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
        <Tab.Screen 
          name="Feed" 
          component={FeedScreen}
          options={{ tabBarLabel: 'Feed' }}
        />
        <Tab.Screen 
          name="Discover" 
          component={DiscoverScreen}
          options={{ tabBarLabel: 'Explore' }}
        />
        <Tab.Screen 
          name="Upload" 
          component={UploadScreen}
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#EC4899',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: -20, // Elevated above tab bar
                borderWidth: 4,
                borderColor: theme.colors.background,
                shadowColor: '#EC4899',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
                elevation: 8,
              }}>
                <Ionicons name="add" size={32} color="#FFFFFF" />
              </View>
            ),
            tabBarLabel: 'Upload',
          }}
        />
        <Tab.Screen 
          name="Network" 
          component={NetworkScreen}
          options={{ tabBarLabel: 'Connect' }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ tabBarLabel: 'Profile' }}
        />
      </Tab.Navigator>
    </>
  );
}

// Main App Navigator
function AppNavigator() {
  const { user, loading, needsOnboarding } = useAuth();
  const { theme } = useTheme();
  const navigationRef = React.useRef<any>(null);

  // Track if services have been initialized
  const servicesInitializedRef = React.useRef(false);

  // Initialize services (only once on mount)
  React.useEffect(() => {
    // Prevent multiple initializations
    if (servicesInitializedRef.current) {
      return;
    }

    console.log('🔧 Initializing services...');
    servicesInitializedRef.current = true;
    
    // Initialize offline queue service (works without user)
    offlineQueueService.initialize().then(() => {
      console.log('✅ Offline queue service ready');
    }).catch(error => {
      console.error('❌ Error initializing offline queue service:', error);
      errorTrackingService.captureException(error as Error, { service: 'offlineQueue' });
    });

    // Initialize analytics service (works without user)
    analyticsService.initialize().then(() => {
      console.log('✅ Analytics service ready');
    }).catch(error => {
      console.error('❌ Error initializing analytics service:', error);
      errorTrackingService.captureException(error as Error, { service: 'analytics' });
    });

    // Initialize error tracking service
    errorTrackingService.initialize(config.sentryDsn, config.debugMode ? 'development' : 'production').then(() => {
      console.log('✅ Error tracking service ready');
    }).catch(error => {
      console.error('❌ Error initializing error tracking service:', error);
    });
  }, []); // Empty dependency array - only run once on mount

  // Set user context and initialize user-dependent services
  React.useEffect(() => {
    if (user) {
      // Set user context for error tracking
      errorTrackingService.setUser({
        id: user.id,
        email: user.email,
        username: user.user_metadata?.username,
      });

      // Initialize notification service (only once per user)
      notificationService.initialize().then(success => {
        if (success) {
          console.log('✅ Notification service ready');
        }
      });
    }
  }, [user?.id]); // Only re-run if user ID changes

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
      case 'album':
        if (segments[1]) {
          navigationRef.current.navigate('AlbumDetails', { albumId: segments[1] });
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

  // Initialize deep linking
  React.useEffect(() => {
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
            <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AudioPlayer" component={AudioPlayerScreen} />
            <Stack.Screen name="CreatorSetup" component={CreatorSetupScreen} />
            <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
            <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
            <Stack.Screen name="NotificationInbox" component={NotificationInboxScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Messages" component={MessagesScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
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
            <Stack.Screen name="RequestPayout" component={RequestPayoutScreen} />
            <Stack.Screen name="Upgrade" component={UpgradeScreen} />
            <Stack.Screen name="Billing" component={BillingScreen} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
            <Stack.Screen name="Withdrawal" component={WithdrawalScreen} />
            <Stack.Screen name="WithdrawalMethods" component={WithdrawalMethodsScreen} />
            <Stack.Screen name="AddWithdrawalMethod" component={AddWithdrawalMethodScreen} />
            <Stack.Screen name="AllCreators" component={AllCreatorsScreen} />
            <Stack.Screen name="AllEvents" component={AllEventsScreen} />
            <Stack.Screen name="AllTracks" component={AllTracksScreen} />
            <Stack.Screen name="AllAlbums" component={AllAlbumsScreen} />
            <Stack.Screen name="AllPlaylists" component={AllPlaylistsScreen} />
            <Stack.Screen name="AllServices" component={AllServicesScreen} />
            <Stack.Screen name="AllVenues" component={AllVenuesScreen} />
            <Stack.Screen name="CreatorProfile" component={CreatorProfileScreen} />
            <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
            <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
            <Stack.Screen name="CreatePlaylist" component={CreatePlaylistScreen} />
            <Stack.Screen name="TrackDetails" component={TrackDetailsScreen} />
            <Stack.Screen name="AppealForm" component={AppealFormScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PlaylistDetails" component={PlaylistDetailsScreen} />
            <Stack.Screen name="AlbumDetails" component={AlbumDetailsScreen} />
            <Stack.Screen name="SavedPosts" component={SavedPostsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="StorageManagement" component={StorageManagementScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OfflineDownloads" component={OfflineDownloadScreen} />
            <Stack.Screen name="AvailabilityCalendar" component={AvailabilityCalendarScreen} />
            <Stack.Screen name="CollaborationRequests" component={CollaborationRequestsScreen} />
            <Stack.Screen name="ServiceProviderOnboarding" component={ServiceProviderOnboardingScreen} />
            <Stack.Screen name="ServiceProviderDashboard" component={ServiceProviderDashboardScreen} />
            <Stack.Screen name="AudioEnhancementExpo" component={AudioEnhancementExpoScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ExperienceManagement" component={ExperienceManagementScreen} />
            <Stack.Screen name="SkillsManagement" component={SkillsManagementScreen} />
            <Stack.Screen name="InstrumentsManagement" component={InstrumentsManagementScreen} />
            <Stack.Screen name="AnalyticsDashboard" component={AnalyticsDashboardScreen} />
            <Stack.Screen name="BrandingCustomization" component={BrandingCustomizationScreen} />
            <Stack.Screen name="TracksList" component={TracksListScreen} />
            <Stack.Screen name="FollowersList" component={FollowersListScreen} />
            <Stack.Screen name="FollowingList" component={FollowingListScreen} />
            <Stack.Screen name="QueueView" component={QueueViewScreen} options={{ headerShown: false }} />
            <Stack.Screen name="LyricsView" component={LyricsViewScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SongDetail" component={SongDetailScreen} options={{ headerShown: false }} />
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
  
  // Use environment configuration
  const supabaseUrl = config.supabaseUrl;
  const supabaseAnonKey = config.supabaseAnonKey;
  
  // Stripe publishable key - required for event tickets and tips
  const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  
  // Log environment status safely
  console.log('🔍 Environment:', config.debugMode ? 'development' : 'production');
  console.log('🔍 API URL:', config.apiUrl);
  console.log('🔍 Supabase URL:', supabaseUrl ? 'SET' : 'NOT SET');
  console.log('🔍 Analytics Enabled:', config.analyticsEnabled);
  console.log('🔍 Debug Mode:', config.debugMode);
  
  if (!stripePublishableKey) {
    console.warn('⚠️ EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set - Stripe features (event tickets, tips) will not work');
  } else {
    console.log('✅ Stripe publishable key loaded - Event tickets and tips are enabled');
  }
  
  // Track app launch performance
  React.useEffect(() => {
    const trackAppLaunch = performanceMonitoringService.trackScreenRender('AppLaunch');
    trackAppLaunch();
  }, []);
  
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
                <ToastProvider>
                  <CopilotProvider
                    overlay="svg"
                    androidStatusBarVisible={false}
                    backdropColor="rgba(19, 7, 34, 0.9)"
                    verticalOffset={24}
                    arrowColor="#EC4899"
                    tooltipComponent={TourTooltip}
                  >
                    {renderWithStripe()}
                  </CopilotProvider>
                </ToastProvider>
              </AudioPlayerProvider>
            </CollaborationProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </SoundBridgeErrorBoundary>
  );
}
