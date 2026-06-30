import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ScrollView, Alert, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  opportunity_type: string;
  genre_tags: string[];
  location_city: string | null;
  source_url: string | null;
  expires_at: string | null;
  created_at: string;
}

const OPPORTUNITY_TYPES = ['open_mic', 'venue', 'policy_change', 'brand_partnership', 'industry_news'];
const TYPE_LABELS: Record<string, string> = {
  open_mic: 'Open Mic',
  venue: 'Venue',
  policy_change: 'Policy Change',
  brand_partnership: 'Brand Partnership',
  industry_news: 'Industry News',
};
const TYPE_COLORS: Record<string, string> = {
  open_mic: '#10b981',
  venue: '#3b82f6',
  policy_change: '#f59e0b',
  brand_partnership: '#ec4899',
  industry_news: '#a855f7',
};

const GENRE_OPTIONS = [
  'Afrobeats', 'Amapiano', 'Gospel', 'Hip-Hop', 'R&B', 'Jazz',
  'Electronic', 'Grime', 'Drill', 'Pop', 'Soul', 'Classical', 'Reggae',
];

const emptyForm = {
  title: '',
  description: '',
  opportunity_type: 'open_mic',
  genre_tags: [] as string[],
  location_city: '',
  source_url: '',
  expires_at: '',
};

export default function AdminCuratedOpportunitiesScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme.isDark;

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadOpportunities = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('curated_opportunities')
      .select('*')
      .order('created_at', { ascending: false });
    setOpportunities(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadOpportunities(); }, []);

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      Alert.alert('Missing fields', 'Title and description are required.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('curated_opportunities').insert({
        title: form.title.trim(),
        description: form.description.trim(),
        opportunity_type: form.opportunity_type,
        genre_tags: form.genre_tags,
        location_city: form.location_city.trim() || null,
        source_url: form.source_url.trim() || null,
        expires_at: form.expires_at.trim() || null,
        created_by: user?.id,
      });
      if (error) throw error;
      setForm(emptyForm);
      setShowForm(false);
      await loadOpportunities();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not save opportunity.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (opp: Opportunity) => {
    Alert.alert('Delete opportunity?', `"${opp.title}" will be removed. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('curated_opportunities').delete().eq('id', opp.id);
        setOpportunities(prev => prev.filter(o => o.id !== opp.id));
      }},
    ]);
  };

  const toggleGenre = (genre: string) => {
    setForm(prev => ({
      ...prev,
      genre_tags: prev.genre_tags.includes(genre)
        ? prev.genre_tags.filter(g => g !== genre)
        : [...prev.genre_tags, genre],
    }));
  };

  const isExpired = (opp: Opportunity) =>
    opp.expires_at ? new Date(opp.expires_at) < new Date() : false;

  const renderOpportunity = ({ item }: { item: Opportunity }) => {
    const expired = isExpired(item);
    return (
      <View style={[styles.oppCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, opacity: expired ? 0.55 : 1 }]}>
        <View style={styles.oppTop}>
          <View style={[styles.typePill, { backgroundColor: `${TYPE_COLORS[item.opportunity_type] ?? '#6b7280'}22` }]}>
            <Text style={[styles.typeText, { color: TYPE_COLORS[item.opportunity_type] ?? '#6b7280' }]}>
              {TYPE_LABELS[item.opportunity_type] ?? item.opportunity_type}
            </Text>
          </View>
          {expired && (
            <View style={[styles.expiredPill]}>
              <Text style={styles.expiredText}>Expired</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.oppTitle, { color: theme.colors.text }]}>{item.title}</Text>
        <Text style={[styles.oppDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
        <View style={styles.oppMeta}>
          {item.location_city && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{item.location_city}</Text>
            </View>
          )}
          {item.genre_tags?.length > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="musical-notes-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{item.genre_tags.join(', ')}</Text>
            </View>
          )}
          {item.expires_at && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>Expires {item.expires_at}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Curated Opportunities</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setShowForm(true)}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Manually add opportunities (open mics, law changes, brand deals) that get matched to creators via the daily AI filter.
        </Text>

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : opportunities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bulb-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No opportunities yet</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
              Tap + to add the first one.
            </Text>
          </View>
        ) : (
          <FlatList
            data={opportunities}
            keyExtractor={item => item.id}
            renderItem={renderOpportunity}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>

      {/* Add form modal */}
      <Modal visible={showForm} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKAV}
          >
            <View style={[styles.modalSheet, { backgroundColor: isDark ? '#0e1220' : '#f8f8f8' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#111' }]}>New Opportunity</Text>
                <TouchableOpacity onPress={() => { setShowForm(false); setForm(emptyForm); }}>
                  <Ionicons name="close" size={22} color={isDark ? 'rgba(255,255,255,0.6)' : '#555'} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
                <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : '#555' }]}>Title *</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#fff' : '#111', borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#ddd', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff' }]}
                  value={form.title}
                  onChangeText={v => setForm(p => ({ ...p, title: v }))}
                  placeholder="e.g. Open Mic at The Jazz Cafe"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : '#aaa'}
                />

                <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : '#555' }]}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti, { color: isDark ? '#fff' : '#111', borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#ddd', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff' }]}
                  value={form.description}
                  onChangeText={v => setForm(p => ({ ...p, description: v }))}
                  placeholder="Describe the opportunity and why it's relevant"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : '#aaa'}
                  multiline
                  numberOfLines={3}
                />

                <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : '#555' }]}>Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {OPPORTUNITY_TYPES.map(t => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setForm(p => ({ ...p, opportunity_type: t }))}
                        style={[styles.typeChip, { backgroundColor: form.opportunity_type === t ? TYPE_COLORS[t] : (isDark ? 'rgba(255,255,255,0.08)' : '#eee') }]}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.typeChipText, { color: form.opportunity_type === t ? '#fff' : (isDark ? 'rgba(255,255,255,0.6)' : '#555') }]}>
                          {TYPE_LABELS[t]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : '#555' }]}>Genre tags (leave empty = all genres)</Text>
                <View style={styles.genreWrap}>
                  {GENRE_OPTIONS.map(g => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => toggleGenre(g)}
                      style={[styles.genreChip, { backgroundColor: form.genre_tags.includes(g) ? theme.colors.primary : (isDark ? 'rgba(255,255,255,0.08)' : '#eee') }]}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.genreChipText, { color: form.genre_tags.includes(g) ? '#fff' : (isDark ? 'rgba(255,255,255,0.6)' : '#555') }]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : '#555' }]}>City (optional)</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#fff' : '#111', borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#ddd', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff' }]}
                  value={form.location_city}
                  onChangeText={v => setForm(p => ({ ...p, location_city: v }))}
                  placeholder="e.g. London"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : '#aaa'}
                />

                <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : '#555' }]}>Source URL (optional)</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#fff' : '#111', borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#ddd', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff' }]}
                  value={form.source_url}
                  onChangeText={v => setForm(p => ({ ...p, source_url: v }))}
                  placeholder="https://..."
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : '#aaa'}
                  autoCapitalize="none"
                  keyboardType="url"
                />

                <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : '#555' }]}>Expiry date (optional, YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#fff' : '#111', borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#ddd', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff' }]}
                  value={form.expires_at}
                  onChangeText={v => setForm(p => ({ ...p, expires_at: v }))}
                  placeholder="2026-08-01"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : '#aaa'}
                />

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme.colors.primary, opacity: saving ? 0.6 : 1 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Opportunity</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: 13, lineHeight: 19, marginHorizontal: 16, marginBottom: 16 },

  list: { paddingHorizontal: 16, paddingBottom: 40 },
  oppCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  oppTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  typePill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  typeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  expiredPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.15)' },
  expiredText: { fontSize: 11, fontWeight: '600', color: '#ef4444' },
  deleteBtn: { marginLeft: 'auto' },
  oppTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  oppDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  oppMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalKAV: { maxHeight: '92%' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingHorizontal: 16, paddingBottom: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  formScroll: { paddingBottom: 40 },
  fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, marginBottom: 16 },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  typeChipText: { fontSize: 13, fontWeight: '600' },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  genreChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  genreChipText: { fontSize: 13, fontWeight: '500' },
  saveBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
