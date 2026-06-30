import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { OutreachContact, OutreachMeeting, ContactType } from '../types/outreach.types';
import {
  CONTACT_TYPES as CT,
  CONTACT_TYPE_LABELS as CTL,
  CONTACT_TYPE_COLORS as CTC,
  CSV_TYPE_MAP,
  CSV_REQUIRED_HEADERS,
} from '../types/outreach.types';

type ProgressFilter = 'all' | 'in_progress' | 'completed';

interface CsvValidRow {
  contact_name: string;
  organisation_name: string | null;
  contact_type: ContactType;
  meeting_held: boolean;
  on_platform: boolean;
  profile_completed: boolean;
  has_invited_others: boolean;
  notes: string | null;
}

interface CsvSkippedRow {
  rowNum: number;
  reason: string;
}

const PROGRESS_LABELS: Record<ProgressFilter, string> = {
  all: 'All',
  in_progress: 'In Progress',
  completed: 'Completed',
};

function progressCount(c: OutreachContact): number {
  return [c.meeting_held, c.on_platform, c.profile_completed, c.has_invited_others]
    .filter(Boolean).length;
}

function formatMeetingTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' · '
    + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(field.trim());
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field.trim());
  return fields;
}

export default function OutreachTrackerScreen() {
  const { theme } = useTheme();
  const { userProfile } = useAuth();
  const navigation = useNavigation();

  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<(OutreachMeeting & { contact_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContactType | null>(null);
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    contact_name: '',
    organisation_name: '',
    contact_type: 'institution' as ContactType,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // CSV import
  const [csvValidRows, setCsvValidRows] = useState<CsvValidRow[]>([]);
  const [csvSkippedRows, setCsvSkippedRows] = useState<CsvSkippedRow[]>([]);
  const [showCsvSummary, setShowCsvSummary] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);

  // Guard: redirect if not internal team
  useEffect(() => {
    if (userProfile !== undefined && !userProfile?.is_internal_team) {
      (navigation as any).replace('TestFeed');
    }
  }, [userProfile]);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    const [{ data: contactData }, { data: meetingData }] = await Promise.all([
      supabase
        .from('outreach_contacts')
        .select('*')
        .order('updated_at', { ascending: false }),
      supabase
        .from('outreach_meetings')
        .select('*, outreach_contacts(contact_name)')
        .gt('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(3),
    ]);
    setContacts((contactData ?? []) as OutreachContact[]);
    setUpcomingMeetings(
      ((meetingData ?? []) as any[]).map(m => ({
        ...m,
        contact_name: m.outreach_contacts?.contact_name ?? 'Unknown',
      }))
    );
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleField = useCallback(async (
    contactId: string,
    field: 'meeting_held' | 'on_platform' | 'profile_completed' | 'has_invited_others',
    currentValue: boolean,
  ) => {
    const newValue = !currentValue;
    const tsField = `${field}_at` as const;
    const update: Record<string, any> = {
      [field]: newValue,
      [tsField]: newValue ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    setContacts(prev =>
      prev.map(c => c.id === contactId ? { ...c, ...update } : c)
    );
    await supabase.from('outreach_contacts').update(update).eq('id', contactId);
  }, []);

  const handleAddContact = async () => {
    if (!addForm.contact_name.trim()) {
      Alert.alert('Required', 'Please enter a contact name.');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const { error } = await supabase.from('outreach_contacts').insert({
      contact_name: addForm.contact_name.trim(),
      organisation_name: addForm.organisation_name.trim() || null,
      contact_type: addForm.contact_type,
      notes: addForm.notes.trim() || null,
      created_by: user!.id,
      created_at: now,
      updated_at: now,
    });
    setSaving(false);
    if (error) { Alert.alert('Error', 'Could not save contact.'); return; }
    setShowAddModal(false);
    setAddForm({ contact_name: '', organisation_name: '', contact_type: 'institution', notes: '' });
    load();
  };

  // ── Select mode helpers ──────────────────────────────────────────────────

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelectedIds(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    Alert.alert(
      `Delete ${count} contact${count !== 1 ? 's' : ''}?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const ids = Array.from(selectedIds);
            await supabase.from('outreach_meetings').delete().in('contact_id', ids);
            await supabase.from('outreach_contacts').delete().in('id', ids);
            setDeleting(false);
            exitSelectMode();
            load();
          },
        },
      ]
    );
  };

  // ── CSV import ───────────────────────────────────────────────────────────

  const handlePickCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

      if (lines.length < 2) {
        Alert.alert('Empty File', 'The file appears to be empty or has no data rows.');
        return;
      }

      const headers = parseCSVLine(lines[0]);
      const headersValid =
        headers.length === CSV_REQUIRED_HEADERS.length &&
        CSV_REQUIRED_HEADERS.every((h, i) => headers[i] === h);

      if (!headersValid) {
        Alert.alert(
          'Invalid Format',
          `This file does not match the required format. Expected columns: ${CSV_REQUIRED_HEADERS.join(', ')}`
        );
        return;
      }

      const validRows: CsvValidRow[] = [];
      const skippedRows: CsvSkippedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rowNum = i + 1;
        const fields = parseCSVLine(lines[i]);
        while (fields.length < 8) fields.push('');

        const [rawName, rawOrg, rawType, rawMeeting, rawPlatform, rawProfile, rawInvited, rawNotes] = fields;

        if (!rawName.trim()) {
          skippedRows.push({ rowNum, reason: 'Contact Name is blank' });
          continue;
        }

        const normalizedType = rawType.trim().toLowerCase();
        if (!CSV_TYPE_MAP[normalizedType]) {
          skippedRows.push({ rowNum, reason: `Contact Type '${rawType.trim()}' does not match an accepted value` });
          continue;
        }

        const boolChecks = [
          { name: 'Meeting Held', value: rawMeeting.trim() },
          { name: 'On Platform', value: rawPlatform.trim() },
          { name: 'Profile Completed', value: rawProfile.trim() },
          { name: 'Invited Others', value: rawInvited.trim() },
        ];
        let boolError: string | null = null;
        for (const bc of boolChecks) {
          if (!['yes', 'no'].includes(bc.value.toLowerCase())) {
            boolError = `${bc.name} value '${bc.value}' is not Yes or No`;
            break;
          }
        }
        if (boolError) {
          skippedRows.push({ rowNum, reason: boolError });
          continue;
        }

        const parseBool = (v: string) => v.toLowerCase() === 'yes';
        validRows.push({
          contact_name: rawName.trim(),
          organisation_name: rawOrg.trim() || null,
          contact_type: CSV_TYPE_MAP[normalizedType],
          meeting_held: parseBool(rawMeeting),
          on_platform: parseBool(rawPlatform),
          profile_completed: parseBool(rawProfile),
          has_invited_others: parseBool(rawInvited),
          notes: rawNotes.trim() || null,
        });
      }

      setCsvValidRows(validRows);
      setCsvSkippedRows(skippedRows);
      setShowCsvSummary(true);
    } catch {
      Alert.alert('Error', 'Failed to read the file. Please try again.');
    }
  };

  const handleConfirmImport = async () => {
    if (csvValidRows.length === 0) {
      setShowCsvSummary(false);
      return;
    }
    setCsvImporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const rows = csvValidRows.map(r => ({
      ...r,
      created_by: user!.id,
      created_at: now,
      updated_at: now,
    }));
    const { error } = await supabase.from('outreach_contacts').insert(rows);
    setCsvImporting(false);
    if (error) {
      Alert.alert('Import Failed', 'Some records could not be saved. Please try again.');
      return;
    }
    setShowCsvSummary(false);
    setCsvValidRows([]);
    setCsvSkippedRows([]);
    load();
    Alert.alert('Import Complete', `${csvValidRows.length} contact${csvValidRows.length !== 1 ? 's' : ''} added.`);
  };

  const handleCancelImport = () => {
    setShowCsvSummary(false);
    setCsvValidRows([]);
    setCsvSkippedRows([]);
  };

  // ── Filtered list ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q
        || c.contact_name.toLowerCase().includes(q)
        || (c.organisation_name ?? '').toLowerCase().includes(q);
      const matchesType = !typeFilter || c.contact_type === typeFilter;
      const count = progressCount(c);
      const matchesProgress =
        progressFilter === 'all' ? true :
        progressFilter === 'completed' ? count === 4 :
        count < 4;
      return matchesSearch && matchesType && matchesProgress;
    });
  }, [contacts, searchQuery, typeFilter, progressFilter]);

  const renderContact = ({ item }: { item: OutreachContact }) => {
    const count = progressCount(item);
    const isSelected = selectedIds.has(item.id);
    const checkboxes: { field: Parameters<typeof toggleField>[1]; label: string; value: boolean }[] = [
      { field: 'meeting_held',       label: 'Meeting held',   value: item.meeting_held },
      { field: 'on_platform',        label: 'On platform',    value: item.on_platform },
      { field: 'profile_completed',  label: 'Profile done',   value: item.profile_completed },
      { field: 'has_invited_others', label: 'Invited others', value: item.has_invited_others },
    ];

    return (
      <TouchableOpacity
        style={[
          styles.contactCard,
          { backgroundColor: theme.colors.card, borderColor: isSelected ? theme.colors.primary : theme.colors.border },
          isSelected && { backgroundColor: theme.colors.primary + '12' },
        ]}
        activeOpacity={0.85}
        onPress={() => {
          if (selectMode) {
            toggleSelect(item.id);
          } else {
            (navigation as any).navigate('OutreachContactDetail', { contactId: item.id });
          }
        }}
        onLongPress={() => {
          if (!selectMode) {
            enterSelectMode();
            toggleSelect(item.id);
          }
        }}
      >
        <View style={styles.cardHeader}>
          {selectMode && (
            <View style={styles.selectionCheck}>
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={22}
                color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
              />
            </View>
          )}
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.contactName, { color: theme.colors.text }]} numberOfLines={1}>
              {item.contact_name}
            </Text>
            {item.organisation_name && (
              <Text style={[styles.orgName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {item.organisation_name}
              </Text>
            )}
          </View>
          <View style={styles.cardHeaderRight}>
            <View style={[styles.typeTag, { backgroundColor: CTC[item.contact_type] + '22', borderColor: CTC[item.contact_type] + '55' }]}>
              <Text style={[styles.typeTagText, { color: CTC[item.contact_type] }]}>
                {CTL[item.contact_type]}
              </Text>
            </View>
            <Text style={[styles.progressCount, { color: theme.colors.textSecondary }]}>{count} of 4</Text>
          </View>
        </View>
        {!selectMode && (
          <View style={styles.checkboxRow}>
            {checkboxes.map(cb => (
              <TouchableOpacity
                key={cb.field}
                style={styles.checkboxItem}
                onPress={(e) => { e.stopPropagation?.(); toggleField(item.id, cb.field, cb.value); }}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Ionicons
                  name={cb.value ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={cb.value ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={[styles.checkboxLabel, { color: cb.value ? theme.colors.text : theme.colors.textSecondary }]}>
                  {cb.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!userProfile?.is_internal_team) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        {selectMode ? (
          <>
            <TouchableOpacity onPress={exitSelectMode} style={styles.headerBtn}>
              <Text style={[styles.headerBtnText, { color: theme.colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select contacts'}
            </Text>
            <View style={{ width: 64 }} />
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Outreach Tracker</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handlePickCSV} style={styles.headerIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
                <Ionicons name="document-attach-outline" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={enterSelectMode} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                <Text style={[styles.headerBtnText, { color: theme.colors.primary }]}>Select</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderContact}
        ListEmptyComponent={
          loading
            ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 48 }} />
            : <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No contacts found</Text>
        }
        contentContainerStyle={[styles.listContent, selectMode && { paddingBottom: selectedIds.size > 0 ? 120 : 100 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Upcoming meetings — hidden in select mode */}
            {!selectMode && upcomingMeetings.length > 0 && (
              <View style={styles.upcomingSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Upcoming Meetings</Text>
                {upcomingMeetings.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.meetingCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary + '44' }]}
                    onPress={() => (navigation as any).navigate('OutreachContactDetail', { contactId: m.contact_id })}
                  >
                    <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.meetingContactName, { color: theme.colors.text }]}>{m.contact_name}</Text>
                      <Text style={[styles.meetingTime, { color: theme.colors.textSecondary }]}>{formatMeetingTime(m.scheduled_at)}</Text>
                      {m.meeting_link_or_location && (
                        <Text style={[styles.meetingLocation, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          {m.meeting_link_or_location}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Search — hidden in select mode */}
            {!selectMode && (
              <>
                <View style={[styles.searchBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Ionicons name="search-outline" size={16} color={theme.colors.textSecondary} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.colors.text }]}
                    placeholder="Search contacts..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Type filter pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow} contentContainerStyle={styles.pillContent}>
                  <TouchableOpacity
                    style={[styles.pill, !typeFilter && { backgroundColor: theme.colors.primary }]}
                    onPress={() => setTypeFilter(null)}
                  >
                    <Text style={[styles.pillText, { color: !typeFilter ? '#fff' : theme.colors.textSecondary }]}>All</Text>
                  </TouchableOpacity>
                  {CT.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.pill, typeFilter === t && { backgroundColor: CTC[t] }]}
                      onPress={() => setTypeFilter(typeFilter === t ? null : t)}
                    >
                      <Text style={[styles.pillText, { color: typeFilter === t ? '#fff' : theme.colors.textSecondary }]}>
                        {CTL[t]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Progress filter */}
                <View style={styles.progressRow}>
                  {(['all', 'in_progress', 'completed'] as ProgressFilter[]).map(pf => (
                    <TouchableOpacity
                      key={pf}
                      style={[styles.progressPill, progressFilter === pf && { backgroundColor: theme.colors.primary + '22', borderColor: theme.colors.primary }]}
                      onPress={() => setProgressFilter(pf)}
                    >
                      <Text style={[styles.progressPillText, { color: progressFilter === pf ? theme.colors.primary : theme.colors.textSecondary }]}>
                        {PROGRESS_LABELS[pf]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginBottom: 8, marginTop: selectMode ? 16 : 0 }]}>
              Contacts ({filtered.length})
            </Text>
          </View>
        }
      />

      {/* Bottom delete bar — only in select mode with selection */}
      {selectMode && selectedIds.size > 0 && (
        <View style={[styles.deleteBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
          <Text style={[styles.deleteBarCount, { color: theme.colors.text }]}>
            {selectedIds.size} contact{selectedIds.size !== 1 ? 's' : ''} selected
          </Text>
          <TouchableOpacity
            style={[styles.deleteBarBtn, { backgroundColor: '#EF4444' }, deleting && { opacity: 0.6 }]}
            onPress={handleBulkDelete}
            disabled={deleting}
          >
            {deleting
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.deleteBarBtnText}>Delete Selected</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* FAB — hidden in select mode */}
      {!selectMode && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add contact modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>New Contact</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Contact Name *</Text>
              <TextInput
                style={[styles.fieldInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                placeholder="Full name"
                placeholderTextColor={theme.colors.textSecondary}
                value={addForm.contact_name}
                onChangeText={v => setAddForm(f => ({ ...f, contact_name: v }))}
              />

              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Organisation</Text>
              <TextInput
                style={[styles.fieldInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                placeholder="Optional"
                placeholderTextColor={theme.colors.textSecondary}
                value={addForm.organisation_name}
                onChangeText={v => setAddForm(f => ({ ...f, organisation_name: v }))}
              />

              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Contact Type *</Text>
              <View style={styles.typePickerRow}>
                {CT.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typePickerChip, addForm.contact_type === t && { backgroundColor: CTC[t], borderColor: CTC[t] }]}
                    onPress={() => setAddForm(f => ({ ...f, contact_type: t }))}
                  >
                    <Text style={[styles.typePickerText, { color: addForm.contact_type === t ? '#fff' : theme.colors.textSecondary }]}>
                      {CTL[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Notes</Text>
              <TextInput
                style={[styles.fieldInput, styles.notesInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                placeholder="Optional"
                placeholderTextColor={theme.colors.textSecondary}
                value={addForm.notes}
                onChangeText={v => setAddForm(f => ({ ...f, notes: v }))}
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.colors.primary }, saving && { opacity: 0.6 }]}
                onPress={handleAddContact}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Add Contact</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CSV Import Summary modal */}
      <Modal visible={showCsvSummary} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Import Summary</Text>
              <TouchableOpacity onPress={handleCancelImport}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {/* Valid count */}
              <View style={[styles.csvSummaryRow, { backgroundColor: '#10B98122', borderColor: '#10B98144' }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                <Text style={[styles.csvSummaryText, { color: theme.colors.text }]}>
                  <Text style={{ fontWeight: '700' }}>{csvValidRows.length}</Text>
                  {` contact${csvValidRows.length !== 1 ? 's' : ''} ready to import`}
                </Text>
              </View>

              {/* Skipped count */}
              {csvSkippedRows.length > 0 && (
                <>
                  <View style={[styles.csvSummaryRow, { backgroundColor: '#F59E0B22', borderColor: '#F59E0B44', marginTop: 8 }]}>
                    <Ionicons name="warning-outline" size={20} color="#F59E0B" />
                    <Text style={[styles.csvSummaryText, { color: theme.colors.text }]}>
                      <Text style={{ fontWeight: '700' }}>{csvSkippedRows.length}</Text>
                      {` row${csvSkippedRows.length !== 1 ? 's' : ''} skipped due to errors`}
                    </Text>
                  </View>
                  <View style={[styles.skippedList, { borderColor: theme.colors.border }]}>
                    {csvSkippedRows.map((r, idx) => (
                      <View key={idx} style={[styles.skippedItem, idx < csvSkippedRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
                        <Text style={[styles.skippedRowNum, { color: theme.colors.textSecondary }]}>Row {r.rowNum}</Text>
                        <Text style={[styles.skippedReason, { color: theme.colors.text }]}>{r.reason}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.csvActions}>
              <TouchableOpacity
                style={[styles.csvCancelBtn, { borderColor: theme.colors.border }]}
                onPress={handleCancelImport}
              >
                <Text style={[styles.csvCancelText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.csvConfirmBtn,
                  { backgroundColor: csvValidRows.length > 0 ? theme.colors.primary : theme.colors.border },
                  csvImporting && { opacity: 0.6 },
                ]}
                onPress={handleConfirmImport}
                disabled={csvValidRows.length === 0 || csvImporting}
              >
                {csvImporting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.csvConfirmText}>
                      Confirm Import ({csvValidRows.length})
                    </Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn:            { width: 40, height: 40, justifyContent: 'center' },
  headerTitle:        { fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' },
  headerActions:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIconBtn:      { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerBtn:          { height: 36, justifyContent: 'center', paddingHorizontal: 4 },
  headerBtnText:      { fontSize: 15, fontWeight: '600' },
  listContent:        { paddingHorizontal: 16, paddingBottom: 100 },
  upcomingSection:    { marginTop: 16, marginBottom: 4 },
  sectionTitle:       { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  meetingCard:        { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  meetingContactName: { fontSize: 14, fontWeight: '600' },
  meetingTime:        { fontSize: 12, marginTop: 2 },
  meetingLocation:    { fontSize: 11, marginTop: 2 },
  searchBar:          { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginTop: 16, marginBottom: 12, gap: 8 },
  searchInput:        { flex: 1, fontSize: 14 },
  pillRow:            { marginBottom: 10 },
  pillContent:        { paddingRight: 16, gap: 8 },
  pill:               { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(120,120,128,0.12)' },
  pillText:           { fontSize: 13, fontWeight: '500' },
  progressRow:        { flexDirection: 'row', gap: 8, marginBottom: 16 },
  progressPill:       { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: 'transparent', backgroundColor: 'rgba(120,120,128,0.08)' },
  progressPillText:   { fontSize: 12, fontWeight: '500' },
  contactCard:        { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeaderLeft:     { flex: 1, marginRight: 8 },
  cardHeaderRight:    { alignItems: 'flex-end', gap: 6 },
  selectionCheck:     { marginRight: 10, marginTop: 1 },
  contactName:        { fontSize: 15, fontWeight: '600' },
  orgName:            { fontSize: 12, marginTop: 2 },
  typeTag:            { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  typeTagText:        { fontSize: 11, fontWeight: '600' },
  progressCount:      { fontSize: 11, fontWeight: '500' },
  checkboxRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkboxItem:       { flexDirection: 'row', alignItems: 'center', gap: 5, width: '46%' },
  checkboxLabel:      { fontSize: 12 },
  deleteBar:          { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28, borderTopWidth: 1 },
  deleteBarCount:     { fontSize: 14, fontWeight: '500' },
  deleteBarBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  deleteBarBtnText:   { color: '#fff', fontSize: 14, fontWeight: '600' },
  fab:                { position: 'absolute', bottom: 32, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  modalOverlay:       { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:         { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:         { fontSize: 17, fontWeight: '700' },
  fieldLabel:         { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
  fieldInput:         { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  notesInput:         { height: 80, paddingTop: 10 },
  typePickerRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typePickerChip:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(120,120,128,0.3)' },
  typePickerText:     { fontSize: 13, fontWeight: '500' },
  saveBtn:            { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 24, marginBottom: 8 },
  saveBtnText:        { color: '#fff', fontSize: 15, fontWeight: '600' },
  emptyText:          { textAlign: 'center', marginTop: 60, fontSize: 14 },
  // CSV summary
  csvSummaryRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  csvSummaryText:     { flex: 1, fontSize: 14, lineHeight: 20 },
  skippedList:        { borderWidth: 1, borderRadius: 10, marginTop: 8, overflow: 'hidden' },
  skippedItem:        { padding: 12 },
  skippedRowNum:      { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  skippedReason:      { fontSize: 13 },
  csvActions:         { flexDirection: 'row', gap: 12, marginTop: 20 },
  csvCancelBtn:       { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  csvCancelText:      { fontSize: 15, fontWeight: '600' },
  csvConfirmBtn:      { flex: 1.5, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  csvConfirmText:     { color: '#fff', fontSize: 15, fontWeight: '600' },
});
