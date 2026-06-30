import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';

// 78% of screen — fills most of the viewport, peek of next card visible
const SCREEN_W = Dimensions.get('window').width;
const CARD_W = Math.round(SCREEN_W * 0.78);
const IMG_H = Math.round(CARD_W * 0.68);   // tall cover image
const CONTENT_H = 90;                        // title + venue+button row
const CARD_H = IMG_H + CONTENT_H;

interface EventMiniCardProps {
  event: {
    id: string;
    title: string;
    event_date: string;
    location: string | null;
    venue: string | null;
    category: string | null;
    image_url: string | null;
    ticket_price: number | null;
    tickets_available?: number | null;
    country: string | null;
  };
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function getCurrencySymbol(country: string | null): string {
  if (!country) return '£';
  const c = country.toLowerCase();
  if (c.includes('nigeria') || c === 'ng') return '₦';
  if (c.includes('ghana') || c === 'gh') return '₵';
  if (c.includes('kenya') || c === 'ke') return 'KSh ';
  if (c.includes('united states') || c === 'us' || c === 'usa') return '$';
  if (c.includes('canada') || c === 'ca') return 'CA$';
  if (c.includes('europe') || c === 'eu') return '€';
  return '£';
}

function getCTALabel(event: EventMiniCardProps['event']): string {
  if (event.ticket_price !== null && event.ticket_price > 0) return 'Reserve';
  if (event.ticket_price === 0) return 'Reserve Free';
  return 'Learn More';
}

export default function EventMiniCard({ event }: EventMiniCardProps) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const isDark = theme.isDark;

  const city = event.venue || event.location || '';
  const shortCity = city.split(',')[0].trim();
  const isFree = !event.ticket_price || event.ticket_price === 0;
  const priceLabel = event.ticket_price && event.ticket_price > 0
    ? `${getCurrencySymbol(event.country)}${event.ticket_price}`
    : 'Free';
  const ctaLabel = getCTALabel(event);

  const handlePress = () =>
    (navigation as any).navigate('EventDetails', { eventId: event.id });

  return (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: isDark ? 'rgba(14,18,32,0.98)' : '#fff',
        borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
      }]}
      activeOpacity={0.9}
      onPress={handlePress}
    >
      {/* ── Cover image ──────────────────────────────────────────────── */}
      <View style={styles.imageWrap}>
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={['#7C1D1D', '#DC2626', '#9D174D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.imagePlaceholder}
          >
            <Ionicons name="musical-notes" size={44} color="rgba(255,255,255,0.45)" />
            <Text style={styles.placeholderTitle} numberOfLines={3}>{event.title}</Text>
          </LinearGradient>
        )}

        {/* Gradient scrim — makes top badges legible */}
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'transparent', 'transparent', 'rgba(0,0,0,0.5)']}
          locations={[0, 0.25, 0.65, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Top-left: EVENT badge */}
        <View style={styles.eventBadge}>
          <Ionicons name="calendar" size={10} color="#fff" />
          <Text style={styles.eventBadgeText}>EVENT</Text>
        </View>

        {/* Top-right: genre */}
        {event.category ? (
          <View style={styles.genreBadge}>
            <Text style={styles.genreBadgeText}>{event.category}</Text>
          </View>
        ) : null}

        {/* Bottom-left: date */}
        <Text style={styles.dateOverlay}>{formatShortDate(event.event_date)}</Text>

        {/* Bottom-right: price */}
        <View style={[styles.priceBadge, isFree && styles.priceFree]}>
          <Text style={styles.priceText}>{priceLabel}</Text>
        </View>
      </View>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
          {event.title}
        </Text>

        {/* Venue + CTA on the same row — mirrors Instagram "View insights · Boost post" */}
        <View style={styles.venueCtaRow}>
          <View style={styles.venueBlock}>
            {shortCity ? (
              <>
                <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                <Text style={[styles.venue, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {shortCity}
                </Text>
              </>
            ) : null}
          </View>

          <TouchableOpacity activeOpacity={0.82} onPress={handlePress}>
            <LinearGradient
              colors={['#1877F2', '#0EA5E9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaText} numberOfLines={1}>{ctaLabel}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },

  // Image
  imageWrap: {
    width: CARD_W,
    height: IMG_H,
  },
  image: {
    width: CARD_W,
    height: IMG_H,
  },
  imagePlaceholder: {
    width: CARD_W,
    height: IMG_H,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  placeholderTitle: {
    ...Typography.headerMedium,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
  },

  // Overlays
  eventBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(220,38,38,0.90)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  eventBadgeText: {
    ...Typography.label,
    fontSize: 10,
    color: '#fff',
    letterSpacing: 0.8,
  },
  genreBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  genreBadgeText: {
    ...Typography.label,
    fontSize: 11,
    color: '#fff',
  },
  dateOverlay: {
    ...Typography.label,
    position: 'absolute',
    bottom: 10,
    left: 12,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  priceBadge: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priceFree: {
    backgroundColor: 'rgba(22,163,74,0.85)',
  },
  priceText: {
    ...Typography.label,
    color: '#fff',
  },

  // Content
  content: {
    height: CONTENT_H,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    gap: 8,
    justifyContent: 'center',
  },
  title: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 21,
  },
  // Venue + CTA on the same row (Instagram "View insights · Boost post" pattern)
  venueCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  venueBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  venue: {
    ...Typography.label,
    flex: 1,
  },
  ctaButton: {
    borderRadius: 8,     // rectangular with soft corners — Instagram "Boost post" style
    overflow: 'hidden',
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    ...Typography.button,
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.1,
  },
});
