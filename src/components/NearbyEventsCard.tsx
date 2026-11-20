import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';
import { nearbyEventsService, NearbyEvent } from '../services/NearbyEventsService';
import EventMiniCard from './EventMiniCard';

interface NearbyEventsCardProps {
  userId: string;
  debugVisible?: boolean;
}

export default function NearbyEventsCard({ userId, debugVisible }: NearbyEventsCardProps) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [events, setEvents] = useState<NearbyEvent[]>([]);
  const [needsLocationPrompt, setNeedsLocationPrompt] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [debug, setDebug] = useState('');
  const shownLogged = useRef(new Set<string>());

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    nearbyEventsService.getNearbyEvents(userId, 2).then(result => {
      if (!mounted) return;
      setEvents(result.events);
      setNeedsLocationPrompt(result.needsLocationPrompt);
      setDebug(result.debug);
      setLoaded(true);
    });
    return () => { mounted = false; };
  }, [userId]);

  useEffect(() => {
    // One impression row per event, once per mount of this card — not on
    // every re-render — so a tab switch within the same session doesn't
    // inflate the frequency cap.
    events.forEach(event => {
      if (!shownLogged.current.has(event.event_id)) {
        shownLogged.current.add(event.event_id);
        nearbyEventsService.recordShown(userId, event.event_id);
      }
    });
  }, [events, userId]);

  const handleDismiss = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.event_id !== eventId));
    nearbyEventsService.recordDismiss(userId, eventId);
  };

  const handleSetLocation = () => {
    navigation.navigate('Profile' as never, { openEditLocation: true } as never);
  };

  if (!loaded) return null;

  if (debugVisible && events.length === 0 && !needsLocationPrompt) {
    return (
      <View style={styles.promptCard}>
        <Text style={{ color: '#F59E0B', fontSize: 12 }}>[NearbyEvents debug] {debug}</Text>
      </View>
    );
  }

  if (needsLocationPrompt) {
    return (
      <View style={[styles.promptCard, {
        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        borderColor: theme.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)',
      }]}>
        <Ionicons name="location-outline" size={20} color={theme.colors.primary} />
        <Text style={[styles.promptText, { color: theme.colors.text }]}>
          Set your location to see events near you
        </Text>
        <TouchableOpacity onPress={handleSetLocation} style={styles.promptButton}>
          <Text style={styles.promptButtonText}>Set location</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (events.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: theme.colors.text }]}>Happening near you</Text>
      {events.map(event => (
        <View key={event.event_id} style={styles.cardWrap}>
          <EventMiniCard
            event={{
              id: event.event_id,
              title: event.title,
              event_date: event.event_date,
              location: event.location,
              venue: event.venue,
              category: event.category,
              image_url: event.image_url,
              ticket_price: event.ticket_price,
              tickets_available: event.tickets_available,
              country: event.country,
            }}
            onPress={() => nearbyEventsService.recordTap(userId, event.event_id)}
          />
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => handleDismiss(event.event_id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Dismiss"
          >
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  header: {
    ...Typography.body,
    fontWeight: '700' as const,
  },
  cardWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  promptText: {
    ...Typography.label,
    flex: 1,
  },
  promptButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#DC2626',
  },
  promptButtonText: {
    color: '#fff',
    ...Typography.label,
    fontWeight: '600' as const,
  },
});
