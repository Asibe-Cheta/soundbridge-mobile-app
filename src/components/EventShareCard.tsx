import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LOGO = require('../../assets/images/logos/logo-white-wd.png');

export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHT = 480;

interface Props {
  title: string;
  eventDate: string;
  location: string;
  venue?: string;
  category: string;
  coverImageUrl?: string;
  organizerName?: string;
  organizerAvatarUrl?: string;
}

function formatShareDate(dateString: string): string {
  const d = new Date(dateString);
  const date = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${date} · ${time}`;
}

export default function EventShareCard({
  title,
  eventDate,
  location,
  venue,
  category,
  coverImageUrl,
  organizerName,
  organizerAvatarUrl,
}: Props) {
  return (
    <View style={styles.card}>
      {/* Cover image or gradient fallback */}
      {coverImageUrl ? (
        <Image source={{ uri: coverImageUrl }} style={styles.cover} />
      ) : (
        <LinearGradient
          colors={['#1a0a2e', '#16213e', '#0f3460']}
          style={styles.cover}
        />
      )}

      {/* Scrim overlay so text is always legible */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
        style={styles.scrim}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Category pill */}
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{category.toUpperCase()}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={3}>
          {title}
        </Text>

        {/* Date */}
        <View style={styles.metaRow}>
          <Text style={styles.metaIcon}>📅</Text>
          <Text style={styles.metaText}>{formatShareDate(eventDate)}</Text>
        </View>

        {/* Location */}
        <View style={styles.metaRow}>
          <Text style={styles.metaIcon}>📍</Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {venue ? `${venue}, ${location}` : location}
          </Text>
        </View>

        {/* Organizer row */}
        {organizerName && (
          <View style={styles.organizerRow}>
            {organizerAvatarUrl ? (
              <Image
                source={{ uri: organizerAvatarUrl }}
                style={styles.organizerAvatar}
              />
            ) : (
              <View style={styles.organizerAvatarPlaceholder} />
            )}
            <Text style={styles.organizerName} numberOfLines={1}>
              {organizerName}
            </Text>
          </View>
        )}

        {/* Footer divider + logo */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <View style={styles.footerRow}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <Text style={styles.footerUrl}>soundbridge.live</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0f0f1a',
  },
  cover: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  scrim: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  categoryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  metaText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    flex: 1,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  organizerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  organizerAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  organizerName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    marginTop: 16,
  },
  footerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 20,
    marginRight: 8,
  },
  footerUrl: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
  },
});
