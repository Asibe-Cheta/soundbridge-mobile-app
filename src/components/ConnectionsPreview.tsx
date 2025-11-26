import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { Connection } from '../types/network.types';
import * as Haptics from 'expo-haptics';

interface ConnectionsPreviewProps {
  connections: Connection[];
  totalCount: number;
}

export default function ConnectionsPreview({ connections, totalCount }: ConnectionsPreviewProps) {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Network' as never);
  };

  const displayedConnections = connections.slice(0, 4);
  const remainingCount = totalCount - displayedConnections.length;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Connections</Text>
        <View style={styles.countRow}>
          <Text style={[styles.count, { color: theme.colors.primary }]}>{totalCount}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
        </View>
      </View>

      <View style={styles.avatarsRow}>
        {displayedConnections.map((connection, index) => (
          <View
            key={connection.id}
            style={[
              styles.avatarContainer,
              {
                zIndex: displayedConnections.length - index,
                borderColor: theme.colors.card,
              },
            ]}
          >
            {connection.user.avatar_url ? (
              <Image
                source={{ uri: connection.user.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
              </View>
            )}
          </View>
        ))}
        {remainingCount > 0 && (
          <View
            style={[
              styles.moreBadge,
              {
                backgroundColor: theme.colors.primary,
                borderColor: theme.colors.card,
              },
            ]}
          >
            <Text style={styles.moreText}>+{remainingCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  count: {
    fontSize: 15,
    fontWeight: '600',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginLeft: -8,
    borderWidth: 3,
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  moreText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

