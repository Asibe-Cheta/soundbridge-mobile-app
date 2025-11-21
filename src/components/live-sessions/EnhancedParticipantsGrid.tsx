/**
 * Enhanced Participants Grid
 * Displays live session participants with speaking indicators and role management
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { LiveSessionParticipant } from '../../types/liveSession';

interface EnhancedParticipantsGridProps {
  participants: LiveSessionParticipant[];
  myRole: 'listener' | 'speaker' | 'host';
  speakingUids: Set<number>;
  currentUserId?: string;
  onParticipantPress?: (participant: LiveSessionParticipant) => void;
  showHandRaisedNotification?: boolean; // Show notification badge for host
}

export default function EnhancedParticipantsGrid({
  participants,
  myRole,
  speakingUids,
  currentUserId,
  onParticipantPress,
}: EnhancedParticipantsGridProps) {
  const { theme } = useTheme();

  // Separate participants by role
  const host = participants.find(p => p.role === 'host');
  const speakers = participants.filter(p => p.role === 'speaker');
  const listeners = participants.filter(p => p.role === 'listener');

  const renderParticipantCard = (participant: LiveSessionParticipant, showRoleBadge: boolean = true) => {
    const isCurrentUser = participant.user_id === currentUserId;
    const isSpeaking = speakingUids.has(parseInt(participant.user_id.replace(/\D/g, '').slice(0, 9)));
    const canSpeak = participant.role === 'host' || participant.role === 'speaker';

    return (
      <TouchableOpacity
        key={participant.id}
        style={[
          styles.participantCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          isSpeaking && styles.speakingCard,
          isCurrentUser && { borderColor: theme.colors.primary, borderWidth: 2 },
        ]}
        onPress={() => onParticipantPress && onParticipantPress(participant)}
        activeOpacity={onParticipantPress ? 0.7 : 1}
      >
        {/* Avatar Container */}
        <View style={styles.avatarContainer}>
          {participant.user?.avatar_url ? (
            <Image
              source={{ uri: participant.user.avatar_url }}
              style={[
                styles.participantAvatar,
                isSpeaking && styles.speakingAvatar,
              ]}
            />
          ) : (
            <View
              style={[
                styles.defaultParticipantAvatar,
                { backgroundColor: theme.colors.surface },
                isSpeaking && styles.speakingAvatar,
              ]}
            >
              <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
            </View>
          )}

          {/* Speaking Indicator Rings */}
          {isSpeaking && canSpeak && (
            <>
              <View style={[styles.speakingRing, styles.speakingRing1]} />
              <View style={[styles.speakingRing, styles.speakingRing2]} />
            </>
          )}

          {/* Role Badge */}
          {showRoleBadge && (
            <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(participant.role) }]}>
              <Ionicons
                name={getRoleBadgeIcon(participant.role)}
                size={12}
                color="#FFFFFF"
              />
            </View>
          )}
        </View>

        {/* Participant Info */}
        <View style={styles.participantInfo}>
          <Text
            style={[
              styles.participantName,
              { color: theme.colors.text },
              isCurrentUser && { color: theme.colors.primary },
            ]}
            numberOfLines={1}
          >
            {participant.user?.display_name || 'Guest'}
            {isCurrentUser && ' (You)'}
          </Text>

          {/* Status Icons */}
          <View style={styles.statusIcons}>
            {canSpeak && (
              <View
                style={[
                  styles.statusIcon,
                  { backgroundColor: participant.is_muted ? theme.colors.surface : 'rgba(34, 197, 94, 0.2)' },
                ]}
              >
                <Ionicons
                  name={participant.is_muted ? 'mic-off' : 'mic'}
                  size={12}
                  color={participant.is_muted ? theme.colors.textSecondary : '#22C55E'}
                />
              </View>
            )}

            {participant.hand_raised && participant.role === 'listener' && (
              <View style={styles.handRaisedIndicator}>
                <Text style={styles.handEmoji}>✋</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'host':
        return '#DC2626'; // Red
      case 'speaker':
        return '#3B82F6'; // Blue
      case 'listener':
        return '#6B7280'; // Gray
      default:
        return '#6B7280';
    }
  };

  const getRoleBadgeIcon = (role: string) => {
    switch (role) {
      case 'host':
        return 'star';
      case 'speaker':
        return 'mic';
      case 'listener':
        return 'headset';
      default:
        return 'person';
    }
  };

  return (
    <View style={styles.container}>
      {/* Host Section */}
      {host && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#DC2626', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sectionBadge}
            >
              <Ionicons name="star" size={12} color="#FFFFFF" />
              <Text style={styles.sectionBadgeText}>Host</Text>
            </LinearGradient>
            <Text style={[styles.sectionCount, { color: theme.colors.textSecondary }]}>1</Text>
          </View>
          <View style={styles.hostContainer}>
            {renderParticipantCard(host, false)}
          </View>
        </View>
      )}

      {/* Speakers Section */}
      {speakers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionBadge, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="mic" size={12} color="#FFFFFF" />
              <Text style={styles.sectionBadgeText}>Speakers</Text>
            </View>
            <Text style={[styles.sectionCount, { color: theme.colors.textSecondary }]}>
              {speakers.length}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalGrid}
          >
            {speakers.map(speaker => renderParticipantCard(speaker, false))}
          </ScrollView>
        </View>
      )}

      {/* Listeners Section */}
      {listeners.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionBadge, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="headset" size={12} color={theme.colors.text} />
              <Text style={[styles.sectionBadgeText, { color: theme.colors.text }]}>Listeners</Text>
            </View>
            <Text style={[styles.sectionCount, { color: theme.colors.textSecondary }]}>
              {listeners.length}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalGrid}
          >
            {listeners.slice(0, 20).map(listener => renderParticipantCard(listener, false))}
            {listeners.length > 20 && (
              <View style={[styles.moreCard, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.moreText, { color: theme.colors.textSecondary }]}>
                  +{listeners.length - 20} more
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  sectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  hostContainer: {
    paddingHorizontal: 20,
  },
  horizontalGrid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  participantCard: {
    width: 80,
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  speakingCard: {
    borderColor: '#22C55E',
    borderWidth: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  participantAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  defaultParticipantAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakingAvatar: {
    borderWidth: 3,
    borderColor: '#22C55E',
  },
  speakingRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  speakingRing1: {
    opacity: 0.6,
    transform: [{ scale: 1.2 }],
  },
  speakingRing2: {
    opacity: 0.3,
    transform: [{ scale: 1.4 }],
  },
  roleBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  participantInfo: {
    width: '100%',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  statusIcons: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  statusIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handRaisedIndicator: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handEmoji: {
    fontSize: 14,
  },
  moreCard: {
    width: 80,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  moreText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

