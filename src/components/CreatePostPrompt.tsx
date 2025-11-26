import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface CreatePostPromptProps {
  onPress: () => void;
}

export default function CreatePostPrompt({ onPress }: CreatePostPromptProps) {
  const { theme } = useTheme();
  const { userProfile } = useAuth();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['rgba(236, 72, 153, 0.08)', 'rgba(220, 38, 38, 0.06)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradientContainer,
          {
            borderColor: 'rgba(236, 72, 153, 0.2)',
          },
        ]}
      >
        {/* Avatar Section */}
        <View
          style={[
            styles.avatarContainer,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          {userProfile?.avatar_url ? (
            <Image source={{ uri: userProfile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={22} color={theme.colors.textSecondary} />
          )}
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Input Prompt Text */}
          <Text style={[styles.promptText, { color: theme.colors.textSecondary }]}>
            Share an update, opportunity, or achievement...
          </Text>

          {/* Media Icons Row */}
          <View style={styles.mediaIconsRow}>
            <View style={styles.mediaIconContainer}>
              <Ionicons name="image-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.mediaLabel, { color: theme.colors.textSecondary }]}>
                Photo
              </Text>
            </View>
            <View style={styles.mediaIconContainer}>
              <Ionicons name="musical-notes-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.mediaLabel, { color: theme.colors.textSecondary }]}>
                Audio
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  gradientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    overflow: 'hidden', // Ensure image is clipped to circular shape
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  contentSection: {
    flex: 1,
  },
  promptText: {
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 8,
  },
  mediaIconsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  mediaIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mediaLabel: {
    fontSize: 12,
    marginLeft: 4,
  },
});

