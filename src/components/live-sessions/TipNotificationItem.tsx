/**
 * Tip Notification Item
 * Displays animated tip notifications during live sessions
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { LiveSessionTip } from '../../types/liveSession';

interface TipNotificationItemProps {
  tip: LiveSessionTip;
  onComplete: () => void;
}

export default function TipNotificationItem({ tip, onComplete }: TipNotificationItemProps) {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Exit animation after 5 seconds
    const exitTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete();
      });
    }, 5000);

    return () => clearTimeout(exitTimer);
  }, [fadeAnim, slideAnim, scaleAnim, onComplete]);

  const tipperName = tip.tipper?.display_name || 'Someone';
  const amount = tip.amount || 0;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={['rgba(220, 38, 38, 0.95)', 'rgba(239, 68, 68, 0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Tipper Avatar */}
          <View style={styles.avatarContainer}>
            {tip.tipper?.avatar_url ? (
              <Image source={{ uri: tip.tipper.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.defaultAvatar}>
                <Ionicons name="person" size={16} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Tip Details */}
          <View style={styles.textContainer}>
            <View style={styles.row}>
              <Ionicons name="cash" size={20} color="#FFD700" />
              <Text style={styles.tipperName} numberOfLines={1}>
                {tipperName}
              </Text>
              <Text style={styles.tipped}>tipped</Text>
              <Text style={styles.amount}>${amount.toFixed(2)}</Text>
            </View>
            {tip.message && (
              <Text style={styles.message} numberOfLines={2}>
                {tip.message}
              </Text>
            )}
          </View>
        </View>

        {/* Sparkle Effects */}
        <View style={styles.sparkleContainer}>
          <Text style={[styles.sparkle, { top: 5, right: 10 }]}>✨</Text>
          <Text style={[styles.sparkle, { bottom: 5, left: 10 }]}>💰</Text>
          <Text style={[styles.sparkle, { top: 15, left: 30 }]}>⭐</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    padding: 12,
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  textContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  tipperName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    maxWidth: '30%',
  },
  tipped: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  amount: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '800',
  },
  message: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
    opacity: 0.95,
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  sparkle: {
    position: 'absolute',
    fontSize: 16,
    opacity: 0.7,
  },
});

