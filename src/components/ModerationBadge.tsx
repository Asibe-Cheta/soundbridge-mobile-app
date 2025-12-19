import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ModerationBadgeProps {
  status: 'pending_check' | 'checking' | 'clean' | 'flagged' | 'approved' | 'rejected' | 'appealed';
  confidence?: number | null;
  isOwner: boolean;
}

const MODERATION_COLORS = {
  pending_check: '#9CA3AF',
  checking: '#3B82F6',
  clean: '#10B981',
  flagged: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  appealed: '#F59E0B',
};

const MODERATION_LABELS = {
  pending_check: '⏳ Pending Check',
  checking: '🔍 Checking...',
  clean: '✓ Verified',
  flagged: '⚠️ Under Review',
  approved: '✓ Approved',
  rejected: '✗ Not Approved',
  appealed: '📬 Appeal Pending',
};

export const ModerationBadge: React.FC<ModerationBadgeProps> = ({ 
  status, 
  confidence, 
  isOwner 
}) => {
  // Don't show badge to non-owners
  if (!isOwner) return null;

  // Don't show badge for clean tracks with low confidence (they're fine)
  if (status === 'clean' && (!confidence || confidence < 50)) return null;

  return (
    <View style={[styles.badge, { backgroundColor: MODERATION_COLORS[status] }]}>
      <Text style={styles.badgeText}>{MODERATION_LABELS[status]}</Text>
      {confidence && confidence >= 50 && status !== 'approved' && status !== 'rejected' && (
        <Text style={styles.confidence}>
          {Math.round(confidence)}% confidence
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  confidence: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 2,
    opacity: 0.9,
  },
});

