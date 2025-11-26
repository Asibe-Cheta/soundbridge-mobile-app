import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getRelativeTime } from '../utils/collaborationUtils';

interface ActivityItem {
  id: string;
  type: 'post' | 'reaction' | 'connection';
  icon: string;
  text: string;
  timestamp: string;
  iconColor: string;
  iconBg: string;
}

const mockActivities: ActivityItem[] = [
  {
    id: 'activity-1',
    type: 'post',
    icon: 'flame',
    text: 'Shared a new opportunity',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    iconColor: '#FFFFFF',
    iconBg: '#7C3AED',
  },
  {
    id: 'activity-2',
    type: 'reaction',
    icon: 'heart',
    text: "Reacted to Marcus Williams' post",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    iconColor: '#FFFFFF',
    iconBg: '#EC4899',
  },
  {
    id: 'activity-3',
    type: 'connection',
    icon: 'people',
    text: 'Connected with DJ Temitope',
    timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    iconColor: '#FFFFFF',
    iconBg: '#3B82F6',
  },
];

export default function RecentActivity() {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>Recent Activity</Text>

      <LinearGradient
        colors={[theme.colors.primary, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.divider}
      />

      {mockActivities.map((activity) => (
        <View key={activity.id} style={styles.activityItem}>
          <View
            style={[
              styles.activityIcon,
              {
                backgroundColor: activity.iconBg,
              },
            ]}
          >
            <Ionicons name={activity.icon as any} size={16} color={activity.iconColor} />
          </View>
          <View style={styles.activityContent}>
            <Text style={[styles.activityText, { color: theme.colors.text }]}>
              {activity.text}
            </Text>
            <Text style={[styles.activityTimestamp, { color: theme.colors.textSecondary }]}>
              {getRelativeTime(activity.timestamp)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  divider: {
    height: 2,
    marginBottom: 14,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  activityTimestamp: {
    fontSize: 12,
    fontWeight: '400',
  },
});

