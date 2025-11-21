/**
 * Participant Options Modal
 * Host controls for managing participants (promote, demote, remove)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { LiveSessionParticipant } from '../../types/liveSession';

interface ParticipantOptionsModalProps {
  visible: boolean;
  participant: LiveSessionParticipant | null;
  isHost: boolean;
  onClose: () => void;
  onPromoteToSpeaker: (participant: LiveSessionParticipant) => void;
  onDemoteToListener: (participant: LiveSessionParticipant) => void;
  onRemoveParticipant: (participant: LiveSessionParticipant) => void;
}

export default function ParticipantOptionsModal({
  visible,
  participant,
  isHost,
  onClose,
  onPromoteToSpeaker,
  onDemoteToListener,
  onRemoveParticipant,
}: ParticipantOptionsModalProps) {
  const { theme } = useTheme();

  if (!participant) return null;

  const isSpeaker = participant.role === 'speaker';
  const isListener = participant.role === 'listener';
  const isHostRole = participant.role === 'host';

  const handlePromote = () => {
    Alert.alert(
      'Promote to Speaker',
      `Allow ${participant.user?.display_name} to speak?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: () => {
            onPromoteToSpeaker(participant);
            onClose();
          },
        },
      ]
    );
  };

  const handleDemote = () => {
    Alert.alert(
      'Demote to Listener',
      `Remove ${participant.user?.display_name}'s speaking privileges?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Demote',
          style: 'destructive',
          onPress: () => {
            onDemoteToListener(participant);
            onClose();
          },
        },
      ]
    );
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Participant',
      `Remove ${participant.user?.display_name} from the session?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onRemoveParticipant(participant);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
          {/* Participant Info */}
          <View style={styles.participantInfo}>
            {participant.user?.avatar_url ? (
              <Image
                source={{ uri: participant.user.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.defaultAvatar, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="person" size={32} color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.participantDetails}>
              <Text style={[styles.participantName, { color: theme.colors.text }]}>
                {participant.user?.display_name || 'Unknown'}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(participant.role) }]}>
                <Ionicons
                  name={getRoleBadgeIcon(participant.role)}
                  size={12}
                  color="#FFFFFF"
                />
                <Text style={styles.roleBadgeText}>{getRoleLabel(participant.role)}</Text>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          {/* Options */}
          <View style={styles.options}>
            {isHost && !isHostRole && (
              <>
                {/* Promote to Speaker */}
                {isListener && (
                  <TouchableOpacity
                    style={[styles.option, { borderBottomColor: theme.colors.border }]}
                    onPress={handlePromote}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                      <Ionicons name="mic" size={20} color="#3B82F6" />
                    </View>
                    <Text style={[styles.optionText, { color: theme.colors.text }]}>
                      Promote to Speaker
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}

                {/* Demote to Listener */}
                {isSpeaker && (
                  <TouchableOpacity
                    style={[styles.option, { borderBottomColor: theme.colors.border }]}
                    onPress={handleDemote}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                      <Ionicons name="arrow-down" size={20} color="#F59E0B" />
                    </View>
                    <Text style={[styles.optionText, { color: theme.colors.text }]}>
                      Demote to Listener
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}

                {/* Remove from Session */}
                <TouchableOpacity
                  style={styles.option}
                  onPress={handleRemove}
                >
                  <View style={[styles.optionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </View>
                  <Text style={[styles.optionText, { color: '#EF4444' }]}>
                    Remove from Session
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </>
            )}

            {/* Non-host or viewing host profile */}
            {(!isHost || isHostRole) && (
              <View style={styles.emptyState}>
                <Ionicons name="information-circle-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                  {isHostRole
                    ? 'This is the session host'
                    : 'You need host permissions to manage participants'}
                </Text>
              </View>
            )}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: theme.colors.surface }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'host':
      return '#DC2626';
    case 'speaker':
      return '#3B82F6';
    case 'listener':
      return '#6B7280';
    default:
      return '#6B7280';
  }
}

function getRoleBadgeIcon(role: string) {
  switch (role) {
    case 'host':
      return 'star';
    case 'speaker':
      return 'mic';
    case 'listener':
      return 'headset';
    default:
      return 'person';
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'host':
      return 'Host';
    case 'speaker':
      return 'Speaker';
    case 'listener':
      return 'Listener';
    default:
      return 'Unknown';
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  defaultAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
  },
  options: {
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

