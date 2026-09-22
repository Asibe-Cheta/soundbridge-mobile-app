import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

export default function EventCreatedSuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { eventId, eventTitle } = (route.params as { eventId?: string; eventTitle?: string }) || {};

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: `${theme.colors.success}18`, borderColor: `${theme.colors.success}40` },
            ]}
          >
            <Ionicons name="checkmark" size={48} color={theme.colors.success} />
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]}>Event Created!</Text>

          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            {eventTitle ? `"${eventTitle}" has` : 'Your event has'} successfully been created and
            is now being promoted by us.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => (navigation as any).replace('EventPromotionReach', { eventId, eventTitle })}
          >
            <LinearGradient
              colors={[theme.colors.gradientPrimary.start, theme.colors.gradientPrimary.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>See your event performance</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={[styles.doneBtnText, { color: theme.colors.textSecondary }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 36,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  doneBtn: {
    marginTop: 20,
    paddingVertical: 10,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
