import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  StatusBar,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../contexts/ThemeContext';
import EventTicketService, { EventTicket } from '../services/EventTicketService';
import BackButton from '../components/BackButton';
import { SystemTypography as Typography } from '../constants/Typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TicketWalletScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<EventTicket | null>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await EventTicketService.getAllUserTickets();
      setTickets(data);
    } catch (error) {
      console.error('❌ Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareTicket = useCallback(async (ticket: EventTicket) => {
    const eventName = ticket.event?.title || 'an event';
    try {
      await Share.share({
        message: `I'm attending ${eventName} on SoundBridge! Ticket: ${ticket.ticket_code}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColour = (status: EventTicket['status']) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'used':
        return theme.colors.textSecondary;
      case 'refunded':
        return theme.colors.error;
    }
  };

  const getStatusLabel = (status: EventTicket['status']) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'used':
        return 'Used';
      case 'refunded':
        return 'Refunded';
    }
  };

  const qrDataFor = (ticket: EventTicket) =>
    JSON.stringify({
      ticketId: ticket.id,
      ticketCode: ticket.ticket_code,
      eventId: ticket.event_id,
      userId: ticket.user_id,
      quantity: ticket.quantity,
    });

  const renderTicket = ({ item }: { item: EventTicket }) => {
    const event = item.event;
    const isActive = item.status === 'active';

    return (
      <TouchableOpacity
        style={styles.ticketRow}
        onPress={() => setSelectedTicket(item)}
        activeOpacity={0.8}
      >
        <BlurView
          intensity={15}
          tint={theme.isDark ? 'dark' : 'light'}
          style={[styles.ticketCard, { borderColor: theme.colors.border }]}
        >
          {/* Event image */}
          {event?.image_url ? (
            <Image source={{ uri: event.image_url }} style={styles.eventImage} />
          ) : (
            <View style={[styles.eventImagePlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="ticket" size={28} color={theme.colors.primary} />
            </View>
          )}

          {/* Ticket info */}
          <View style={styles.ticketInfo}>
            <Text
              style={[styles.ticketEventName, { color: theme.colors.text }]}
              numberOfLines={2}
            >
              {event?.title || 'Event'}
            </Text>

            {event?.event_date && (
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={12} color={theme.colors.primary} />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {formatDate(event.event_date)} · {formatTime(event.event_date)}
                </Text>
              </View>
            )}

            {(event?.venue || event?.location) && (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={12} color={theme.colors.primary} />
                <Text
                  style={[styles.metaText, { color: theme.colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {event?.venue || event?.location}
                </Text>
              </View>
            )}

            <View style={styles.ticketFooter}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColour(item.status) + '20' },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColour(item.status) },
                  ]}
                />
                <Text style={[styles.statusText, { color: getStatusColour(item.status) }]}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
              {item.quantity > 1 && (
                <Text style={[styles.qtyText, { color: theme.colors.textSecondary }]}>
                  x{item.quantity}
                </Text>
              )}
            </View>
          </View>

          {/* Chevron */}
          {isActive && (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.colors.textSecondary}
              style={styles.chevron}
            />
          )}
        </BlurView>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.backgroundGradient.start,
          theme.colors.backgroundGradient.middle,
          theme.colors.backgroundGradient.end,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
          ]}
        >
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Tickets</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.centred}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : tickets.length === 0 ? (
          <View style={styles.centred}>
            <Ionicons name="ticket-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No tickets yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Browse events and buy a ticket to see it here
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('AllEvents' as never)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#DC2626', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.browseButtonGradient}
              >
                <Ionicons name="ticket-outline" size={18} color="#FFF" />
                <Text style={styles.browseButtonText}>Browse Events</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={tickets}
            keyExtractor={(item) => item.id}
            renderItem={renderTicket}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onRefresh={loadTickets}
            refreshing={loading}
          />
        )}
      </SafeAreaView>

      {/* Full-screen QR Modal */}
      <Modal
        visible={!!selectedTicket}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTicket(null)}
      >
        {selectedTicket && (
          <View style={styles.modalOverlay}>
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />

            <View
              style={[
                styles.modalSheet,
                { backgroundColor: theme.colors.background },
              ]}
            >
              {/* Handle */}
              <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />

              {/* Close */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedTicket(null)}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>

              <Text
                style={[styles.modalEventName, { color: theme.colors.text }]}
                numberOfLines={2}
              >
                {selectedTicket.event?.title || 'Event'}
              </Text>

              {selectedTicket.event?.event_date && (
                <Text style={[styles.modalMeta, { color: theme.colors.textSecondary }]}>
                  {formatDate(selectedTicket.event.event_date)} · {formatTime(selectedTicket.event.event_date)}
                </Text>
              )}

              {(selectedTicket.event?.venue || selectedTicket.event?.location) && (
                <Text style={[styles.modalMeta, { color: theme.colors.textSecondary }]}>
                  {selectedTicket.event?.venue || selectedTicket.event?.location}
                </Text>
              )}

              {/* Large QR */}
              <View style={[styles.largeQrContainer, { backgroundColor: '#FFFFFF' }]}>
                <QRCode
                  value={qrDataFor(selectedTicket)}
                  size={SCREEN_WIDTH * 0.55}
                  backgroundColor="#FFFFFF"
                  color="#000000"
                />
              </View>

              <Text style={[styles.modalTicketCode, { color: theme.colors.textSecondary }]}>
                {selectedTicket.ticket_code}
              </Text>

              <Text style={[styles.modalHint, { color: theme.colors.textSecondary }]}>
                Show this QR code at the door
              </Text>

              {/* Share button */}
              <TouchableOpacity
                style={[
                  styles.shareButton,
                  { borderColor: theme.colors.border },
                ]}
                onPress={() => {
                  setSelectedTicket(null);
                  handleShareTicket(selectedTicket);
                }}
              >
                <Ionicons name="share-outline" size={18} color={theme.colors.text} />
                <Text style={[styles.shareButtonText, { color: theme.colors.text }]}>
                  Share Ticket
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Typography.body.fontFamily,
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -0.4,
    lineHeight: 40,
  },
  headerSpacer: { width: 40 },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  browseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 24,
  },
  browseButtonText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    color: '#FFFFFF',
    fontSize: 15,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  ticketRow: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  ticketCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 12,
    alignItems: 'center',
  },
  eventImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 14,
  },
  eventImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketInfo: {
    flex: 1,
    gap: 4,
  },
  ticketEventName: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 11,
  },
  qtyText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 12,
  },
  chevron: {
    marginLeft: 8,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 12,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 4,
  },
  modalEventName: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 32,
  },
  modalMeta: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 2,
  },
  largeQrContainer: {
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  modalTicketCode: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: 1.5,
    fontSize: 14,
    marginBottom: 6,
  },
  modalHint: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 13,
    marginBottom: 24,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  shareButtonText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 15,
  },
});
