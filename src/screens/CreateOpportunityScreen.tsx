import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { GooglePlacesAutocomplete, GooglePlaceData, GooglePlaceDetail } from 'react-native-google-places-autocomplete';
import { useTheme } from '../contexts/ThemeContext';
import { opportunityService } from '../services/OpportunityService';
import { SystemTypography as Typography } from '../constants/Typography';
import { config } from '../config/environment';
import * as Haptics from 'expo-haptics';
import BackButton from '../components/BackButton';

const TYPE_OPTIONS = [
  { value: 'collaboration', label: 'Collaboration', icon: 'people', description: 'Find someone to create with' },
  { value: 'event', label: 'Event Slot', icon: 'musical-notes', description: 'Fill a performance or event role' },
  { value: 'job', label: 'Job / Session', icon: 'briefcase', description: 'Hire for a paid session or project' },
] as const;

type OpportunityType = 'collaboration' | 'event' | 'job';

export default function CreateOpportunityScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const [type, setType] = useState<OpportunityType>('collaboration');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState('GBP');
  const [visibility, setVisibility] = useState<'public' | 'connections'>('public');
  const [submitting, setSubmitting] = useState(false);

  const addSkill = () => {
    const trimmed = skillInput.trim().toLowerCase();
    if (trimmed && !skills.includes(trimmed) && skills.length < 10) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    if (!title.trim() || title.trim().length < 5) {
      Alert.alert('Title Required', 'Title must be at least 5 characters.');
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      const chars = description.trim().length;
      const needed = 20 - chars;
      Alert.alert(
        'Description Too Short',
        chars === 0
          ? 'Please add a description for your opportunity.'
          : `Your description is ${chars} characters — add ${needed} more to continue.`
      );
      return;
    }

    try {
      setSubmitting(true);

      await opportunityService.createOpportunity({
        type,
        title: title.trim(),
        description: description.trim(),
        skills_needed: skills,
        location: location.trim() || undefined,
        is_remote: isRemote,
        budget_min: budgetMin ? parseFloat(budgetMin) : undefined,
        budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
        budget_currency: budgetCurrency,
        visibility,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Opportunity Posted!',
        'Your opportunity is now live. You\'ll be notified when creators express interest.',
        [{ text: 'Great!', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to post opportunity.');
    } finally {
      setSubmitting(false);
    }
  };

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
        style={StyleSheet.absoluteFillObject}
      />

      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <BackButton />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Post Opportunity</Text>
          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Type */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Type *</Text>
              <View style={styles.typeGrid}>
                {TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.typeCard,
                      {
                        backgroundColor: type === opt.value ? 'rgba(124, 58, 237, 0.15)' : theme.colors.card,
                        borderColor: type === opt.value ? '#7C3AED' : theme.colors.border,
                        borderWidth: type === opt.value ? 2 : 1,
                      },
                    ]}
                    onPress={() => {
                      setType(opt.value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={22}
                      color={type === opt.value ? '#7C3AED' : theme.colors.textSecondary}
                    />
                    <Text style={[styles.typeLabel, { color: type === opt.value ? '#7C3AED' : theme.colors.text }]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.typeDesc, { color: theme.colors.textSecondary }]}>
                      {opt.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Title */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="e.g. Looking for Gospel Vocalist for Worship Album"
                placeholderTextColor={theme.colors.textSecondary}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
              <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
                {title.length}/120 (min 5)
              </Text>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Description *</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="Describe what you're looking for in detail — experience, availability, what the project involves..."
                placeholderTextColor={theme.colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                maxLength={1000}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
                {description.length}/1000 (min 20)
              </Text>
            </View>

            {/* Skills */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Skills Needed</Text>
              <Text style={[styles.sublabel, { color: theme.colors.textSecondary }]}>
                Add skills to improve matching (e.g. vocals, mixing, guitar)
              </Text>
              {skills.length > 0 && (
                <View style={styles.skillTags}>
                  {skills.map((skill) => (
                    <TouchableOpacity
                      key={skill}
                      style={[styles.skillTag, { backgroundColor: 'rgba(124, 58, 237, 0.12)', borderColor: 'rgba(124, 58, 237, 0.3)' }]}
                      onPress={() => removeSkill(skill)}
                    >
                      <Text style={[styles.skillTagText, { color: '#7C3AED' }]}>{skill}</Text>
                      <Ionicons name="close" size={14} color="#7C3AED" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.skillInputRow}>
                <TextInput
                  style={[styles.skillInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="Add a skill..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={skillInput}
                  onChangeText={setSkillInput}
                  onSubmitEditing={addSkill}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.addSkillBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={addSkill}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Location */}
            <View style={[styles.section, { zIndex: 1000 }]}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Location</Text>
              {config.googlePlacesApiKey ? (
                <GooglePlacesAutocomplete
                  placeholder="Search city, venue or area…"
                  onPress={(data: GooglePlaceData, details: GooglePlaceDetail | null = null) => {
                    setLocation(data.description);
                  }}
                  query={{
                    key: config.googlePlacesApiKey,
                    language: 'en',
                    types: '(cities)',
                  }}
                  fetchDetails={false}
                  enablePoweredByContainer={false}
                  debounce={300}
                  minLength={2}
                  onFail={(error) => console.error('❌ Places error:', error)}
                  styles={{
                    container: { flex: 0, zIndex: 1000 },
                    textInputContainer: { backgroundColor: 'transparent' },
                    textInput: {
                      height: 48,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      fontSize: 15,
                      backgroundColor: theme.colors.card,
                      color: theme.colors.text,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    },
                    listView: {
                      backgroundColor: theme.colors.card,
                      borderRadius: 10,
                      marginTop: 4,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      zIndex: 1001,
                      elevation: 5,
                    },
                    row: { backgroundColor: theme.colors.card, padding: 13, minHeight: 44 },
                    separator: { height: 1, backgroundColor: theme.colors.border },
                    description: { color: theme.colors.text, fontSize: 14 },
                    poweredContainer: { display: 'none' },
                  }}
                  textInputProps={{ placeholderTextColor: theme.colors.textSecondary }}
                  listViewDisplayed="auto"
                  disableScroll={true}
                />
              ) : (
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="e.g. Lagos, London, Remote"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={location}
                  onChangeText={setLocation}
                />
              )}
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>Remote / Online only</Text>
                <Switch
                  value={isRemote}
                  onValueChange={setIsRemote}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Budget */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Budget (optional)</Text>
              <View style={styles.budgetRow}>
                <TextInput
                  style={[styles.budgetInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="Min"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={budgetMin}
                  onChangeText={setBudgetMin}
                  keyboardType="decimal-pad"
                />
                <Text style={[styles.budgetSep, { color: theme.colors.textSecondary }]}>–</Text>
                <TextInput
                  style={[styles.budgetInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="Max"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={budgetMax}
                  onChangeText={setBudgetMax}
                  keyboardType="decimal-pad"
                />
                <View style={styles.currencySelector}>
                  {['GBP', 'USD', 'NGN'].map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.currencyOption,
                        {
                          backgroundColor: budgetCurrency === c ? theme.colors.primary : theme.colors.card,
                          borderColor: budgetCurrency === c ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => setBudgetCurrency(c)}
                    >
                      <Text style={[styles.currencyOptionText, { color: budgetCurrency === c ? '#FFFFFF' : theme.colors.text }]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {/* Fee preview — shown once either budget field has a value */}
              {(budgetMin || budgetMax) && (
                <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary, flex: 1 }}>
                    A 15% platform fee applies on the agreed amount. Providers receive 85% upon delivery confirmation.
                  </Text>
                </View>
              )}
            </View>

            {/* Visibility */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Visibility *</Text>
              <View style={styles.visibilityRow}>
                {(['public', 'connections'] as const).map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.visibilityOption,
                      {
                        backgroundColor: visibility === v ? 'rgba(124, 58, 237, 0.12)' : theme.colors.card,
                        borderColor: visibility === v ? '#7C3AED' : theme.colors.border,
                        borderWidth: visibility === v ? 2 : 1,
                      },
                    ]}
                    onPress={() => {
                      setVisibility(v);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons
                      name={v === 'public' ? 'globe-outline' : 'people-outline'}
                      size={20}
                      color={visibility === v ? '#7C3AED' : theme.colors.textSecondary}
                    />
                    <Text style={[styles.visibilityLabel, { color: visibility === v ? '#7C3AED' : theme.colors.text }]}>
                      {v === 'public' ? 'Public' : 'Connections Only'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </ScrollView>

          {/* Footer CTA */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <LinearGradient
                colors={submitting ? ['#666', '#666'] : ['#EC4899', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                <Text style={styles.submitText}>{submitting ? 'Posting...' : 'Post Opportunity'}</Text>
                {!submitting && <Ionicons name="send" size={18} color="#FFFFFF" />}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { ...Typography.headerMedium },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  sublabel: { fontSize: 12, marginBottom: 8 },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14 },
  textArea: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, minHeight: 110 },
  typeGrid: { gap: 10 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  typeLabel: { fontSize: 15, fontWeight: '600', flex: 0 },
  typeDesc: { fontSize: 12, flex: 1 },
  skillInputRow: { flexDirection: 'row', gap: 8 },
  skillInput: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14 },
  addSkillBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  skillTagText: { fontSize: 13, fontWeight: '500' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  toggleLabel: { fontSize: 14, fontWeight: '500' },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  budgetInput: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14 },
  budgetSep: { fontSize: 16, fontWeight: '300' },
  currencySelector: { flexDirection: 'row', gap: 4 },
  currencyOption: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyOptionText: { fontSize: 11, fontWeight: '600' },
  visibilityRow: { flexDirection: 'row', gap: 10 },
  visibilityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  visibilityLabel: { fontSize: 13, fontWeight: '600' },
  tierNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  tierNoteText: { flex: 1, fontSize: 12, lineHeight: 18 },
  footer: { padding: 16, borderTopWidth: 1 },
  submitButton: { borderRadius: 14, overflow: 'hidden' },
  submitDisabled: { opacity: 0.5 },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
