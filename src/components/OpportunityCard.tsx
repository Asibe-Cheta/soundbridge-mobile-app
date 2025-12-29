import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getRelativeTime } from '../utils/collaborationUtils';
import * as Haptics from 'expo-haptics';
import ExpressInterestModal from './ExpressInterestModal';

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
  };
  posted_at: string;
  is_featured: boolean;
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  onPress?: (opportunityId: string) => void;
  onApply?: (opportunityId: string) => void;
}

export default function OpportunityCard({
  opportunity,
  onPress,
  onApply,
}: OpportunityCardProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);

  // Check if user is a service provider
  const [isServiceProvider, setIsServiceProvider] = useState(false);

  // TODO: Fetch service provider status from database
  // For now, assume all authenticated users are service providers
  React.useEffect(() => {
    // This will be replaced with actual check:
    // const checkServiceProvider = async () => {
    //   const { data } = await supabase
    //     .from('service_provider_profiles')
    //     .select('user_id')
    //     .eq('user_id', user?.id)
    //     .single();
    //   setIsServiceProvider(!!data);
    // };
    // checkServiceProvider();
    setIsServiceProvider(!!user);
  }, [user]);

  const handleApplyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isServiceProvider) {
      setModalVisible(true);
    } else {
      // Show message that only service providers can express interest
      alert('Only service providers can express interest in opportunities. Become a service provider to apply!');
    }
  };

  const handleSubmitInterest = async (data: {
    opportunityId: string;
    reason: string;
    message: string;
    enableAlerts: boolean;
  }) => {
    // Call the parent's onApply with the data
    console.log('Submitting interest:', data);
    // TODO: Implement database insert
    // await supabase.from('opportunity_interests').insert({...})
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
        {opportunity.is_featured && (
          <View style={[styles.badge, { backgroundColor: '#7C3AED' }]}>
            <Text style={styles.badgeText}>FEATURED</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.authorInfo}>
            {opportunity.posted_by.avatar_url ? (
              <Image
                source={{ uri: opportunity.posted_by.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.authorText}>
              <Text style={[styles.authorName, { color: theme.colors.text }]}>
                {opportunity.posted_by.display_name}
              </Text>
              <Text style={[styles.postedAt, { color: theme.colors.textSecondary }]}>
                {getRelativeTime(opportunity.posted_at)}
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
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApplyPress}
        >
          <LinearGradient
            colors={['#7C3AED', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.applyGradient}
          >
            <Text style={styles.applyText}>Express Interest</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
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
});

