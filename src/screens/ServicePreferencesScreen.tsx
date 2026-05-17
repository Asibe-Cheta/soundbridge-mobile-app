import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';
import { SystemTypography as Typography } from '../constants/Typography';
import {
  serviceDiscoveryService,
  ServiceDiscoveryPreferences,
  DEFAULT_SERVICE_PREFS,
  DISTANCE_OPTIONS,
  DISTANCE_OPTION_LABELS,
  NATIONWIDE_KM,
  SERVICE_CATEGORY_OPTIONS,
} from '../services/ServiceDiscoveryService';
import type { ServiceCategory } from '../types';

export default function ServicePreferencesScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<ServiceDiscoveryPreferences>(DEFAULT_SERVICE_PREFS);
  const [minBudgetText, setMinBudgetText] = useState('');
  const [maxBudgetText, setMaxBudgetText] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    serviceDiscoveryService.getServicePreferences(user.id).then((saved) => {
      const resolved = saved ?? DEFAULT_SERVICE_PREFS;
      setPrefs(resolved);
      setMinBudgetText(resolved.min_budget != null ? String(resolved.min_budget) : '');
      setMaxBudgetText(resolved.max_budget != null ? String(resolved.max_budget) : '');
      setLoading(false);
    });
  }, [user?.id]);

  const toggleCategory = useCallback((cat: ServiceCategory) => {
    setPrefs((p) => {
      const current = p.service_categories ?? [];
      const next = current.includes(cat)
        ? current.filter((c) => c !== cat)
        : [...current, cat];
      return { ...p, service_categories: next.length > 0 ? next : null };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    const minBudget = minBudgetText ? parseFloat(minBudgetText) : null;
    const maxBudget = maxBudgetText ? parseFloat(maxBudgetText) : null;
    const finalPrefs: ServiceDiscoveryPreferences = {
      ...prefs,
      min_budget: minBudget != null && !isNaN(minBudget) ? minBudget : null,
      max_budget: maxBudget != null && !isNaN(maxBudget) ? maxBudget : null,
    };
    const ok = await serviceDiscoveryService.saveServicePreferences(user.id, finalPrefs);
    setSaving(false);
    if (ok) {
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    }
  }, [prefs, minBudgetText, maxBudgetText, user?.id, navigation]);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      color: theme.colors.text,
    },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient
          colors={[
            theme.colors.backgroundGradient.start,
            theme.colors.backgroundGradient.middle,
            theme.colors.backgroundGradient.end,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.backgroundGradient.start,
          theme.colors.backgroundGradient.middle,
          theme.colors.backgroundGradient.end,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Service Preferences</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={[styles.saveLabel, { color: theme.colors.primary }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >

            {/* Notifications toggle */}
            <View style={styles.section}>
              <View style={[styles.row, { backgroundColor: theme.colors.surface }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: theme.colors.text }]}>
                    Service notifications
                  </Text>
                  <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                    Get notified when new providers match your preferences
                  </Text>
                </View>
                <Switch
                  value={prefs.notifications_enabled}
                  onValueChange={(v) => setPrefs((p) => ({ ...p, notifications_enabled: v }))}
                  trackColor={{ false: theme.colors.border, true: '#DC2626' }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* Location radius */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                LOCATION RADIUS
              </Text>
              <View style={styles.chipRow}>
                {DISTANCE_OPTIONS.map((km) => {
                  const selected = prefs.max_distance_km === km;
                  return (
                    <TouchableOpacity
                      key={km}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? '#DC2626'
                            : theme.colors.surface,
                          borderColor: selected ? '#DC2626' : theme.colors.border,
                        },
                      ]}
                      onPress={() => setPrefs((p) => ({ ...p, max_distance_km: km }))}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? '#fff' : theme.colors.text },
                        ]}
                      >
                        {DISTANCE_OPTION_LABELS[km]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Budget range */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                BUDGET RANGE (PER HOUR)
              </Text>
              <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
                Leave blank to see all budgets
              </Text>
              <View style={styles.budgetRow}>
                <TextInput
                  style={[inputStyle, styles.budgetInput]}
                  placeholder="Min (£)"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={minBudgetText}
                  onChangeText={setMinBudgetText}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
                <Text style={[styles.budgetSep, { color: theme.colors.textSecondary }]}>to</Text>
                <TextInput
                  style={[inputStyle, styles.budgetInput]}
                  placeholder="Max (£)"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={maxBudgetText}
                  onChangeText={setMaxBudgetText}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Service categories */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                SERVICE CATEGORIES
              </Text>
              <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
                Select one or more. Leave all unselected to see every category.
              </Text>
              <View style={styles.chipRow}>
                {SERVICE_CATEGORY_OPTIONS.map(({ value, label }) => {
                  const selected = (prefs.service_categories ?? []).includes(value);
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? '#DC2626'
                            : theme.colors.surface,
                          borderColor: selected ? '#DC2626' : theme.colors.border,
                        },
                      ]}
                      onPress={() => toggleCategory(value)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? '#fff' : theme.colors.text },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Save button */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save & Apply Filters</Text>
                )}
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
  },
  saveButton: { padding: 4 },
  saveLabel: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 15,
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingBottom: 56,
    paddingTop: 8,
  },

  section: {
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: Typography.label?.fontFamily ?? Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionHint: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 12,
    letterSpacing: -0.4,
    marginBottom: 12,
    marginLeft: 4,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 12,
  },
  rowLabel: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 15,
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  rowSub: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 12,
    letterSpacing: -0.4,
    lineHeight: 17,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 13,
    letterSpacing: -0.4,
  },

  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  budgetInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    fontFamily: Typography.body.fontFamily,
  },
  budgetSep: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 13,
    letterSpacing: -0.4,
  },
  input: {},

  primaryButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 15,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    fontSize: 15,
    letterSpacing: -0.4,
    color: '#fff',
  },
});
