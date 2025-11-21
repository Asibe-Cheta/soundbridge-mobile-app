/**
 * Session Card Component
 * Displays a live session in the discovery screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LiveSession } from '../../types/liveSession';
import { useTheme } from '../../contexts/ThemeContext';

interface SessionCardProps {
  session: LiveSession;
  onPress: () => void;
  currentUserId?: string; // Add current user ID to determine ownership
}

export default function SessionCard({ session, onPress, currentUserId }: SessionCardProps) {
  const { theme } = useTheme();
  
  // Check if this is the current user's session
  const isOwnSession = currentUserId && session.creator_id === currentUserId;

  const formatListenerCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const isLive = session.status === 'live';
  const isScheduled = session.status === 'scheduled';

  const formatScheduledTime = (dateString?: string): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.round(diffInHours * 60);
      return `in ${minutes} min`;
    } else if (diffInHours < 24) {
      return `in ${Math.round(diffInHours)}h`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Live Badge */}
      {isLive && (
        <View style={styles.liveBadge}>
          <LinearGradient
            colors={['#DC2626', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.liveBadgeGradient}
          >
            <View style={styles.liveIndicator} />
            <Text style={styles.liveText}>LIVE</Text>
          </LinearGradient>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        {/* Creator Info */}
        <View style={styles.creatorInfo}>
          {session.creator?.avatar_url ? (
            <Image
              source={{ uri: session.creator.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
            </View>
          )}
          <View style={styles.creatorText}>
            <Text style={[styles.creatorName, { color: theme.colors.text }]} numberOfLines={1}>
              {session.creator?.display_name || 'Unknown'}
            </Text>
            <Text style={[styles.creatorUsername, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              @{session.creator?.username || 'unknown'}
            </Text>
          </View>
        </View>

        {/* Listener Count */}
        <View style={styles.listenerCount}>
          <Ionicons name="people" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.listenerCountText, { color: theme.colors.textSecondary }]}>
            {formatListenerCount(session.peak_listener_count || 0)}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
        {session.title}
      </Text>

      {/* Description */}
      {session.description && (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {session.description}
        </Text>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        {/* Session Type */}
        <View style={[styles.typeBadge, { backgroundColor: theme.colors.surface }]}>
          <Ionicons 
            name={session.session_type === 'broadcast' ? 'radio' : 'mic'} 
            size={12} 
            color={theme.colors.textSecondary} 
          />
          <Text style={[styles.typeText, { color: theme.colors.textSecondary }]}>
            {session.session_type === 'broadcast' ? 'Broadcast' : 'Interactive'}
          </Text>
        </View>

        {/* Scheduled Time, Join Button, or Manage Button */}
        {isScheduled ? (
          <View style={styles.scheduledBadge}>
            <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
            <Text style={[styles.scheduledText, { color: theme.colors.textSecondary }]}>
              {formatScheduledTime(session.scheduled_start_time)}
            </Text>
          </View>
        ) : isOwnSession ? (
          <View style={[styles.manageButton, { backgroundColor: '#8B5CF6' }]}>
            <Text style={styles.manageButtonText}>Manage</Text>
            <Ionicons name="settings-outline" size={14} color="#FFFFFF" />
          </View>
        ) : (
          <View style={[styles.joinButton, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.joinButtonText}>Join</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 1,
  },
  liveBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorText: {
    flex: 1,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  creatorUsername: {
    fontSize: 12,
  },
  listenerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listenerCountText: {
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  scheduledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduledText: {
    fontSize: 12,
    fontWeight: '500',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  manageButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

