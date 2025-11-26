import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Connection } from '../types/network.types';
import { getRelativeTime } from '../utils/collaborationUtils';
import * as Haptics from 'expo-haptics';

interface ConnectionCardProps {
  connection: Connection;
  onPress?: (connectionId: string) => void;
  onMessage?: (connectionId: string) => void;
}

export default function ConnectionCard({ connection, onPress, onMessage }: ConnectionCardProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(connection.user.id);
  };

  const handleMessage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMessage?.(connection.user.id);
  };

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
      {/* Avatar */}
      <View style={[styles.avatar, { borderColor: theme.colors.border }]}>
        {connection.user.avatar_url ? (
          <Image source={{ uri: connection.user.avatar_url }} style={styles.avatarImage} />
        ) : (
          <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.colors.text }]}>
          {connection.user.display_name}
        </Text>
        {connection.user.headline && (
          <Text
            style={[styles.headline, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {connection.user.headline}
          </Text>
        )}
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
          Connected {getRelativeTime(connection.connected_at)}
        </Text>
      </View>

      {/* Message Button */}
      <TouchableOpacity
        style={[
          styles.messageButton,
          {
            backgroundColor: theme.colors.surface,
          },
        ]}
        onPress={handleMessage}
      >
        <Ionicons name="chatbubble-outline" size={20} color={theme.colors.text} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  headline: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 2,
  },
  date: {
    fontSize: 11,
    fontWeight: '400',
  },
  messageButton: {
    padding: 8,
    borderRadius: 8,
  },
});

