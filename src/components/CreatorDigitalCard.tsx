import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { BarlowCondensed_400Regular } from '@expo-google-fonts/barlow-condensed';
import { Cinzel_400Regular } from '@expo-google-fonts/cinzel';

const DIGITAL_LOGO = require('../../assets/digital-logo.png');

const CARD_ASPECT = 9 / 16;
const { width: SCREEN_W } = Dimensions.get('window');
export const CARD_WIDTH = Math.min(SCREEN_W * 0.88, 380);
export const CARD_HEIGHT = Math.round(CARD_WIDTH / CARD_ASPECT);

export const HERO_H = Math.round(CARD_HEIGHT * 0.72);
const BAR_H = CARD_HEIGHT - HERO_H;

const ABOUT_MAX = 110;

const ROLE_LABELS: Record<string, string> = {
  creator: 'Creator',
  music_creator: 'Music Creator',
  podcast_creator: 'Podcast Creator',
  industry_professional: 'Industry Professional',
  music_lover: 'Music Lover',
  event_organiser: 'Event Organiser',
  vocalist: 'Vocalist',
  producer: 'Producer',
  dj: 'DJ',
};

function truncate(text: string | null | undefined, max = ABOUT_MAX): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}

function roleLabel(role: string | null | undefined): string | null {
  if (!role) return null;
  return ROLE_LABELS[role.toLowerCase()] || null;
}

export interface PhotoTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface CreatorDigitalCardProps {
  creatorName: string;
  username: string;
  bio?: string | null;
  headline?: string | null;
  role?: string | null;
  cardPhotoUri?: string | null;
  avatarUrl?: string | null;
  fanUrl: string;
  photoTransform?: PhotoTransform;
  photoNaturalHeight?: number;
  // Cryptographic auth token from POST /api/card/generate-token
  // When present, QR encodes JSON payload. Without it, falls back to plain URL.
  authToken?: string | null;
  creatorId?: string | null;
}

