import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ConnectionRequest } from '../types/network.types';
import { getRelativeTime } from '../utils/collaborationUtils';
import * as Haptics from 'expo-haptics';

interface ConnectionRequestCardProps {
  request: ConnectionRequest;
  onAccept?: (requestId: string) => void;
  onDecline?: (requestId: string) => void;
}

export default function ConnectionRequestCard({
  request,
  onAccept,
  onDecline,
}: ConnectionRequestCardProps) {
  const { theme } = useTheme();

  const handleAccept = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAccept?.(request.id);
  };

  const handleDecline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDecline?.(request.id);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: 'rgba(236, 72, 153, 0.3)',
        },
      ]}
    >
      <View style={styles.content}>
        {/* Avatar */}
        <View style={[styles.avatar, { borderColor: theme.colors.primary }]}>
          {request.from_user.avatar_url ? (
            <Image source={{ uri: request.from_user.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={28} color={theme.colors.textSecondary} />
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={[styles.name, { color: theme.colors.text }]}>
            {request.from_user.display_name}
          </Text>
          {request.from_user.headline && (
            <Text
              style={[styles.headline, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {request.from_user.headline}
            </Text>
          )}

          {/* Message Preview */}
          {request.message && (
            <View
              style={[
                styles.messagePreview,
                {
                  backgroundColor: 'rgba(236, 72, 153, 0.08)',
                  borderLeftColor: theme.colors.primary,
                },
              ]}
            >
              <Text
                style={[styles.messageText, { color: theme.colors.text }]}
                numberOfLines={2}
              >
                "{request.message}"
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleAccept}
        >
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.declineButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={handleDecline}
        >
          <Text style={[styles.declineText, { color: theme.colors.textSecondary }]}>Decline</Text>
        </TouchableOpacity>
      </View>

      {/* Timestamp */}
      <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
        {getRelativeTime(request.created_at)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    marginBottom: 8,
  },
  messagePreview: {
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 10,
    marginTop: 4,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  declineButton: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  declineText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 8,
  },
});

