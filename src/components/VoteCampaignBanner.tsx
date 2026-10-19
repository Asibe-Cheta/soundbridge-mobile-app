import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { VOTE_COPY } from '../config/voteCampaign';
import { getVoteCountdown } from '../utils/voteCountdown';

interface Props {
  onPress: () => void;
  onDismiss: () => void;
}

export default function VoteCampaignBanner({ onPress, onDismiss }: Props) {
  const { theme } = useTheme();
  const countdown = getVoteCountdown();
  if (countdown.closed) return null;

  const text = countdown.useHours ? VOTE_COPY.bannerTextHours(countdown.hours) : VOTE_COPY.bannerTextDays(countdown.days);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.primary + '14', borderColor: theme.colors.primary + '40' }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.text, { color: theme.colors.text }]} numberOfLines={2}>{text}</Text>
      <TouchableOpacity
        style={styles.dismissBtn}
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Dismiss vote campaign banner"
      >
        <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 8,
    gap: 8,
  },
  text: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  dismissBtn: { padding: 4 },
});
