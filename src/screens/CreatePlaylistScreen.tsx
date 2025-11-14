import React, { useState } from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function CreatePlaylistScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Playlist name is required');
      return false;
    }
    if (name.length > 255) {
      Alert.alert('Error', 'Playlist name must be 255 characters or less');
      return false;
    }
    if (description.length > 5000) {
      Alert.alert('Error', 'Description must be 5000 characters or less');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Get session for Bearer token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      // Prepare request body according to API spec
      const playlistData: any = {
        name: name.trim(),
        is_public: isPublic,
      };

      // Add optional description only if it has a value
      if (description.trim()) {
        playlistData.description = description.trim();
      }

      // Call API endpoint
      const response = await fetch('https://www.soundbridge.live/api/playlists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playlistData),
      });

      const result = await response.json();

      if (!response.ok) {
        // Extract error message from API response
        const errorMessage = result.error || result.message || `HTTP ${response.status}: Failed to create playlist`;
        throw new Error(errorMessage);
      }

      Alert.alert(
        'Success!',
        'Playlist created successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating playlist:', error);
      const errorMessage = error?.message || 'Failed to create playlist. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Background Gradient - Uses theme colors */}
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} style={styles.headerButton} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Create Playlist</Text>
          <TouchableOpacity 
            style={[styles.headerButton, { opacity: loading ? 0.5 : 1 }]} 
            onPress={handleCreate}
            disabled={loading}
          >
            <Text style={[styles.headerButtonText, { color: theme.colors.primary }]}>
              {loading ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.contentContainer}>
            {/* Playlist Name */}
            <View style={styles.inputSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Playlist Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Enter playlist name"
                placeholderTextColor={theme.colors.textSecondary}
                value={name}
                onChangeText={setName}
                maxLength={255}
                autoFocus
              />
              <Text style={[styles.characterCount, { color: theme.colors.textMuted }]}>
                {name.length}/255 characters
              </Text>
            </View>

            {/* Description */}
            <View style={styles.inputSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Description (Optional)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Describe your playlist..."
                placeholderTextColor={theme.colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={5000}
              />
              <Text style={[styles.characterCount, { color: theme.colors.textMuted }]}>
                {description.length}/5000 characters
              </Text>
            </View>

            {/* Privacy Setting */}
            <View style={styles.inputSection}>
              <View style={[styles.privacyContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.privacyInfo}>
                  <Ionicons 
                    name={isPublic ? 'globe' : 'lock-closed'} 
                    size={24} 
                    color={isPublic ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <View style={styles.privacyTextContainer}>
                    <Text style={[styles.privacyTitle, { color: theme.colors.text }]}>
                      {isPublic ? 'Public Playlist' : 'Private Playlist'}
                    </Text>
                    <Text style={[styles.privacyDescription, { color: theme.colors.textSecondary }]}>
                      {isPublic 
                        ? 'Anyone can find and listen to this playlist' 
                        : 'Only you can see and listen to this playlist'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
                  thumbColor={isPublic ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>
            </View>

            {/* Info Section */}
            <View style={[styles.infoSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                You can add tracks to your playlist after creating it. You'll be able to search and add tracks from the playlist details screen.
              </Text>
            </View>
          </View>
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
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    padding: 16,
  },
  inputSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  privacyTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoSection: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
  },
});

