// src/screens/UrgentGigConfirmationScreen.tsx
// C5 — Shown to the requester after selecting a provider.
// Confirms selection, shows gig summary, links to chat and gig detail.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

type RouteParams = {
  UrgentGigConfirmation: {
    gigId: string;
    projectId: string;
    providerName: string;
    providerAvatar?: string;
    gigTitle: string;
    gigDateTime?: string;
    gigLocation?: string;
    paymentAmount?: number;
    currency?: string;
  };
};

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', NGN: '₦' };

export default function UrgentGigConfirmationScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'UrgentGigConfirmation'>>();
  const {
    gigId,
    projectId,
    providerName,
    providerAvatar,
    gigTitle,
    gigDateTime,
    gigLocation,
    paymentAmount,
    currency = 'GBP',
  } = route.params;

  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  const PLATFORM_FEE_PCT = 0.15;
  const creatorReceives = paymentAmount != null
    ? +(paymentAmount * (1 - PLATFORM_FEE_PCT)).toFixed(2)
    : null;

  function formatDateTime(iso?: string) {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
           ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <LinearGradient
      colors={theme.isDark ? ['#0F0F1A', '#1A0A2E', '#0D1117'] : ['#F8F4FF', '#EEE8FF', '#F0EBFF']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Success icon */}
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.successCircle}
          >
            <Ionicons name="checkmark" size={48} color="#fff" />
          </LinearGradient>

          <Text style={[styles.title, { color: theme.colors.text }]}>
            You've selected {providerName}!
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            They've been notified and will confirm shortly.
          </Text>

          {/* Provider chip */}
          <View style={[styles.providerChip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {providerAvatar
              ? <Image source={{ uri: providerAvatar }} style={styles.providerAvatar} />
              : <View style={[styles.providerAvatarPlaceholder, { backgroundColor: theme.colors.primary + '30' }]}>
                  <Ionicons name="person" size={18} color={theme.colors.primary} />
                </View>
            }
            <Text style={[styles.providerName, { color: theme.colors.text }]}>{providerName}</Text>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Awaiting confirmation</Text>
            </View>
          </View>

          {/* Gig summary card */}
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>{gigTitle}</Text>
            {gigDateTime && (
              <View style={styles.summaryRow}>
                <Ionicons name="calendar-outline" size={15} color={theme.colors.primary} />
                <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
                  {formatDateTime(gigDateTime)}
                </Text>
              </View>
            )}
            {gigLocation && (
              <View style={styles.summaryRow}>
                <Ionicons name="location-outline" size={15} color={theme.colors.primary} />
                <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
                  {gigLocation}
                </Text>
              </View>
            )}
            {paymentAmount != null && (
              <View style={styles.summaryRow}>
                <Ionicons name="cash-outline" size={15} color={theme.colors.primary} />
                <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
                  {sym}{paymentAmount.toFixed(2)} held in escrow · {providerName} receives {sym}{creatorReceives}
                </Text>
              </View>
            )}
          </View>

          {/* Info note */}
          <View style={[styles.infoNote, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
            <Text style={[styles.infoText, { color: '#1D4ED8' }]}>
              Payment is held securely until you confirm the gig is complete. Use the chat to coordinate details.
            </Text>
          </View>

          {/* Action buttons */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Chat' as never, { projectId } as never)}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#6C63FF', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
              <Text style={styles.btnText}>Message {providerName}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('OpportunityProject' as never, { projectId } as never)}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.colors.text }]}>View Gig Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.navigate('MyOpportunities' as never)}
          >
            <Text style={[styles.doneBtnText, { color: theme.colors.textSecondary }]}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  providerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  providerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  pendingBadge: {
    backgroundColor: '#F59E0B20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignSelf: 'stretch',
    marginBottom: 12,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  primaryBtn: {
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  btnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  doneBtn: {
    paddingVertical: 12,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
