import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';

type RecentActivityItem = {
  id: string;
  message: string;
  time: string;
  icon: string;
  color: string;
};

export default function RecentActivityScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const route = useRoute<any>();
  const activities: RecentActivityItem[] = route.params?.activities || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Recent Activity</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activities.length > 0 ? (
          activities.map((activity) => (
            <View
              key={activity.id}
              style={[styles.activityItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            >
              <Ionicons name={activity.icon as any} size={20} color={activity.color} />
              <Text style={[styles.activityText, { color: theme.colors.text }]}>{activity.message}</Text>
              <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>{activity.time}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>No recent activity</Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
              Activity will appear here once you start engaging with the platform.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  title: {
    ...Typography.headerMedium,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  activityText: {
    flex: 1,
    ...Typography.body,
    marginLeft: 12,
  },
  activityTime: {
    ...Typography.label,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    ...Typography.headerSmall,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    ...Typography.body,
    textAlign: 'center',
  },
});
