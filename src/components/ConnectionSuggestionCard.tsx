import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ConnectionSuggestion } from '../types/network.types';
import * as Haptics from 'expo-haptics';

interface ConnectionSuggestionCardProps {
  suggestion: ConnectionSuggestion;
  onConnect?: (suggestionId: string) => void;
  onRemove?: (suggestionId: string) => void;
}

export default function ConnectionSuggestionCard({
  suggestion,
  onConnect,
  onRemove,
}: ConnectionSuggestionCardProps) {
  const { theme } = useTheme();

  const handleConnect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onConnect?.(suggestion.id);
  };

  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemove?.(suggestion.id);
  };

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
      <View style={styles.content}>
        {/* Avatar */}
        <View style={[styles.avatar, { borderColor: theme.colors.border }]}>
          {suggestion.avatar_url ? (
            <Image source={{ uri: suggestion.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={28} color={theme.colors.textSecondary} />
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={[styles.name, { color: theme.colors.text }]}>
            {suggestion.display_name}
          </Text>
          {suggestion.headline && (
            <Text
              style={[styles.headline, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {suggestion.headline}
            </Text>
          )}

          {/* Mutual Connections */}
          <View style={styles.mutualConnections}>
            <Ionicons name="people" size={12} color={theme.colors.primary} />
            <Text style={[styles.mutualText, { color: theme.colors.primary }]}>
              {suggestion.mutual_connections} mutual connections
            </Text>
          </View>

          {/* Reason Tag */}
          {suggestion.reason && (
            <View
              style={[
                styles.reasonTag,
                {
                  backgroundColor: 'rgba(236, 72, 153, 0.1)',
                  borderColor: 'rgba(236, 72, 153, 0.2)',
                },
              ]}
            >
              <Text style={[styles.reasonText, { color: theme.colors.primary }]}>
                {suggestion.reason}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.connectButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleConnect}
        >
          <Text style={styles.connectText}>Connect</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.removeButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={handleRemove}
        >
          <Text style={[styles.removeText, { color: theme.colors.textSecondary }]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  headline: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 4,
  },
  mutualConnections: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  mutualText: {
    fontSize: 12,
    fontWeight: '400',
  },
  reasonTag: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  reasonText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  connectButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  removeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  removeText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

