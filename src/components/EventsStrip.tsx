import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';
import { dbHelpers } from '../lib/supabase';
import EventMiniCard from './EventMiniCard';

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const MIN_EVENTS = 3;
const MAX_EVENTS = 10;

// Module-level cache shared across strip instances
const stripCache = new Map<string, { data: any[]; ts: number }>();

interface EventsStripProps {
  userId: string;
}

export default function EventsStrip({ userId }: EventsStripProps) {
  const { theme } = useTheme();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    loadEvents();
  }, [userId]);

  const loadEvents = async () => {
    // Check in-memory cache first
    const cached = stripCache.get(userId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      if (mounted.current) {
        setEvents(cached.data.slice(0, MAX_EVENTS));
        setLoading(false);
      }
      return;
    }

    try {
      const { data } = await dbHelpers.getPersonalizedEvents(userId, MAX_EVENTS);
      const sorted = (data || []).sort((a: any, b: any) => {
        return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
      });
      const result = sorted.slice(0, MAX_EVENTS);
      stripCache.set(userId, { data: result, ts: Date.now() });
      if (mounted.current) {
        setEvents(result);
        setLoading(false);
      }
    } catch {
      if (mounted.current) setLoading(false);
    }
  };

  if (loading) return null;
  if (events.length < MIN_EVENTS) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.isDark ? 'rgba(15,23,42,0.6)' : 'rgba(248,248,250,0.95)' }]}>
      {/* Strip header */}
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerText, { color: theme.colors.text }]}>Events for you</Text>
          <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>{events.length}</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Don't miss these events that benefit you.
        </Text>
      </View>

      {/* Horizontal scroll — ~65% card width, peek of next card visible */}
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventMiniCard event={item} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={Math.round(Dimensions.get('window').width * 0.78) + 14}
        decelerationRate="fast"
        style={{ overflow: 'visible' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 16,
    marginBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  headerWrap: {
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    ...Typography.body,
    fontWeight: '700' as const,
    flex: 1,
  },
  countText: {
    ...Typography.label,
  },
  subtitle: {
    ...Typography.label,
    fontSize: 12,
    opacity: 0.8,
  },
  listContent: {
    paddingLeft: 16,
    paddingRight: 6,
  },
});
