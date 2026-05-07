import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { EventTicket } from '../services/EventTicketService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Asset } from 'expo-asset';

const LOGO_MODULE = require('../../assets/images/logos/logo-trans-lockup.png');

async function getLogoDataUri(): Promise<string> {
  try {
    const asset = Asset.fromModule(LOGO_MODULE);
    await asset.downloadAsync();
    const b64 = await FileSystem.readAsStringAsync(asset.localUri!, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/png;base64,${b64}`;
  } catch {
    return '';
  }
}
import { config } from '../config/environment';

interface RouteParams {
  ticket: EventTicket;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventVenue?: string;
}

export default function TicketConfirmationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { user } = useAuth();

  const { ticket, eventTitle, eventDate, eventLocation, eventVenue } =
    route.params as RouteParams;

  const [emailSending, setEmailSending] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Checkmark pop
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Content fade + slide in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
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

  const shareTicketReceipt = async () => {
    try {
      const purchaseDate = new Date(ticket.purchase_date || Date.now());
      const sym = ticket.currency === 'GBP' ? '£' : ticket.currency === 'NGN' ? '₦' : '$';
      const logoUri = await getLogoDataUri();
      const refShort = ticket.ticket_code;
      const css = `
        @page { margin: 16mm 20mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; background: #fff; color: #111; font-size: 15px; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 4px solid #C0392B; margin-bottom: 36px; }
        .header-left .receipt-word { font-size: 36px; font-weight: 900; color: #111; letter-spacing: -1px; }
        .header-left .ref { font-size: 14px; color: #444; margin-top: 6px; font-weight: 500; }
        .logo-img { height: 110px; object-fit: contain; }
        .amount-block { margin-bottom: 36px; }
        .amount-label { font-size: 13px; color: #444; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 10px; font-weight: 700; }
        .amount { font-size: 56px; font-weight: 900; color: #C0392B; letter-spacing: -2px; line-height: 1; }
        .type { font-size: 20px; font-weight: 600; color: #222; margin-top: 12px; }
        .status-badge { display: inline-block; background: #10B981; color: #fff; font-size: 13px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 6px 18px; border-radius: 20px; margin-top: 12px; }
        .ticket-code-block { background: #fef2f2; border: 2px dashed #C0392B; border-radius: 12px; text-align: center; padding: 22px; margin: 28px 0; }
        .ticket-code-label { font-size: 13px; color: #333; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-weight: 700; }
        .ticket-code { font-size: 36px; font-weight: 900; color: #C0392B; letter-spacing: 5px; font-family: 'Courier New', monospace; }
        .section-title { font-size: 12px; color: #222; text-transform: uppercase; letter-spacing: 1.2px; padding-bottom: 10px; border-bottom: 2px solid #ccc; margin-bottom: 6px; font-weight: 800; }
        .d-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 13px 0; border-bottom: 1px solid #ddd; gap: 16px; }
        .d-row:last-child { border-bottom: none; }
        .d-label { font-size: 14px; color: #444; flex: 1; font-weight: 600; }
        .d-value { font-size: 14px; font-weight: 700; color: #111; flex: 2; text-align: right; word-break: break-all; }
        .mono { font-family: 'Courier New', monospace; font-size: 12px; }
        .divider { border: none; border-top: 2px dashed #bbb; margin: 30px 0; }
        .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 2px solid #ddd; padding-top: 24px; }
        .footer-left .brand { font-size: 17px; font-weight: 800; color: #C0392B; }
        .footer-left p { font-size: 13px; color: #444; line-height: 1.9; font-weight: 500; }
        .footer-right { text-align: right; font-size: 13px; color: #444; font-style: italic; line-height: 1.9; font-weight: 500; }
      `;
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${css}</style></head>
        <body>
          <div class="header">
            <div class="header-left">
              <div class="receipt-word">TICKET RECEIPT</div>
              <div class="ref">Order: ${refShort} · ${purchaseDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
            ${logoUri ? `<img class="logo-img" src="${logoUri}" alt="SoundBridge Live" />` : '<span style="font-size:20px;font-weight:800;color:#C0392B;">SoundBridge Live</span>'}
          </div>

          <div class="amount-block">
            <div class="amount-label">Amount Paid</div>
            <div class="amount">${sym}${ticket.amount_paid}</div>
            <div class="type">${eventTitle}</div>
            <div class="status-badge">ACTIVE TICKET</div>
          </div>

          <div class="ticket-code-block">
            <div class="ticket-code-label">Ticket Code — present at door</div>
            <div class="ticket-code">${ticket.ticket_code}</div>
          </div>

          <hr class="divider" />

          <div class="section-title">Event Details</div>
          <div class="d-row"><span class="d-label">Event</span><span class="d-value">${eventTitle}</span></div>
          <div class="d-row"><span class="d-label">Date & Time</span><span class="d-value">${formatDate(eventDate)} at ${formatTime(eventDate)}</span></div>
          <div class="d-row"><span class="d-label">Venue</span><span class="d-value">${eventVenue || eventLocation || '—'}</span></div>
          <div class="d-row"><span class="d-label">Quantity</span><span class="d-value">${ticket.quantity} ticket${ticket.quantity > 1 ? 's' : ''}</span></div>

          <hr class="divider" />

          <div class="section-title">Payment Details</div>
          <div class="d-row"><span class="d-label">Amount Paid</span><span class="d-value">${sym}${ticket.amount_paid}</span></div>
          <div class="d-row"><span class="d-label">Currency</span><span class="d-value">${ticket.currency}</span></div>
          <div class="d-row"><span class="d-label">Payment Method</span><span class="d-value">Stripe (Card Payment)</span></div>
          <div class="d-row"><span class="d-label">Ticket ID</span><span class="d-value mono">${ticket.id}</span></div>
          ${ticket.payment_intent_id ? `<div class="d-row"><span class="d-label">Stripe Reference</span><span class="d-value mono">${ticket.payment_intent_id}</span></div>` : ''}
          <div class="d-row"><span class="d-label">Purchase Date</span><span class="d-value">${purchaseDate.toUTCString()}</span></div>
          <div class="d-row"><span class="d-label">VAT</span><span class="d-value">Contact us for VAT invoice</span></div>

          <div class="footer">
            <div class="footer-left">
              <p class="brand">SoundBridge Live Ltd</p>
              <p>Co. No. 16854928</p>
              <p>4 Whitlock House, 2 Cedar Grove, Wokingham, UK</p>
              <p>contact@soundbridge.live · soundbridge.live</p>
            </div>
            <div class="footer-right">
              Thank you for your purchase.<br/>
              Quote order <strong>${refShort}</strong> for support.
            </div>
          </div>
        </body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const dest = FileSystem.cacheDirectory + `soundbridge_ticket_${ticket.ticket_code}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: dest });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: 'Share Ticket Receipt', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Not available', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Error sharing ticket receipt:', error);
      Alert.alert('Error', 'Failed to share receipt. Please try again.');
    }
  };

  const emailTicketReceipt = async () => {
    if (!user?.email) return;
    try {
      setEmailSending(true);
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const apiBase = config.apiUrl.endsWith('/api') ? config.apiUrl : `${config.apiUrl}/api`;
      const response = await fetch(`${apiBase}/event-tickets/${ticket.id}/send-receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        Alert.alert('Receipt Sent', `Your ticket receipt has been sent to ${user.email}`);
      } else {
        Alert.alert('Error', 'Failed to send receipt. Please try again.');
      }
    } catch (error) {
      console.error('Error emailing ticket receipt:', error);
      Alert.alert('Error', 'Failed to send receipt. Please try again.');
    } finally {
      setEmailSending(false);
    }
  };

  const qrData = JSON.stringify({
    ticketId: ticket.id,
    ticketCode: ticket.ticket_code,
    eventId: ticket.event_id,
    userId: ticket.user_id,
    quantity: ticket.quantity,
  });

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

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success icon */}
          <Animated.View
            style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.checkGradient}
            >
              <Ionicons name="checkmark" size={40} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Animated.View
            style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          >
            <Text style={[styles.title, { color: theme.colors.text }]}>
              You're going!
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Order #{ticket.ticket_code}
            </Text>

            {/* Email notice */}
            <View
              style={[
                styles.emailNotice,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <Ionicons name="mail-outline" size={16} color="#10B981" />
              <Text style={[styles.emailNoticeText, { color: theme.colors.textSecondary }]}>
                Ticket sent to{' '}
                <Text style={{ color: theme.colors.text, fontWeight: '600' }}>
                  {user?.email}
                </Text>
              </Text>
            </View>

            {/* Ticket card */}
            <View style={styles.ticketCardWrapper}>
              <BlurView
                intensity={20}
                tint={theme.isDark ? 'dark' : 'light'}
                style={[
                  styles.ticketCard,
                  { borderColor: theme.colors.border },
                ]}
              >
                {/* Ticket top: event info */}
                <View style={styles.ticketTop}>
                  <Text
                    style={[styles.ticketEventName, { color: theme.colors.text }]}
                    numberOfLines={2}
                  >
                    {eventTitle}
                  </Text>

                  <View style={styles.ticketMeta}>
                    <View style={styles.ticketMetaRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={theme.colors.primary}
                      />
                      <Text
                        style={[styles.ticketMetaText, { color: theme.colors.textSecondary }]}
                      >
                        {formatDate(eventDate)}
                      </Text>
                    </View>
                    <View style={styles.ticketMetaRow}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={theme.colors.primary}
                      />
                      <Text
                        style={[styles.ticketMetaText, { color: theme.colors.textSecondary }]}
                      >
                        {formatTime(eventDate)}
                      </Text>
                    </View>
                    <View style={styles.ticketMetaRow}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color={theme.colors.primary}
                      />
                      <Text
                        style={[styles.ticketMetaText, { color: theme.colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {eventVenue || eventLocation}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ticketDetails}>
                    <View style={styles.ticketDetailItem}>
                      <Text style={[styles.ticketDetailLabel, { color: theme.colors.textSecondary }]}>
                        Qty
                      </Text>
                      <Text style={[styles.ticketDetailValue, { color: theme.colors.text }]}>
                        {ticket.quantity}
                      </Text>
                    </View>
                    <View style={[styles.dividerV, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.ticketDetailItem}>
                      <Text style={[styles.ticketDetailLabel, { color: theme.colors.textSecondary }]}>
                        Paid
                      </Text>
                      <Text style={[styles.ticketDetailValue, { color: theme.colors.text }]}>
                        {ticket.currency === 'GBP' ? '£' : '₦'}
                        {ticket.amount_paid}
                      </Text>
                    </View>
                    <View style={[styles.dividerV, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.ticketDetailItem}>
                      <Text style={[styles.ticketDetailLabel, { color: theme.colors.textSecondary }]}>
                        Status
                      </Text>
                      <Text style={[styles.ticketDetailValue, { color: '#10B981' }]}>
                        Active
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Tear line */}
                <View style={styles.tearLine}>
                  <View style={[styles.tearCircleLeft, { backgroundColor: theme.colors.backgroundGradient.start }]} />
                  <View style={styles.tearDashes}>
                    {Array.from({ length: 16 }).map((_, i) => (
                      <View
                        key={i}
                        style={[styles.tearDash, { backgroundColor: theme.colors.border }]}
                      />
                    ))}
                  </View>
                  <View style={[styles.tearCircleRight, { backgroundColor: theme.colors.backgroundGradient.start }]} />
                </View>

                {/* Ticket bottom: QR */}
                <View style={styles.ticketBottom}>
                  <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF' }]}>
                    <QRCode
                      value={qrData}
                      size={120}
                      backgroundColor="#FFFFFF"
                      color="#000000"
                    />
                  </View>
                  <Text style={[styles.ticketCode, { color: theme.colors.textSecondary }]}>
                    {ticket.ticket_code}
                  </Text>
                  <Text style={[styles.qrHint, { color: theme.colors.textSecondary }]}>
                    Show this at the door
                  </Text>
                </View>
              </BlurView>
            </View>

            {/* CTAs */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() =>
                navigation.navigate('TicketWallet' as never)
              }
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primary + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>View My Tickets</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { borderColor: theme.colors.border },
              ]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>
                Back to Event
              </Text>
            </TouchableOpacity>

            {/* Receipt actions */}
            <View style={styles.receiptActionsRow}>
              <TouchableOpacity
                style={[styles.receiptBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={shareTicketReceipt}
                activeOpacity={0.75}
              >
                <Ionicons name="share-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.receiptBtnText, { color: theme.colors.primary }]}>Share Receipt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.receiptBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={emailTicketReceipt}
                disabled={emailSending}
                activeOpacity={0.75}
              >
                <Ionicons name="mail-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.receiptBtnText, { color: theme.colors.primary }]}>
                  {emailSending ? 'Sending…' : 'Email Receipt'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  checkGradient: {
    flex: 1,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  emailNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 28,
    alignSelf: 'stretch',
  },
  emailNoticeText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  ticketCardWrapper: {
    alignSelf: 'stretch',
    marginBottom: 28,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  ticketCard: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  ticketTop: {
    padding: 20,
  },
  ticketEventName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
    lineHeight: 26,
  },
  ticketMeta: {
    gap: 8,
    marginBottom: 16,
  },
  ticketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketMetaText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ticketDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  ticketDetailLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  ticketDetailValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  dividerV: {
    width: 1,
    height: 32,
  },
  tearLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -1,
  },
  tearCircleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
  },
  tearDashes: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  tearDash: {
    width: 6,
    height: 1,
  },
  tearCircleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: -10,
  },
  ticketBottom: {
    padding: 20,
    alignItems: 'center',
  },
  qrContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  ticketCode: {
    fontSize: 13,
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginBottom: 4,
  },
  qrHint: {
    fontSize: 12,
  },
  primaryButton: {
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  receiptActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  receiptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  receiptBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
