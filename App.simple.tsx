// @ts-nocheck
import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Mock auth context
const AuthProvider = ({ children }: any) => children;
const useAuth = () => ({ 
  user: { email: 'test@test.com' }, 
  loading: false 
});

// Simple navigation simulation
let currentScreen = 'Home';

const navigation = {
  navigate: (screenName: string) => {
    console.log('🎯 NAVIGATION ATTEMPT:', screenName);
    currentScreen = screenName;
    Alert.alert('Navigation', `Navigating to ${screenName}`);
  }
};

// Simple screens
const HomeScreen = () => {
  console.log('🚨 CRITICAL DEBUG: HomeScreen is rendering!');
  
  const handleCreatorSetup = () => {
    console.log('🚨 SHARE YOUR SOUND CLICKED!');
    navigation.navigate('CreatorSetup');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000', padding: 20 }}>
      <Text style={{ color: 'white', fontSize: 24, marginBottom: 20 }}>
        SoundBridge Home
      </Text>
      
      {/* Share Your Sound Banner */}
      <TouchableOpacity 
        onPress={handleCreatorSetup}
        style={{
          backgroundColor: '#DC2626',
          padding: 20,
          borderRadius: 10,
          marginBottom: 20
        }}
      >
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
          ⭐ Share Your Sound
        </Text>
        <Text style={{ color: 'white', fontSize: 14 }}>
          Get support from fans →
        </Text>
      </TouchableOpacity>

      <Text style={{ color: 'white', fontSize: 16 }}>
        Current Screen: {currentScreen}
      </Text>
    </View>
  );
};

const CreatorSetupScreen = () => {
  console.log('🎯 CREATOR SETUP SCREEN RENDERED!');
  
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: 'red', 
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      <Text style={{ 
        color: 'white', 
        fontSize: 48, 
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        🎯 CREATOR SETUP WORKS!
      </Text>
      <Text style={{ 
        color: 'yellow', 
        fontSize: 24, 
        marginTop: 20,
        textAlign: 'center'
      }}>
        Navigation is now fixed!
      </Text>
    </View>
  );
};

function AppNavigator() {
  const { user, loading } = useAuth();
  
  console.log('🚨 CRITICAL DEBUG: AppNavigator is running with SIMPLE VERSION!');
  console.log('🔧 AppNavigator: User authenticated:', !!user);
  console.log('🔧 AppNavigator: Loading:', loading);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: 'white', fontSize: 24 }}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: 'white', fontSize: 24 }}>Please log in</Text>
      </View>
    );
  }

  // Show the current screen based on state
  if (currentScreen === 'CreatorSetup') {
    return <CreatorSetupScreen />;
  }

  return <HomeScreen />;
}

export default function App() {
  console.log('🚨 CRITICAL DEBUG: Simple App is starting!');
  
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" backgroundColor="#1A1A1A" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
