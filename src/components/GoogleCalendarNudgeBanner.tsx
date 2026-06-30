import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  onConnect: () => void;
  onDismiss: () => void;
}

export default function GoogleCalendarNudgeBanner({ onConnect, onDismiss }: Props) {
  const { theme } = useTheme();
  const isDark = theme.isDark;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(66,133,244,0.08)',
          borderColor: isDark ? 'rgba(66,133,244,0.35)' : 'rgba(66,133,244,0.25)',
        },
      ]}
    >
      <TouchableOpacity
        style={styles.dismissBtn}
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Dismiss calendar connect suggestion"
      >
        <Ionicons
          name="close"
          size={16}
          color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
        />
      </TouchableOpacity>

      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="calendar" size={20} color="#4285F4" />
        </View>
        <View style={styles.content}>
          <Text style={[styles.headline, { color: theme.colors.text }]}>
            Get events that fit your schedule
          </Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            Connect Google Calendar and we will only suggest events when you are actually free.
          </Text>
          <TouchableOpacity style={styles.connectBtn} onPress={onConnect} activeOpacity={0.85}>
            <Text style={styles.connectBtnText}>Connect Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    paddingTop: 12,
  },
  dismissBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 20,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(66,133,244,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  headline: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  connectBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#4285F4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  connectBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