export default function CreatorDigitalCard({
  creatorName,
  username,
  bio,
  headline,
  role,
  cardPhotoUri,
  avatarUrl,
  fanUrl,
  photoTransform,
  photoNaturalHeight,
  authToken,
  creatorId,
}: CreatorDigitalCardProps) {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    BarlowCondensed_400Regular,
    Cinzel_400Regular,
  });

  const photoUri = cardPhotoUri || avatarUrl;

  const cinzel = fontsLoaded ? 'Cinzel_400Regular' : undefined;
  const bebas = fontsLoaded ? 'BebasNeue_400Regular' : undefined;
  const barlow = fontsLoaded ? 'BarlowCondensed_400Regular' : undefined;

  const nameParts = creatorName.trim().split(/\s+/);
  const nameLine1 = nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' ');
  const nameLine2 = nameParts.slice(Math.ceil(nameParts.length / 2)).join(' ');

  const qrSize = Math.round(CARD_WIDTH * 0.13);

  const qrValue = authToken && creatorId
    ? JSON.stringify({ url: fanUrl, token: authToken, uid: creatorId })
    : `https://${fanUrl}`;

  // Bio content: headline + bio, or role fallback, or prompt
  const hasHeadline = !!headline?.trim();
  const hasBio = !!bio?.trim();
  const hasRole = !!roleLabel(role);
  const hasAnyInfo = hasHeadline || hasBio || hasRole;

  return (
    <View style={styles.card}>
      {/* ── HERO ── */}
      <View style={styles.hero}>
        {/* Top strip: EXCLUSIVE FAMILY left | logo right */}
        <View style={styles.topStrip}>
          <Text style={[styles.topLabel, barlow && { fontFamily: barlow }]}>
            EXCLUSIVE FAMILY
          </Text>
          <Image
            source={DIGITAL_LOGO}
            style={styles.topLogo}
            resizeMode="contain"
          />
        </View>

        {/* SOUNDBRIDGE headline — Cinzel, centered */}
        <Text
          style={[styles.headline, cinzel && { fontFamily: cinzel }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          SOUNDBRIDGE
        </Text>

        {/* Profile photo at natural aspect ratio — no cropping, anchored to bottom */}
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={[
              styles.profilePhoto,
              { height: photoNaturalHeight ?? HERO_H },
              photoTransform && {
                transform: [
                  { translateX: photoTransform.translateX },
                  { translateY: photoTransform.translateY },
                  { scale: photoTransform.scale },
                ],
              },
            ]}
            resizeMode="stretch"
          />
        ) : null}

        {/* QR code — bottom-left of hero */}
        <View style={styles.qrWrapper}>
          <QRCode
            value={qrValue}
            size={qrSize}
            color="#ffffff"
            backgroundColor="transparent"
          />
        </View>
      </View>

      {/* ── BOTTOM BLACK BAR ── */}
      <View style={styles.bar}>
        {/* Creator name */}
        <View style={styles.nameBlock}>
          <Text
            style={[styles.nameLine, bebas && { fontFamily: bebas }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {nameLine1}
          </Text>
          {nameLine2 ? (
            <Text
              style={[styles.nameLine, bebas && { fontFamily: bebas }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {nameLine2}
            </Text>
          ) : null}
        </View>

        {/* Vertical divider */}
        <View style={styles.divider} />

        {/* Right info block */}
        <View style={styles.infoBlock}>
          {/* Fixed tagline */}
          <Text style={[styles.tagline, barlow && { fontFamily: barlow }]}>
            Join my space on SoundBridge
          </Text>

          {/* Professional headline */}
          {hasHeadline && (
            <Text
              style={[styles.headlineText, barlow && { fontFamily: barlow }]}
              numberOfLines={1}
            >
              {headline}
            </Text>
          )}

          {/* Bio or role fallback or prompt */}
          {hasBio ? (
            <Text style={[styles.aboutText, barlow && { fontFamily: barlow }]} numberOfLines={3}>
              {truncate(bio)}
            </Text>
          ) : hasRole && !hasHeadline ? (
            <Text style={[styles.aboutText, barlow && { fontFamily: barlow }]} numberOfLines={1}>
              {roleLabel(role)}
            </Text>
          ) : !hasAnyInfo ? (
            <Text style={[styles.promptText, barlow && { fontFamily: barlow }]} numberOfLines={2}>
              Add your headline & bio via the ✏️ on your profile to enhance this card.
            </Text>
          ) : null}

          <Text style={[styles.fanUrlText, barlow && { fontFamily: barlow }]} numberOfLines={1}>
            soundbridge.live/{username}/home
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, barlow && { fontFamily: barlow }]}>
          www.soundbridge.live
        </Text>
      </View>
    </View>
  );
}

const s = {
  nameFontSize: Math.round(CARD_WIDTH * 0.095),
  headlineFontSize: Math.round(CARD_WIDTH * 0.165),
  topLabelSize: Math.round(CARD_WIDTH * 0.036),
  taglineSize: Math.round(CARD_WIDTH * 0.044),
  headlineInfoSize: Math.round(CARD_WIDTH * 0.038),
  aboutSize: Math.round(CARD_WIDTH * 0.038),
  promptSize: Math.round(CARD_WIDTH * 0.033),
  fanUrlSize: Math.round(CARD_WIDTH * 0.033),
  footerSize: Math.round(CARD_WIDTH * 0.030),
  barPadH: Math.round(CARD_WIDTH * 0.04),
  nameBlockW: Math.round(CARD_WIDTH * 0.28),
  logoH: Math.round(CARD_WIDTH * 0.07),
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  hero: {
    width: CARD_WIDTH,
    height: HERO_H,
    overflow: 'hidden',
    backgroundColor: '#8b0020',
  },
  topStrip: {
    position: 'absolute',
    top: Math.round(CARD_WIDTH * 0.03),
    left: Math.round(CARD_WIDTH * 0.04),
    right: Math.round(CARD_WIDTH * 0.04),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  topLabel: {
    color: '#ffffff',
    fontSize: s.topLabelSize,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  topLogo: {
    height: s.logoH,
    width: s.logoH,
  },
  headline: {
    position: 'absolute',
    top: Math.round(HERO_H * 0.11),
    left: Math.round(CARD_WIDTH * 0.03),
    right: Math.round(CARD_WIDTH * 0.03),
    fontSize: s.headlineFontSize,
    color: '#ffffff',
    letterSpacing: 3,
    textAlign: 'center',
    zIndex: 1,
  },
  profilePhoto: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: CARD_WIDTH,
    zIndex: 2,
  },
  qrWrapper: {
    position: 'absolute',
    bottom: Math.round(CARD_WIDTH * 0.025),
    left: Math.round(CARD_WIDTH * 0.04),
    zIndex: 10,
    padding: 3,
    backgroundColor: 'transparent',
  },
  bar: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: s.barPadH,
    paddingTop: Math.round(BAR_H * 0.1),
    paddingBottom: Math.round(BAR_H * 0.32),
  },
  nameBlock: {
    width: s.nameBlockW,
    justifyContent: 'center',
    paddingTop: Math.round(BAR_H * 0.04),
  },
  nameLine: {
    color: '#f5c842',
    fontSize: s.nameFontSize,
    lineHeight: s.nameFontSize * 1.0,
    letterSpacing: 0.5,
    fontWeight: '900',
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: '#333',
    marginHorizontal: s.barPadH,
    marginTop: Math.round(BAR_H * 0.05),
  },
  infoBlock: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: Math.round(CARD_WIDTH * 0.012),
  },
  tagline: {
    color: '#ffffff',
    fontSize: s.taglineSize,
    lineHeight: s.taglineSize * 1.25,
    letterSpacing: 0.2,
    fontWeight: '600',
  },
  headlineText: {
    color: '#c0a0ff',
    fontSize: s.headlineInfoSize,
    lineHeight: s.headlineInfoSize * 1.2,
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  aboutText: {
    color: '#aaaaaa',
    fontSize: s.aboutSize,
    lineHeight: s.aboutSize * 1.3,
    letterSpacing: 0.2,
  },
  promptText: {
    color: '#888888',
    fontSize: s.promptSize,
    lineHeight: s.promptSize * 1.3,
    fontStyle: 'italic',
  },
  fanUrlText: {
    color: '#666666',
    fontSize: s.fanUrlSize,
    letterSpacing: 0.3,
    marginTop: Math.round(CARD_WIDTH * 0.008),
  },
  footer: {
    position: 'absolute',
    bottom: Math.round(BAR_H * 0.07),
    left: s.barPadH,
    right: s.barPadH,
  },
  footerText: {
    color: '#444444',
    fontSize: s.footerSize,
    letterSpacing: 0.5,
  },
});
