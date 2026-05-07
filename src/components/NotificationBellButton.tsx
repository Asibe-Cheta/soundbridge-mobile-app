import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface NotificationBellButtonProps {
  size?: number;
  color?: string;
}

// Bar heights as fractions of total height — classic sound wave shape
const WAVE_BARS = [0.45, 0.75, 1.0, 0.75, 0.45];
const BAR_W = 3;
const BAR_GAP = 2;

function SoundWaveIcon({ size, color }: { size: number; color: string }) {
  const totalW = WAVE_BARS.length * BAR_W + (WAVE_BARS.length - 1) * BAR_GAP;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${totalW} ${size}`}>
      {WAVE_BARS.map((frac, i) => {
        const barH = Math.round(frac * size);
        const x = i * (BAR_W + BAR_GAP);
        const y = (size - barH) / 2;
        return (
          <Rect
            key={i}
            x={x}
            y={y}
            width={BAR_W}
            height={barH}
            rx={BAR_W / 2}
            fill={color}
          />
        );
      })}
    </Svg>
  );
}

export default function NotificationBellButton({ size = 24, color }: NotificationBellButtonProps) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [bellPosition, setBellPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const bellRef = useRef<View>(null);

  const iconColor = color || (theme.isDark ? 'white' : theme.colors.text);

  const loadUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        if (error.message) {
          console.warn('⚠️ Error loading unread count:', error.message);
        }
        return;
      }

      setUnreadCount(count || 0);
    } catch (error) {
      console.error('❌ Exception loading unread count:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
    }, [loadUnreadCount])
  );

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notification-bell')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.old?.read === false && payload.new?.read === true) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handlePress = () => {
    bellRef.current?.measureInWindow((x, y, width, height) => {
      setBellPosition({ x, y, width, height });
      setMenuVisible(true);
    });
  };

  const handleViewNotifications = () => {
    setMenuVisible(false);
    navigation.navigate('Notifications' as never);
  };

  const handleNotificationPreferences = () => {
    setMenuVisible(false);
    navigation.navigate('NotificationPreferences' as never);
  };

  const isDark = theme.isDark;

  return (
    <>
      <TouchableOpacity
        ref={bellRef}
        onPress={handlePress}
        style={styles.container}
        accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        accessibilityRole="button"
      >
        <SoundWaveIcon size={size} color={iconColor} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View
            style={[
              styles.menuPositioner,
              {
                top: bellPosition.y + bellPosition.height + 8,
                right: Dimensions.get('window').width - bellPosition.x - bellPosition.width,
              },
            ]}
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 40 : 70}
              tint={isDark ? 'dark' : 'light'}
              style={[
                styles.glassCard,
                {
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.18)'
                    : 'rgba(88, 36, 145, 0.2)',
                },
              ]}
            >
              {/* Tint layer */}
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: isDark
                      ? 'rgba(24, 8, 52, 0.35)'
                      : 'rgba(88, 36, 145, 0.08)',
                    borderRadius: 20,
                  },
                ]}
              />

              {/* Glass highlight sheen */}
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(255, 255, 255, 0.14)', 'rgba(255, 255, 255, 0.04)', 'transparent']
                    : ['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.08)', 'transparent']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.glassHighlight}
              />

              {/* View Notifications */}
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' },
                ]}
                onPress={handleViewNotifications}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.primary + '25' }]}>
                  <SoundWaveIcon size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>
                    View Notifications
                  </Text>
                  <Text style={[styles.menuItemSubtitle, { color: isDark ? 'rgba(255,255,255,0.55)' : theme.colors.textSecondary }]}>
                    {unreadCount > 0
                      ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                      : 'You\'re all caught up'}
                  </Text>
                </View>
                {unreadCount > 0 && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Notification Preferences */}
              <TouchableOpacity
                style={styles.menuItemLast}
                onPress={handleNotificationPreferences}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(78, 205, 196, 0.2)' }]}>
                  <Ionicons name="options" size={18} color="#4ECDC4" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>
                    Notification Preferences
                  </Text>
                  <Text style={[styles.menuItemSubtitle, { color: isDark ? 'rgba(255,255,255,0.55)' : theme.colors.textSecondary }]}>
                    Manage types, schedule & genres
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={isDark ? 'rgba(255,255,255,0.4)' : theme.colors.textSecondary} />
              </TouchableOpacity>
            </BlurView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuPositioner: {
    position: 'absolute',
    width: 280,
  },
  glassCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 12,
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    zIndex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 2,
  },
  menuItemLast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 2,
  },
  menuIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  menuBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  menuBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
