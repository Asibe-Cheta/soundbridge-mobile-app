import React from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';

export default function ThemeSettingsScreen() {
  const navigation = useNavigation();
  const { theme, themeMode, setThemeMode } = useTheme();

  const themeOptions: { mode: ThemeMode; title: string; description: string; icon: string }[] = [
    {
      mode: 'light',
      title: 'Light Mode',
      description: 'Clean and bright interface',
      icon: 'sunny',
    },
    {
      mode: 'dark',
      title: 'Dark Mode',
      description: 'Easy on the eyes',
      icon: 'moon',
    },
    {
      mode: 'system',
      title: 'System Default',
      description: 'Follow device settings',
      icon: 'phone-portrait',
    },
  ];

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
        <StatusBar 
          barStyle={theme.isDark ? "light-content" : "dark-content"} 
          backgroundColor="transparent" 
          translucent
        />
        
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Theme</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Current Theme Preview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Current Theme</Text>
          <View style={[styles.previewCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.previewHeader}>
              <View style={[styles.previewAvatar, { backgroundColor: '#DC2626' }]}>
                <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.previewInfo}>
                <Text style={[styles.previewTitle, { color: theme.colors.text }]}>SoundBridge</Text>
                <Text style={[styles.previewSubtitle, { color: theme.colors.textSecondary }]}>
                  {themeMode === 'system' ? 'Following system' : themeMode === 'dark' ? 'Dark theme active' : 'Light theme active'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Theme Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Choose Theme</Text>
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.mode}
              style={[
                styles.optionRow,
                { 
                  backgroundColor: theme.colors.surface,
                  borderColor: themeMode === option.mode ? '#DC2626' : theme.colors.border,
                  borderWidth: themeMode === option.mode ? 2 : 1,
                }
              ]}
              onPress={() => setThemeMode(option.mode)}
            >
              <View style={styles.optionInfo}>
                <View style={[
                  styles.optionIcon,
                  { 
                    backgroundColor: themeMode === option.mode ? '#DC2626' : theme.colors.card,
                  }
                ]}>
                  <Ionicons 
                    name={option.icon as any} 
                    size={24} 
                    color={themeMode === option.mode ? '#FFFFFF' : theme.colors.text} 
                  />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                    {option.description}
                  </Text>
                </View>
              </View>
              {themeMode === option.mode && (
                <Ionicons name="checkmark-circle" size={24} color="#DC2626" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Theme Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About Themes</Text>
          
          <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="information-circle" size={24} color="#DC2626" />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Automatic Switching</Text>
              <Text style={[styles.infoDescription, { color: theme.colors.textSecondary }]}>
                System Default automatically switches between light and dark themes based on your device settings.
              </Text>
            </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="eye" size={24} color="#4CAF50" />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Better Experience</Text>
              <Text style={[styles.infoDescription, { color: theme.colors.textSecondary }]}>
                Dark mode reduces eye strain in low-light environments and can help save battery on OLED displays.
              </Text>
            </View>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  previewCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});