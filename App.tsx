import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import UploadScreen from './src/screens/UploadScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AudioPlayerScreen from './src/screens/AudioPlayerScreen';
import CreatorProfileScreen from './src/screens/CreatorProfileScreen';
import CreatorSetupScreen from './src/screens/CreatorSetupScreen';
import PrivacySecurityScreen from './src/screens/PrivacySecurityScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
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
import OnboardingScreen from './src/screens/OnboardingScreen';
import AvailabilityCalendarScreen from './src/screens/AvailabilityCalendarScreen';
import CollaborationRequestsScreen from './src/screens/CollaborationRequestsScreen';
import AudioEnhancementExpoScreen from './src/screens/AudioEnhancementScreen.expo';

// Import contexts
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AudioPlayerProvider } from './src/contexts/AudioPlayerContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { CollaborationProvider } from './src/contexts/CollaborationContext';

// Import components
import MiniPlayer from './src/components/MiniPlayer';

// Import services
// import { notificationService } from './src/services/NotificationService';
// import { deepLinkingService } from './src/services/DeepLinkingService';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main Tab Navigator
function MainTabs() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
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
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          borderTopWidth: 1,
          paddingBottom: insets.bottom + 10,
          paddingTop: 8,
          height: 70 + insets.bottom,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
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
  const navigationRef = React.useRef<any>(null);

  // Initialize services
  React.useEffect(() => {
    console.log('🔧 Services initialization temporarily disabled for debugging');
    // if (user) {
    //   // Initialize notification service
    //   notificationService.initialize().then(success => {
    //     if (success) {
    //       console.log('✅ Notification service ready');
    //     }
    //   });
    // }

    // // Initialize deep linking service
    // if (navigationRef.current) {
    //   const cleanup = deepLinkingService.initialize(navigationRef.current);
    //   return cleanup;
    // }
  }, [user]);

  // Handle navigation ready
  const onNavigationReady = React.useCallback(() => {
    console.log('🔧 Deep linking temporarily disabled for debugging');
    // deepLinkingService.setNavigationReady();
    // deepLinkingService.processPendingNavigation();
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer 
        ref={navigationRef} 
        onReady={onNavigationReady}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
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
            <Stack.Screen name="TrackDetails" component={TrackDetailsScreen} />
            <Stack.Screen name="PlaylistDetails" component={PlaylistDetailsScreen} />
            <Stack.Screen name="AvailabilityCalendar" component={AvailabilityCalendarScreen} />
            <Stack.Screen name="CollaborationRequests" component={CollaborationRequestsScreen} />
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
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <CollaborationProvider>
            <AudioPlayerProvider>
              <StatusBar style="light" backgroundColor="#1A1A1A" />
              <AppNavigator />
            </AudioPlayerProvider>
          </CollaborationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}