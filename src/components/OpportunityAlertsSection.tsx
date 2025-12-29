import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getRelativeTime } from '../utils/collaborationUtils';
import * as Haptics from 'expo-haptics';

interface OpportunityAlert {
  id: string;
  user_id: string;
  keywords: string[];
  categories: string[];
  location: string | null;
  enabled: boolean;
  created_from_opportunity_id: string | null;
  created_at: string;
  updated_at: string | null;
}

const CATEGORY_OPTIONS = [
  { id: 'collaboration', label: 'Collaboration', icon: 'people' as const },
  { id: 'event', label: 'Event', icon: 'calendar' as const },
  { id: 'job', label: 'Job', icon: 'briefcase' as const },
];

export default function OpportunityAlertsSection() {
  const { theme } = useTheme();
  const { userProfile } = useAuth();
  const [alerts, setAlerts] = useState<OpportunityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create form state
  const [keywords, setKeywords] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [creating, setCreating] = useState(false);

  // Check if user is a subscriber
  const isSubscriber = userProfile?.subscription_tier !== 'free';

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual database query
      // const { data, error } = await supabase
      //   .from('opportunity_alerts')
      //   .select('*')
      //   .eq('user_id', user?.id)
      //   .order('created_at', { ascending: false });

      // Mock data for now
      setAlerts([]);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAlert = async (alertId: string, currentState: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // TODO: Update database
      // await supabase
      //   .from('opportunity_alerts')
      //   .update({ enabled: !currentState })
      //   .eq('id', alertId);

      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, enabled: !currentState } : alert
        )
      );
    } catch (error) {
      console.error('Failed to toggle alert:', error);
      Alert.alert('Error', 'Failed to update alert. Please try again.');
    }
  };

  const handleDeleteAlert = (alertId: string) => {
    Alert.alert(
      'Delete Alert',
      'Are you sure you want to delete this alert? You won\'t receive notifications for matching opportunities.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              // TODO: Delete from database
              // await supabase
              //   .from('opportunity_alerts')
              //   .delete()
              //   .eq('id', alertId);

              setAlerts(prev => prev.filter(alert => alert.id !== alertId));
            } catch (error) {
              console.error('Failed to delete alert:', error);
              Alert.alert('Error', 'Failed to delete alert. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleToggleCategory = (categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleCreateAlert = async () => {
    if (keywords.trim().length === 0 && selectedCategories.length === 0) {
      Alert.alert('Add Criteria', 'Please add at least keywords or select categories.');
      return;
    }

    try {
      setCreating(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Parse keywords (comma or space separated)
      const keywordArray = keywords
        .split(/[,\s]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0);

      // TODO: Insert into database
      // const { data, error } = await supabase
      //   .from('opportunity_alerts')
      //   .insert({
      //     user_id: user.id,
      //     keywords: keywordArray,
      //     categories: selectedCategories,
      //     location: location.trim() || null,
      //     enabled: true,
      //   })
      //   .select()
      //   .single();

      // Mock success
      const newAlert: OpportunityAlert = {
        id: Date.now().toString(),
        user_id: userProfile!.id,
        keywords: keywordArray,
        categories: selectedCategories,
        location: location.trim() || null,
        enabled: true,
        created_from_opportunity_id: null,
        created_at: new Date().toISOString(),
        updated_at: null,
      };

      setAlerts(prev => [newAlert, ...prev]);

      // Reset form
      setKeywords('');
      setSelectedCategories([]);
      setLocation('');
      setShowCreateForm(false);

      Alert.alert('Alert Created!', 'You\'ll be notified when matching opportunities are posted.');
    } catch (error) {
      console.error('Failed to create alert:', error);
      Alert.alert('Error', 'Failed to create alert. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (!isSubscriber) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Opportunity Alerts
          </Text>
        </View>
        <View style={styles.upgradePrompt}>
          <View style={[styles.upgradeIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name="notifications-off" size={32} color={theme.colors.primary} />
          </View>
          <Text style={[styles.upgradeTitle, { color: theme.colors.text }]}>
            Premium Feature
          </Text>
          <Text style={[styles.upgradeSubtitle, { color: theme.colors.textSecondary }]}>
            Upgrade to Premium or Unlimited to get alerts when opportunities matching your preferences are posted
          </Text>
          <TouchableOpacity style={[styles.upgradeButton, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Opportunity Alerts
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Opportunity Alerts
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowCreateForm(!showCreateForm)}
        >
          <Ionicons name={showCreateForm ? 'close' : 'add'} size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Create Form */}
        {showCreateForm && (
          <View style={[styles.createForm, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.formTitle, { color: theme.colors.text }]}>
              Create New Alert
            </Text>

            {/* Keywords */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Keywords
              </Text>
              <Text style={[styles.formHint, { color: theme.colors.textSecondary }]}>
                Separate with commas (e.g., gospel, vocalist, UK)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="e.g., gospel, vocalist, worship"
                placeholderTextColor={theme.colors.textSecondary}
                value={keywords}
                onChangeText={setKeywords}
              />
            </View>

            {/* Categories */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Categories
              </Text>
              <View style={styles.categoriesContainer}>
                {CATEGORY_OPTIONS.map((category) => {
                  const isSelected = selectedCategories.includes(category.id);
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => handleToggleCategory(category.id)}
                    >
                      <Ionicons
                        name={category.icon}
                        size={16}
                        color={isSelected ? '#FFFFFF' : theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.categoryLabel,
                          { color: isSelected ? '#FFFFFF' : theme.colors.text },
                        ]}
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Location */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Location (optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="e.g., Lagos, London, Remote"
                placeholderTextColor={theme.colors.textSecondary}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={[
                styles.createButton,
                { backgroundColor: theme.colors.primary },
                creating && styles.createButtonDisabled,
              ]}
              onPress={handleCreateAlert}
              disabled={creating}
            >
              <Text style={styles.createButtonText}>
                {creating ? 'Creating...' : 'Create Alert'}
              </Text>
              {!creating && <Ionicons name="notifications" size={16} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        )}

        {/* Alert List */}
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No alerts yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Create an alert to get notified when opportunities matching your preferences are posted
            </Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <View
              key={alert.id}
              style={[
                styles.alertCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  opacity: alert.enabled ? 1 : 0.6,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.alertHeader}>
                <View style={styles.alertTitleRow}>
                  <Ionicons
                    name={alert.enabled ? 'notifications' : 'notifications-off'}
                    size={20}
                    color={alert.enabled ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[styles.alertStatus, { color: theme.colors.text }]}>
                    {alert.enabled ? 'Active' : 'Paused'}
                  </Text>
                </View>
                <Switch
                  value={alert.enabled}
                  onValueChange={() => handleToggleAlert(alert.id, alert.enabled)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Keywords */}
              {alert.keywords.length > 0 && (
                <View style={styles.alertSection}>
                  <Text style={[styles.alertSectionLabel, { color: theme.colors.textSecondary }]}>
                    Keywords:
                  </Text>
                  <View style={styles.tagsContainer}>
                    {alert.keywords.map((keyword, index) => (
                      <View
                        key={index}
                        style={[styles.tag, { backgroundColor: theme.colors.primary + '20' }]}
                      >
                        <Text style={[styles.tagText, { color: theme.colors.primary }]}>
                          {keyword}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Categories */}
              {alert.categories.length > 0 && (
                <View style={styles.alertSection}>
                  <Text style={[styles.alertSectionLabel, { color: theme.colors.textSecondary }]}>
                    Categories:
                  </Text>
                  <View style={styles.tagsContainer}>
                    {alert.categories.map((category, index) => (
                      <View
                        key={index}
                        style={[styles.tag, { backgroundColor: theme.colors.card }]}
                      >
                        <Text style={[styles.tagText, { color: theme.colors.text }]}>
                          {category}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Location */}
              {alert.location && (
                <View style={styles.alertSection}>
                  <Ionicons name="location" size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.alertLocation, { color: theme.colors.textSecondary }]}>
                    {alert.location}
                  </Text>
                </View>
              )}

              {/* Footer */}
              <View style={styles.alertFooter}>
                <Text style={[styles.alertTimestamp, { color: theme.colors.textSecondary }]}>
                  Created {getRelativeTime(alert.created_at)}
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteAlert(alert.id)}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                  <Text style={[styles.deleteText, { color: theme.colors.error }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  upgradePrompt: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  upgradeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  upgradeSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
    marginBottom: 24,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    maxHeight: 600,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  createForm: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  formHint: {
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  alertCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertStatus: {
    fontSize: 15,
    fontWeight: '600',
  },
  alertSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  alertSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertLocation: {
    fontSize: 12,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
  },
  alertTimestamp: {
    fontSize: 11,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
