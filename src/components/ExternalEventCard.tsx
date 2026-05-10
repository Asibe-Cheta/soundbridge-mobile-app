import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export interface ExternalEvent {
  id: string;
  source: 'songkick' | 'ticketmaster' | string;
  title: string;
  artist_name: string;
  venue_name: string;
  venue_address?: string | null;
  city: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  genre?: string | null;
  event_date: string;
  ticket_url?: string | null;
  image_url?: string | null;
  is_claimed: boolean;
  claimed_by_user_id?: string | null;
  distance_km?: number | null;
}

interface Props {
  event: ExternalEvent;
  onClaim: (event: ExternalEvent) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  songkick: 'Via Songkick',
  ticketmaster: 'Via Ticketmaster',
};

export default function ExternalEventCard({ event, onClaim }: Props) {
  const { theme } = useTheme();

  const sourceLabel = SOURCE_LABELS[event.source] ?? 'External Event';

  const handleGetTickets = () => {
    if (event.ticket_url) {
      Linking.openURL(event.ticket_url).catch(() => {});
    }
  };

  const formattedDate = new Date(event.event_date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={[styles.card, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
      {/* Thumbnail */}
      <View style={styles.imageContainer}>
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.image} />
        ) : (
          <View style={[styles.defaultImage, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
            <Ionicons name="musical-notes" size={26} color="rgba(255,255,255,0.3)" />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        {/* Subtle source badge */}
        <View style={[styles.badge, { borderColor: 'rgba(255,255,255,0.18)' }]}>
          <Text style={styles.badgeText}>{sourceLabel.toUpperCase()}</Text>
        </View>

        <Text
          style={[styles.title, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {event.title}
        </Text>

        <Text
          style={[styles.artist, { color: theme.colors.primary }]}
          numberOfLines={1}
        >
          {event.artist_name}
        </Text>

        <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
          {formattedDate}
        </Text>

        <Text
          style={[styles.meta, { color: theme.colors.textSecondary }]}
          numberOfLines={1}
        >
          📍 {event.venue_name}, {event.city}
        </Text>

        {/* Get Tickets */}
        {event.ticket_url ? (
          <TouchableOpacity
            style={[styles.ticketButton, { borderColor: theme.colors.primary }]}
            onPress={handleGetTickets}
            activeOpacity={0.7}
          >
            <Ionicons
              name="ticket-outline"
              size={12}
              color={theme.colors.primary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.ticketText, { color: theme.colors.primary }]}>
              Get Tickets
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Claim link */}
        {!event.is_claimed && (
          <TouchableOpacity
            style={styles.claimContainer}
            onPress={() => onClaim(event)}
            activeOpacity={0.7}
          >
            <Text style={[styles.claimText, { color: theme.colors.textSecondary }]}>
              Are you this artist?{' '}
              <Text style={{ color: theme.colors.primary }}>Claim this event</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  defaultImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginBottom: 5,
  },
  badgeText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    lineHeight: 20,
  },
  artist: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 3,
  },
  meta: {
    fontSize: 12,
    marginBottom: 2,
  },
  ticketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    marginBottom: 2,
  },
  ticketText: {
    fontSize: 12,
    fontWeight: '500',
  },
  claimContainer: {
    marginTop: 6,
  },
  claimText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
