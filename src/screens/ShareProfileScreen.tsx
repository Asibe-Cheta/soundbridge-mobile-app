import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';
import { SystemTypography as Typography } from '../constants/Typography';
import { deepLinkingService } from '../services/DeepLinkingService';

export default function ShareProfileScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user, userProfile } = useAuth();

  const profileLink = useMemo(() => {
    if (userProfile?.username) {
      return deepLinkingService.generateProfileLink(userProfile.username);
    }
    if (user?.id) {
      return deepLinkingService.generateProfileUrl(user.id);
    }
    return '';
  }, [user?.id, userProfile?.username]);

  const displayName = userProfile?.display_name || userProfile?.username || 'your profile';

  const handleShare = async () => {
    if (!profileLink) {
      return;
    }
    try {
      await Share.share({
        message: `Check out ${displayName} on SoundBridge:\n${profileLink}`,
        url: profileLink,
      });
    } catch (error) {
      console.error('ShareProfileScreen: Failed to share profile', error);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Share Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="share-social-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Your public profile link</Text>
            </View>
            <Text style={[styles.linkText, { color: theme.colors.textSecondary }]}>
              {profileLink || 'We could not generate a link for your profile.'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.shareButton,
              {
                backgroundColor: profileLink ? theme.colors.primary : theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: profileLink ? 1 : 0.6,
              },
            ]}
            onPress={handleShare}
            disabled={!profileLink}
          >
            <Ionicons name="share-outline" size={18} color={profileLink ? '#FFFFFF' : theme.colors.textSecondary} />
            <Text
              style={[
                styles.shareButtonText,
                { color: profileLink ? '#FFFFFF' : theme.colors.textSecondary },
              ]}
            >
              Share Profile
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  linkText: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  shareButtonText: {
    ...Typography.button,
    fontSize: 16,
    lineHeight: 20,
  },
});
