import React, { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  OutreachContact, OutreachMeeting, ContactType,
  CONTACT_TYPES as CT,
  CONTACT_TYPE_LABELS as CTL,
  CONTACT_TYPE_COLORS as CTC,
} from '../types/outreach.types';

type CheckboxField = 'meeting_held' | 'on_platform' | 'profile_completed' | 'has_invited_others';

const CHECKBOX_CONFIG: { field: CheckboxField; label: string }[] = [
  { field: 'meeting_held',       label: 'Meeting held' },
  { field: 'on_platform',        label: 'On platform' },
  { field: 'profile_completed',  label: 'Profile completed' },
  { field: 'has_invited_others', label: 'Invited others' },
];

function formatTs(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' at '
    + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatMeetingDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    + '\n'
    + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function OutreachContactDetailScreen() {
  const { theme } = useTheme();
  const { userProfile } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { contactId } = route.params as { contactId: string };

  const [contact, setContact] = useState<OutreachContact | null>(null);
  const [meetings, setMeetings] = useState<OutreachMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ contact_name: '', organisation_name: '', contact_type: 'institution' as ContactType });
  const [savingEdit, setSavingEdit] = useState(false);

  // Guard
  useEffect(() => {
    if (userProfile !== undefined && !userProfile?.is_internal_team) {
      (navigation as any).replace('TestFeed');
    }
  }, [userProfile]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from('outreach_contacts').select('*').eq('id', contactId).single(),
      supabase.from('outreach_meetings').select('*').eq('contact_id', contactId).order('scheduled_at', { ascending: true }),
    ]);
    if (c) { setContact(c as OutreachContact); setNotes(c.notes ?? ''); }
    setMeetings((m ?? []) as OutreachMeeting[]);
    setLoading(false);
  }, [contactId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (contact) {
      setEditForm({
        contact_name: contact.contact_name,
        organisation_name: contact.organisation_name ?? '',
        contact_type: contact.contact_type,
      });
    }
  }, [contact]);

  const handleSaveEdit = async () => {
    if (!editForm.contact_name.trim()) {
      Alert.alert('Required', 'Contact name cannot be blank.');
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from('outreach_contacts')
      .update({
        contact_name: editForm.contact_name.trim(),
        organisation_name: editForm.organisation_name.trim() || null,
        contact_type: editForm.contact_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId);
    setSavingEdit(false);
    if (error) { Alert.alert('Error', 'Could not save changes.'); return; }
    setShowEditModal(false);
    load();
  };

  const toggleField = async (field: CheckboxField) => {
    if (!contact) return;
    const newValue = !contact[field];
    const tsField = `${field}_at` as keyof OutreachContact;
    const update: Record<string, any> = {
      [field]: newValue,
      [tsField]: newValue ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    setContact(prev => prev ? { ...prev, ...update } : prev);
    await supabase.from('outreach_contacts').update(update).eq('id', contactId);
  };

  const saveNotes = async () => {
    if (!contact) return;
    setSavingNotes(true);
    await supabase.from('outreach_contacts')
      .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', contactId);
    setSavingNotes(false);
    setNotesDirty(false);
  };

  const handleScheduleMeeting = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSavingMeeting(true);
    const { error } = await supabase.from('outreach_meetings').insert({
      contact_id: contactId,
      scheduled_at: scheduleDate.toISOString(),
      meeting_link_or_location: meetingLink.trim() || null,
      created_by: user.id,
      created_at: new Date().toISOString(),
    });
    setSavingMeeting(false);
    if (error) { Alert.alert('Error', 'Could not save meeting.'); return; }

    // Schedule a local reminder 60 minutes before the meeting.
    // Only fires if the reminder time is still in the future.
    try {
      const contactName = contact?.contact_name ?? 'Contact';
      const meetingTime = scheduleDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const locationPart = meetingLink.trim() ? ` ${meetingLink.trim()}` : '';
      const reminderDate = new Date(scheduleDate.getTime() - 60 * 60 * 1000);
      if (reminderDate.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Meeting in 60 minutes',
            body: `${contactName} at ${meetingTime}.${locationPart}`,
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
          },
        });
      }
    } catch {}

    setShowScheduleModal(false);
    setScheduleDate(new Date());
    setMeetingLink('');
    load();
  };

  const deleteMeeting = (meetingId: string) => {
    Alert.alert('Delete Meeting', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeletingMeetingId(meetingId);
          await supabase.from('outreach_meetings').delete().eq('id', meetingId);
          setDeletingMeetingId(null);
          load();
        },
      },
    ]);
  };

  const onDateChange = (event: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && d) {
        setScheduleDate(prev => {
          const next = new Date(prev);
          next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
          return next;
        });
        setShowTimePicker(true);
      }
    } else {
      // iOS: update value but keep picker open until Done is tapped
      if (d) setScheduleDate(prev => {
        const next = new Date(prev);
        next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
        return next;
      });
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, t?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && t) {
        setScheduleDate(prev => {
          const next = new Date(prev);
          next.setHours(t.getHours(), t.getMinutes());
          return next;
        });
      }
    } else {
      // iOS: update value but keep picker open until Done is tapped
      if (t) setScheduleDate(prev => {
        const next = new Date(prev);
        next.setHours(t.getHours(), t.getMinutes());
        return next;
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!contact || !userProfile?.is_internal_team) return null;

  const typeColor = CTC[contact.contact_type];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {contact.contact_name}
        </Text>
        <TouchableOpacity
          onPress={() => setShowEditModal(true)}
          style={styles.editBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="pencil-outline" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact info */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Name</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>{contact.contact_name}</Text>
          </View>
          {contact.organisation_name && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Organisation</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{contact.organisation_name}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Type</Text>
            <View style={[styles.typeTag, { backgroundColor: typeColor + '22', borderColor: typeColor + '55' }]}>
              <Text style={[styles.typeTagText, { color: typeColor }]}>{CTL[contact.contact_type]}</Text>
            </View>
          </View>
        </View>

        {/* Checkboxes */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Progress</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {CHECKBOX_CONFIG.map((cb, idx) => {
            const checked = contact[cb.field] as boolean;
            const ts = contact[`${cb.field}_at` as keyof OutreachContact] as string | null;
            return (
              <View key={cb.field}>
                {idx > 0 && <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />}
                <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleField(cb.field)}>
                  <Ionicons
                    name={checked ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={checked ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.checkboxLabel, { color: checked ? theme.colors.text : theme.colors.textSecondary }]}>
                      {cb.label}
                    </Text>
                    {checked && ts && (
                      <Text style={[styles.checkboxTs, { color: theme.colors.textSecondary }]}>
                        {formatTs(ts)}
                      </Text>
                    )}
                  </View>
                  {checked && <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Notes */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Notes</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <TextInput
            style={[styles.notesInput, { color: theme.colors.text }]}
            placeholder="Add notes..."
            placeholderTextColor={theme.colors.textSecondary}
            value={notes}
            onChangeText={v => { setNotes(v); setNotesDirty(true); }}
            multiline
            textAlignVertical="top"
          />
          {notesDirty && (
            <TouchableOpacity
              style={[styles.saveNotesBtn, { backgroundColor: theme.colors.primary + '22', borderColor: theme.colors.primary }]}
              onPress={saveNotes}
              disabled={savingNotes}
            >
              {savingNotes
                ? <ActivityIndicator size="small" color={theme.colors.primary} />
                : <Text style={[styles.saveNotesBtnText, { color: theme.colors.primary }]}>Save Notes</Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* Meetings */}
        <View style={styles.meetingsHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginBottom: 0 }]}>Meetings</Text>
          <TouchableOpacity
            style={[styles.schedulBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowScheduleModal(true)}
          >
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={styles.schedulBtnText}>Schedule</Text>
          </TouchableOpacity>
        </View>

        {meetings.length === 0
          ? <Text style={[styles.emptyMeetings, { color: theme.colors.textSecondary }]}>No meetings scheduled</Text>
          : meetings.map(m => (
            <View key={m.id} style={[styles.meetingCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.meetingDateTime, { color: theme.colors.text }]}>{formatMeetingDateTime(m.scheduled_at)}</Text>
                {m.meeting_link_or_location && (
                  <Text style={[styles.meetingLocation, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {m.meeting_link_or_location}
                  </Text>
                )}
                {m.reminder_sent && (
                  <View style={styles.reminderBadge}>
                    <Ionicons name="checkmark-circle-outline" size={12} color="#10B981" />
                    <Text style={styles.reminderBadgeText}>Reminder sent</Text>
                  </View>
                )}
              </View>
              {deletingMeetingId === m.id
                ? <ActivityIndicator size="small" color={theme.colors.error} />
                : (
                  <TouchableOpacity onPress={() => deleteMeeting(m.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                )
              }
            </View>
          ))
        }
      </ScrollView>

      {/* Edit contact modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Contact</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Contact Name *</Text>
              <TextInput
                style={[styles.fieldInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                placeholder="Full name"
                placeholderTextColor={theme.colors.textSecondary}
                value={editForm.contact_name}
                onChangeText={v => setEditForm(f => ({ ...f, contact_name: v }))}
              />

              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Organisation</Text>
              <TextInput
                style={[styles.fieldInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                placeholder="Optional"
                placeholderTextColor={theme.colors.textSecondary}
                value={editForm.organisation_name}
                onChangeText={v => setEditForm(f => ({ ...f, organisation_name: v }))}
              />

              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Contact Type *</Text>
              <View style={styles.typePickerRow}>
                {CT.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typePickerChip, editForm.contact_type === t && { backgroundColor: CTC[t], borderColor: CTC[t] }]}
                    onPress={() => setEditForm(f => ({ ...f, contact_type: t }))}
                  >
                    <Text style={[styles.typePickerText, { color: editForm.contact_type === t ? '#fff' : theme.colors.textSecondary }]}>
                      {CTL[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.colors.primary }, savingEdit && { opacity: 0.6 }]}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Save Changes</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Schedule meeting modal */}
      <Modal visible={showScheduleModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Schedule Meeting</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Date & Time</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.dateTimeBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.dateTimeBtnText, { color: theme.colors.text }]}>
                  {scheduleDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateTimeBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.dateTimeBtnText, { color: theme.colors.text }]}>
                  {scheduleDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <>
                <DateTimePicker
                  value={scheduleDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={onDateChange}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[styles.pickerDoneBtn, { borderColor: theme.colors.primary }]}
                    onPress={() => { setShowDatePicker(false); setShowTimePicker(true); }}
                  >
                    <Text style={[styles.pickerDoneBtnText, { color: theme.colors.primary }]}>Done — pick time next</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            {showTimePicker && (
              <>
                <DateTimePicker
                  value={scheduleDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[styles.pickerDoneBtn, { borderColor: theme.colors.primary }]}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={[styles.pickerDoneBtnText, { color: theme.colors.primary }]}>Done</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Meeting Link or Location</Text>
            <TextInput
              style={[styles.fieldInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              placeholder="Optional — URL or address"
              placeholderTextColor={theme.colors.textSecondary}
              value={meetingLink}
              onChangeText={setMeetingLink}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.colors.primary }, savingMeeting && { opacity: 0.6 }]}
              onPress={handleScheduleMeeting}
              disabled={savingMeeting}
            >
              {savingMeeting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Save Meeting</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn:          { width: 40, height: 40, justifyContent: 'center' },
  editBtn:          { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  typePickerRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typePickerChip:   { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(120,120,128,0.3)' },
  typePickerText:   { fontSize: 13, fontWeight: '500' },
  headerTitle:      { fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' },
  content:          { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 },
  sectionTitle:     { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 20 },
  card:             { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 4 },
  infoRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  infoLabel:        { fontSize: 13 },
  infoValue:        { fontSize: 14, fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  typeTag:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  typeTagText:      { fontSize: 12, fontWeight: '600' },
  divider:          { height: 1, marginVertical: 4 },
  checkboxRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  checkboxLabel:    { fontSize: 15, fontWeight: '500' },
  checkboxTs:       { fontSize: 11, marginTop: 2 },
  notesInput:       { minHeight: 80, fontSize: 14, lineHeight: 20 },
  saveNotesBtn:     { marginTop: 10, padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  saveNotesBtnText: { fontSize: 13, fontWeight: '600' },
  meetingsHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  schedulBtn:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  schedulBtnText:   { color: '#fff', fontSize: 12, fontWeight: '600' },
  meetingCard:      { borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  meetingDateTime:  { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  meetingLocation:  { fontSize: 12, marginTop: 4 },
  reminderBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  reminderBadgeText:{ fontSize: 11, color: '#10B981', fontWeight: '500' },
  emptyMeetings:    { fontSize: 13, textAlign: 'center', marginTop: 12, marginBottom: 8 },
  modalOverlay:     { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:       { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:       { fontSize: 17, fontWeight: '700' },
  fieldLabel:       { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
  fieldInput:       { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  dateTimeRow:      { flexDirection: 'row', gap: 10 },
  dateTimeBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 12 },
  dateTimeBtnText:  { fontSize: 14, flex: 1 },
  pickerDoneBtn:    { marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  pickerDoneBtnText:{ fontSize: 14, fontWeight: '600' },
  saveBtn:          { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  saveBtnText:      { color: '#fff', fontSize: 15, fontWeight: '600' },
});
