import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

type EventMatchIndicatorProps = {
  eventGenres?: Array<string | null | undefined> | null;
  userGenres?: Array<string | null | undefined> | null;
  maxTags?: number;
};

const DEFAULT_MAX_TAGS = 2;

export default function EventMatchIndicator({ eventGenres, userGenres, maxTags = DEFAULT_MAX_TAGS }: EventMatchIndicatorProps) {
  const { theme } = useTheme();

  const matchingTags = useMemo(() => {
    const eventTags = normalize(eventGenres);
    const userTags = normalize(userGenres);

    if (!eventTags.length || !userTags.length) {
      return [];
    }

    const intersection = eventTags.filter(tag => userTags.includes(tag));
    return intersection.slice(0, maxTags);
  }, [eventGenres, userGenres, maxTags]);

  if (matchingTags.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary + '40' }]}> 
      <Ionicons name="checkmark-circle" size={16} color="#16A34A" style={styles.icon} />
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
        Matches: {matchingTags.join(' · ')}
      </Text>
    </View>
  );
}

function normalize(values?: Array<string | null | undefined> | null): string[] {
  if (!values) return [];
  return values
    .map(value => (value || '').trim())
    .filter(value => value.length > 0)
    .map(value => value.toLowerCase());
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
});



