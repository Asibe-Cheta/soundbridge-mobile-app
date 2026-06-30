import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';

const MOCK_TRANSACTIONS = [
  {
    id: '1',
    icon: 'flash' as const,
    iconColor: '#10B981',
    type: 'Gig Payment',
    description: 'Live DJ Set — The Venue LA',
    date: 'Today',
    amount: '+$450.00',
    amountColor: '#10B981',
    status: 'COMPLETED',
    statusBg: '#10B98120',
  },
  {
    id: '2',
    icon: 'heart' as const,
    iconColor: '#EC4899',
    type: 'Fan Tip',
    description: '"Midnight Echoes"',
    date: '2 days ago',
    amount: '+$125.50',
    amountColor: '#10B981',
    status: 'COMPLETED',
    statusBg: '#10B98120',
  },
  {
    id: '3',
    icon: 'star' as const,
    iconColor: '#FBBF24',
    type: 'Creator Revenue Share',
    description: 'Premium subscription earnings',
    date: '5 days ago',
    amount: '+$288.00',
    amountColor: '#10B981',
    status: 'COMPLETED',
    statusBg: '#10B98120',
  },
  {
    id: '4',
    icon: 'heart' as const,
    iconColor: '#EC4899',
    type: 'Fan Tip',
    description: '"Urban Frequencies"',
    date: '1 week ago',
    amount: '+$87.25',
    amountColor: '#10B981',
    status: 'COMPLETED',
    statusBg: '#10B98120',
  },
  {
    id: '5',
    icon: 'heart' as const,
    iconColor: '#EC4899',
    type: 'Fan Tip',
    description: '"Neon Lights"',
    date: '2 weeks ago',
    amount: '+$63.00',
    amountColor: '#10B981',
    status: 'COMPLETED',
    statusBg: '#10B98120',
  },
];

