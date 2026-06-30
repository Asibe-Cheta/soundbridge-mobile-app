import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import type { CalendarConnectionStatus } from '../services/CalendarIntegrationService';

interface Props {
  status: CalendarConnectionStatus;
  loading?: boolean;
  busy?: boolean;
  lastSyncedLabel?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function GoogleCalendarConnectCard({
  status,
  loading = false,
  busy = false,
  lastSyncedLabel,
  onConnect,
  onDisconnect,
}: Props) {
  const { theme } = useTheme();
  const connected = status.connected && !status.needs_reconnect;

  const cardBg = theme.isDark ? 'rgba(26,35,50,0.7)' : theme.colors.card;
  const cardBorder = connected
    ? 'rgba(16,185,129,0.35)'
    : theme.isDark
    ? 'rgba(66,133,244,0.22)'
    : theme.colors.border;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="logo-google" size={22} color="#4285F4" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: connected
                    ? '#10B981'
                    : theme.isDark
                    ? 'rgba(255,255,255,0.3)'
                    : '#C7C7CC',
                },
              ]}
            />
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Google Calendar{' '}
              <Text
                style={{
                  color: connected ? '#10B981' : theme.colors.textSecondary,
                  fontWeight: '400',
                }}
              >
                — {connected ? 'Connected' : 'Not connected'}
              </Text>
            </Text>
          </View>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            Help SoundBridge find events that fit your schedule. We only check when you are free —
            never what your events are about.
          </Text>
          {status.needs_reconnect && (
            <Text style={[styles.warning, { color: '#F59E0B' }]}>
              Your calendar connection needs to be renewed.
            </Text>
          )}
          {connected && lastSyncedLabel ? (
            <Text style={[styles.synced, { color: theme.colors.textMuted }]}>
              Last synced: {lastSyncedLabel}
            </Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 14 }} />
      ) : connected ? (
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: theme.colors.border }]}
          onPress={onDisconnect}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={theme.colors.textSecondary} />
          ) : (
            <Text style={[styles.secondaryBtnText, { color: theme.colors.text }]}>Disconnect</Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.primaryBtnWrap, { opacity: busy ? 0.7 : 1 }]}
          onPress={onConnect}
          disabled={busy}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#DC2626', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtn}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Connect Google Calendar</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      )}

      <Text style={[styles.note, { color: theme.colors.textMuted }]}>
        Separate from Collaboration Availability and Urgent Gig schedules.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(66,133,244,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(66,133,244,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  warning: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  synced: {
    fontSize: 12,
    marginTop: 8,
  },
  primaryBtnWrap: {
    marginTop: 14,
    borderRadius: 999,
    overflow: 'hidden',
  },
  primaryBtn: {
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 999,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  secondaryBtn: {
    marginTop: 14,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  note: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
});
