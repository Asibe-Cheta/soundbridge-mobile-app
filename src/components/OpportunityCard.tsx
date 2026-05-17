import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import VerifiedAvatar from './VerifiedAvatar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getRelativeTime } from '../utils/collaborationUtils';
import * as Haptics from 'expo-haptics';
import ExpressInterestModal from './ExpressInterestModal';
import { opportunityService } from '../services/OpportunityService';

interface Opportunity {
  id: string;
  type: 'collaboration' | 'event' | 'job';
  title: string;
  description: string;
  posted_by: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  posted_at: string;
  created_at?: string;
  is_featured: boolean;
  has_expressed_interest?: boolean;
  // Urgent gig fields
  gig_type?: 'urgent' | 'planned';
  expires_at?: string;
  distance_km?: number;
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  onPress?: (opportunityId: string) => void;
  onApply?: (opportunityId: string) => void;
  onEdit?: (opportunity: Opportunity) => void;
}

export default function OpportunityCard({
  opportunity,
  onPress,
  onApply,
  onEdit,
}: OpportunityCardProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [interestSent, setInterestSent] = useState(opportunity.has_expressed_interest || false);

  const isOwnPost = !!user && user.id === opportunity.posted_by?.id;
  const isUrgent = opportunity.gig_type === 'urgent';

  // Countdown for urgent gigs (updates every minute)
  const [urgentCountdown, setUrgentCountdown] = useState('');
  useEffect(() => {
    if (!isUrgent || !opportunity.expires_at) return;
    function update() {
      const diff = new Date(opportunity.expires_at!).getTime() - Date.now();
      if (diff <= 0) { setUrgentCountdown('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setUrgentCountdown(h > 0 ? `${h}h ${m}m` : `${m}m`);
    }
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [isUrgent, opportunity.expires_at]);

  const handleApplyPress = () => {
    if (isOwnPost || interestSent) return;
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to express interest.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalVisible(true);
  };

  const handleSubmitInterest = async (data: {
    opportunityId: string;
    reason: string;
    message: string;
  }) => {
    await opportunityService.expressInterest(data.opportunityId, {
      reason: data.reason,
      message: data.message || undefined,
    });
    setInterestSent(true);
    onApply?.(data.opportunityId);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderColor: 'rgba(124, 58, 237, 0.2)',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.95}
    >
      <LinearGradient
        colors={['rgba(124, 58, 237, 0.1)', 'rgba(167, 139, 250, 0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Badge */}
        {isUrgent ? (
          <View style={[styles.badge, { backgroundColor: '#DC2626', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <Text style={{ fontSize: 11 }}>🔥</Text>
            <Text style={styles.badgeText}>URGENT</Text>
          </View>
        ) : opportunity.is_featured ? (
          <View style={[styles.badge, { backgroundColor: '#7C3AED' }]}>
            <Text style={styles.badgeText}>FEATURED</Text>
          </View>
        ) : null}

        {/* Urgent gig meta row: countdown + distance */}
        {isUrgent && (urgentCountdown || opportunity.distance_km != null) && (
          <View style={styles.urgentMeta}>
            {urgentCountdown ? (
              <View style={styles.urgentMetaItem}>
                <Text style={{ fontSize: 11 }}>⏰</Text>
                <Text style={[styles.urgentMetaText, { color: urgentCountdown === 'Expired' ? '#EF4444' : '#F59E0B' }]}>
                  {urgentCountdown === 'Expired' ? 'Expired' : `Expires in ${urgentCountdown}`}
                </Text>
              </View>
            ) : null}
            {opportunity.distance_km != null && (
              <View style={styles.urgentMetaItem}>
                <Text style={{ fontSize: 11 }}>📍</Text>
                <Text style={styles.urgentMetaText}>{opportunity.distance_km.toFixed(1)} km away</Text>
              </View>
            )}
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.authorInfo}>
            <VerifiedAvatar
              avatarUrl={opportunity.posted_by?.avatar_url}
              isVerified={opportunity.posted_by?.is_verified}
              size={32}
              fallbackIconSize={16}
              marginRight={8}
            />
            <View style={styles.authorText}>
              <Text style={[styles.authorName, { color: theme.colors.text }]}>
                {opportunity.posted_by?.display_name ?? 'Unknown'}
              </Text>
              <Text style={[styles.postedAt, { color: theme.colors.textSecondary }]}>
                {getRelativeTime(opportunity.posted_at || opportunity.created_at || '')}
              </Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {opportunity.title}
        </Text>

        {/* Description */}
        <Text
          style={[styles.description, { color: theme.colors.textSecondary }]}
          numberOfLines={3}
        >
          {opportunity.description}
        </Text>

        {/* Apply Button */}
        {isOwnPost ? (
          <View style={styles.ownPostRow}>
            <Ionicons name="person-circle-outline" size={15} color={theme.colors.textSecondary} />
            <Text style={[styles.ownPostText, { color: theme.colors.textSecondary }]}>Your post</Text>
            {onEdit && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEdit(opportunity)}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={13} color={theme.colors.primary} />
                <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApplyPress}
            disabled={interestSent}
          >
            <LinearGradient
              colors={interestSent ? ['#059669', '#047857'] : ['#7C3AED', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.applyGradient}
            >
              {interestSent ? (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.applyText}>Interest Sent</Text>
                </>
              ) : (
                <>
                  <Text style={styles.applyText}>Express Interest</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Express Interest Modal */}
      <ExpressInterestModal
        visible={modalVisible}
        opportunity={opportunity}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmitInterest}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gradient: {
    padding: 16,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  urgentMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    marginTop: 4,
  },
  urgentMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  urgentMetaText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F59E0B',
  },
  header: {
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  authorText: {
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  postedAt: {
    fontSize: 11,
    fontWeight: '400',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 16,
  },
  applyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  applyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ownPostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  ownPostText: {
    fontSize: 13,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    backgroundColor: 'rgba(139,92,246,0.1)',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