export default function DemoWalletScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Digital Wallet</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

          {/* Wallet Balance Card */}
          <LinearGradient
            colors={['#4C1D95', '#9D174D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.walletCard, { borderColor: theme.colors.border }]}
          >
            <View style={styles.walletAccentTopRight} />
            <View style={styles.walletAccentBottomLeft} />

            <View style={styles.walletHeader}>
              <Image
                source={require('../../assets/images/logos/logo-white.png')}
                style={styles.walletLogo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.cardContent}>
              <View>
                <Text style={styles.balanceLabel}>Balance</Text>
                <Text style={styles.balanceAmount}>$1,013.75</Text>
              </View>
              <View style={styles.walletIconBadge}>
                <Ionicons name="wallet" size={18} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.cardFooterLabel}>My Wallet</Text>
                <Text style={styles.cardFooterNumber}>**** **** **** 0000</Text>
              </View>
              <View style={styles.cardBrandDots}>
                <View style={styles.cardBrandDot} />
                <View style={[styles.cardBrandDot, styles.cardBrandDotOffset]} />
              </View>
            </View>
          </LinearGradient>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.withdrawButton} activeOpacity={0.85}>
              <LinearGradient
                colors={['#DC2626', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.withdrawButtonGradient}
              >
                <Ionicons name="arrow-up-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Withdraw</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
              activeOpacity={0.85}
            >
              <Ionicons name="list" size={20} color={theme.colors.text} />
              <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>History</Text>
            </TouchableOpacity>
          </View>

          {/* Creator Revenue Card */}
          <View style={[styles.revenueCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }]}>
            <View style={styles.revenueHeader}>
              <Ionicons name="trending-up" size={24} color={theme.colors.primary} />
              <Text style={[styles.revenueTitle, { color: theme.colors.text }]}>Creator Earnings</Text>
            </View>

            <View style={styles.revenueStats}>
              <View style={styles.revenueStat}>
                <Text style={[styles.revenueStatLabel, { color: theme.colors.textSecondary }]}>Total Earned</Text>
                <Text style={[styles.revenueStatAmount, { color: theme.colors.success }]}>$1,013.75</Text>
              </View>

              <View style={styles.revenueStat}>
                <Text style={[styles.revenueStatLabel, { color: theme.colors.textSecondary }]}>Available Balance</Text>
                <Text style={[styles.revenueStatAmount, { color: theme.colors.primary }]}>$1,013.75</Text>
              </View>

              <View style={styles.revenueStat}>
                <Text style={[styles.revenueStatLabel, { color: theme.colors.textSecondary }]}>Lifetime Payouts</Text>
                <Text style={[styles.revenueStatAmount, { color: theme.colors.text }]}>$245.00</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.requestPayoutButton, { backgroundColor: theme.colors.primary }]}
              activeOpacity={0.85}
            >
              <Ionicons name="cash" size={20} color="#FFFFFF" />
              <Text style={styles.requestPayoutButtonText}>Request Payout</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Transactions */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Transactions</Text>
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
            </View>

            <View style={styles.transactionsList}>
              {MOCK_TRANSACTIONS.map((tx) => (
                <View key={tx.id} style={[styles.transactionItem, { borderBottomColor: theme.colors.border }]}>
                  <View style={[styles.transactionIcon, { backgroundColor: `${tx.iconColor}20` }]}>
                    <Ionicons name={tx.icon} size={24} color={tx.iconColor} />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={[styles.transactionType, { color: theme.colors.text }]}>{tx.type}</Text>
                    <Text style={[styles.transactionDescription, { color: theme.colors.textSecondary }]}>{tx.description}</Text>
                    <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>{tx.date}</Text>
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text style={[styles.amountText, { color: tx.amountColor }]}>{tx.amount}</Text>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: tx.statusBg }]}>
                      <Text style={[styles.statusTextSmall, { color: tx.iconColor === '#EC4899' ? '#10B981' : tx.iconColor }]}>{tx.status}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Wallet Info */}
          <View style={[styles.infoSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoTitle, { color: theme.colors.text }]}>About Digital Wallet</Text>
            </View>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              Your digital wallet securely stores earnings from gigs, tips, and content sales. Once funds are in your wallet, you can request a withdrawal to your local bank account at any time (minimum $25).
            </Text>
            <View style={styles.infoFeatures}>
              <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Gig payments land in your wallet on completion</Text>
              <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Withdraw to your local bank via Fincra (1–2 business days)</Text>
              <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Supports 40+ currencies across Africa, Asia & Latin America</Text>
              <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Real-time transaction tracking</Text>
              <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Minimum withdrawal: $25</Text>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainGradient: { position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8 },
  headerTitle: {
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -0.4,
    lineHeight: 40,
    fontFamily: Typography.body.fontFamily,
  },
  content: { flex: 1, padding: 16, backgroundColor: 'transparent' },
  walletCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  walletAccentTopRight: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  walletAccentBottomLeft: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  walletHeader: { marginBottom: 20 },
  walletLogo: { width: 120, height: 28 },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500', letterSpacing: 1, marginBottom: 4 },
  balanceAmount: { color: '#FFFFFF', fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  walletIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardFooterLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500', marginBottom: 2 },
  cardFooterNumber: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  cardBrandDots: { flexDirection: 'row', alignItems: 'center' },
  cardBrandDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.5)' },
  cardBrandDotOffset: { marginLeft: -8, backgroundColor: 'rgba(255,255,255,0.3)' },
  actionButtons: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  withdrawButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  withdrawButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  actionButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  revenueCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  revenueHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  revenueTitle: { fontSize: 16, fontWeight: '600' },
  revenueStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  revenueStat: { alignItems: 'center', flex: 1 },
  revenueStatLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4, textAlign: 'center' },
  revenueStatAmount: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  requestPayoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  requestPayoutButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  viewAllText: { fontSize: 13, fontWeight: '500' },
  transactionsList: {},
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: { flex: 1 },
  transactionType: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  transactionDescription: { fontSize: 12, marginBottom: 2 },
  transactionDate: { fontSize: 11 },
  transactionAmount: { alignItems: 'flex-end', gap: 4 },
  amountText: { fontSize: 15, fontWeight: '700' },
  statusBadgeSmall: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusTextSmall: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  infoSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  infoTitle: { fontSize: 14, fontWeight: '600' },
  infoText: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  infoFeatures: { gap: 6 },
  featureItem: { fontSize: 12, lineHeight: 18 },
});
