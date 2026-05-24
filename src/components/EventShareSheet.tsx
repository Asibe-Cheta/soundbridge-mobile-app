import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import EventShareCard, { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from './EventShareCard';
import eventAnalyticsService from '../services/EventAnalyticsService';

let captureRef: ((ref: any, opts?: any) => Promise<string>) | null = null;
try {
  captureRef = require('react-native-view-shot').captureRef;
} catch {}

interface Props {
  visible: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    event_date: string;
    location: string;
    venue?: string;
    category: string;
    image_url?: string;
    cover_image_url?: string;
    organizer?: {
      display_name: string;
      avatar_url?: string;
    };
  };
}

export default function EventShareSheet({ visible, onClose, event }: Props) {
  const { theme } = useTheme();
  const cardRef = useRef<View>(null);
  const [capturingCard, setCapturingCard] = useState(false);

  const eventUrl = `https://soundbridge.live/events/${event.id}`;
  const shareMessage = `Check out this event on SoundBridge: ${event.title} — ${new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — ${event.venue || event.location}`;

  const handleShareLink = async () => {
    onClose();
    try {
      await Share.share({
        message: Platform.OS === 'android'
          ? `${shareMessage}\n${eventUrl}`
          : shareMessage,
        url: eventUrl,
        title: event.title,
      });
      await eventAnalyticsService.trackAction(event.id, 'share_link');
    } catch (err: any) {
      if (err.message !== 'User did not share') {
        Alert.alert('Error', 'Could not open share sheet.');
      }
    }
  };

  const handleShareCard = async () => {
    if (!captureRef) {
      Alert.alert('Not available', 'Card sharing is not available on this device.');
      return;
    }

    try {
      setCapturingCard(true);

      // Small delay so the card renders before capture
      await new Promise((r) => setTimeout(r, 200));

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
      });

      onClose();

      await Share.share({
        url: uri,
        title: event.title,
        message: shareMessage,
      });

      await eventAnalyticsService.trackAction(event.id, 'share_card');
    } catch (err: any) {
      if (err.message !== 'User did not share') {
        Alert.alert('Error', 'Could not generate share card.');
      }
    } finally {
      setCapturingCard(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />

        <Text style={[styles.title, { color: theme.colors.text }]}>Share Event</Text>

        {/* Hidden card for capture — positioned off-screen */}
        <View style={styles.offScreen} pointerEvents="none">
          <View ref={cardRef} collapsable={false}>
            <EventShareCard
              title={event.title}
              eventDate={event.event_date}
              location={event.location}
              venue={event.venue}
              category={event.category}
              coverImageUrl={event.image_url || event.cover_image_url}
              organizerName={event.organizer?.display_name}
              organizerAvatarUrl={event.organizer?.avatar_url}
            />
          </View>
        </View>

        {/* Option 1 — Share Link */}
        <TouchableOpacity
          style={[styles.option, { borderColor: theme.colors.border }]}
          onPress={handleShareLink}
          activeOpacity={0.7}
        >
          <View style={[styles.optionIcon, { backgroundColor: theme.colors.primary + '18' }]}>
            <Ionicons name="link-outline" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: theme.colors.text }]}>Share Link</Text>
            <Text style={[styles.optionSub, { color: theme.colors.textSecondary }]}>
              Send a direct link to this event
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Option 2 — Share Card */}
        <TouchableOpacity
          style={[styles.option, { borderColor: theme.colors.border }]}
          onPress={handleShareCard}
          disabled={capturingCard}
          activeOpacity={0.7}
        >
          <View style={[styles.optionIcon, { backgroundColor: theme.colors.primary + '18' }]}>
            {capturingCard ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name="image-outline" size={22} color={theme.colors.primary} />
            )}
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: theme.colors.text }]}>Share Card</Text>
            <Text style={[styles.optionSub, { color: theme.colors.textSecondary }]}>
              Generate a branded image card
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: theme.colors.border }]}
          onPress={onClose}
        >
          <Text style={[styles.cancelText, { color: theme.colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  offScreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 13,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
