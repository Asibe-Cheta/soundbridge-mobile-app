import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false, // Set to false for web compatibility
    }).start();

    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: false, // Set to false for web compatibility
    }).start();

    // Progress animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();
  }, [fadeAnim, scaleAnim, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '45%'],
  });

  return (
    <LinearGradient
      colors={['#0A0E1A', '#1A2332', '#0F1419']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />
      
      {/* Background Gradients - ElevenLabs-inspired blues */}
      <LinearGradient
        colors={['rgba(59, 130, 246, 0.2)', 'rgba(147, 197, 253, 0.15)', 'rgba(96, 165, 250, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient1, { opacity: 0.4 }]}
      />
      <LinearGradient
        colors={['rgba(96, 165, 250, 0.15)', 'rgba(59, 130, 246, 0.2)', 'rgba(37, 99, 235, 0.1)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.gradient2, { opacity: 0.3 }]}
      />
      {/* Accent gradients (red/pink) */}
      <LinearGradient
        colors={['rgba(220, 38, 38, 0.1)', 'rgba(236, 72, 153, 0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient3, { opacity: 0.2 }]}
      />

      {/* Main Content - Logo directly in blue gradient */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          {/* SoundBridge Logo */}
          <Image
            source={require('../../assets/images/logos/logo-trans-lockup.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Progress Bar with Glassmorphism */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarGlass}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: progressWidth },
              ]}
            >
              <LinearGradient
                colors={['#DC2626', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressGradient}
              />
            </Animated.View>
          </View>
        </View>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient1: {
    position: 'absolute',
    width: 256,
    height: 256,
    borderRadius: 128,
    top: -64,
    left: -64,
  },
  gradient2: {
    position: 'absolute',
    width: 288,
    height: 288,
    borderRadius: 144,
    bottom: -72,
    right: -72,
  },
  gradient3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: '30%',
    right: '20%',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 1.5, // Much bigger - 150% of screen width (will be constrained by maxWidth)
    height: width * 0.6, // Much taller to match
    maxWidth: width * 1.1, // Use 110% of screen width as maximum (will scale down to fit)
    maxHeight: height * 0.7, // Use up to 70% of screen height
  },
  progressContainer: {
    position: 'absolute',
    bottom: 80,
    left: 40,
    right: 40,
    alignItems: 'center',
  },
  progressBarGlass: {
    width: '100%',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.2)',
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(26, 35, 50, 0.4)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressGradient: {
    flex: 1,
    borderRadius: 5,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});