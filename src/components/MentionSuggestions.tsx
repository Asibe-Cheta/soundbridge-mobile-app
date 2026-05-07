import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';
import type { MentionUser } from '../hooks/useMentions';

interface Props {
  suggestions: MentionUser[];
  loading: boolean;
  selectedIndex: number;
  onSelect: (user: MentionUser) => void;
  onDismiss: () => void;
}

export function MentionSuggestions({
  suggestions,
  loading,
  selectedIndex,
  onSelect,
  onDismiss,
}: Props) {
  const { theme } = useTheme();

  if (!loading && suggestions.length === 0) return null;

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
      {loading && suggestions.length === 0 ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Searching…
          </Text>
        </View>
      ) : (
        suggestions.map((user, index) => (
          <TouchableOpacity
            key={user.id}
            style={[
              styles.row,
              index === selectedIndex && {
                backgroundColor: `${theme.colors.primary}18`,
              },
              index < suggestions.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.border,
              },
            ]}
            onPress={() => onSelect(user)}
            activeOpacity={0.75}
          >
            <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
              ) : (
                <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
              )}
            </View>
            <View style={styles.userInfo}>
              <Text
                style={[styles.displayName, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {user.display_name || user.username}
              </Text>
              <Text
                style={[styles.username, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                @{user.username}
              </Text>
            </View>
            {index === selectedIndex && (
              <Ionicons
                name="return-down-back-outline"
                size={14}
                color={theme.colors.textSecondary}
              />
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  loadingText: {
    ...Typography.label,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    ...Typography.button,
    fontSize: 14,
  },
  username: {
    ...Typography.label,
    fontSize: 12,
    marginTop: 1,
  },
});
