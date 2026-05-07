import React, { useState, useEffect } from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { walletService, WalletTransaction } from '../services/WalletService';
import { currencyService } from '../services/CurrencyService';
import { SystemTypography as Typography } from '../constants/Typography';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Asset } from 'expo-asset';
import { config } from '../config/environment';
import { opportunityService, OpportunityProject } from '../services/OpportunityService';

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

type FilterType = 'all' | 'deposit' | 'withdrawal' | 'tip_received' | 'tip_sent' | 'payout' | 'refund' | 'gig_payment' | 'gig_refund';

const FILTER_OPTIONS: { key: FilterType; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'list' },
  { key: 'gig_payment', label: 'Gig Earnings', icon: 'flash' },
  { key: 'tip_received', label: 'Tips Received', icon: 'trending-up' },
  { key: 'withdrawal', label: 'Withdrawals', icon: 'arrow-up-circle' },
  { key: 'deposit', label: 'Deposits', icon: 'arrow-down-circle' },
  { key: 'payout', label: 'Payouts', icon: 'card' },
  { key: 'refund', label: 'Refunds', icon: 'refresh-circle' },
  { key: 'gig_refund', label: 'Gig Refunds', icon: 'refresh-circle' },
];

export default function TransactionHistoryScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();
  
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [pendingCreatorProjects, setPendingCreatorProjects] = useState<OpportunityProject[]>([]);
  const [pendingPosterProjects, setPendingPosterProjects] = useState<OpportunityProject[]>([]);
  const [completedCreatorProjects, setCompletedCreatorProjects] = useState<OpportunityProject[]>([]);
  const [selectedGigProject, setSelectedGigProject] = useState<OpportunityProject | null>(null);
  const [gigReceiptModalVisible, setGigReceiptModalVisible] = useState(false);

  const LIMIT = 20;

  useEffect(() => {
    loadTransactions(true);
  }, []);

  useEffect(() => {
    applyFilter();
  }, [transactions, activeFilter]);

  const loadTransactions = async (reset: boolean = false) => {
    try {
      if (!session) {
        Alert.alert('Error', 'You must be logged in to view transactions');
        return;
      }

      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const currentOffset = reset ? 0 : offset;

      // Fetch wallet transactions AND pending gig projects in parallel.
      // Pending gig projects (payment_pending, awaiting_acceptance, active, delivered)
      // are money committed to the user but not yet captured — they won't appear in
      // wallet_transactions until the gig completes and Stripe captures the payment.
      const pendingStatuses = ['payment_pending', 'awaiting_acceptance', 'active', 'delivered'];

      const [result, allProjects] = await Promise.all([
        walletService.getWalletTransactionsSafe(session, LIMIT, currentOffset),
        reset
          ? opportunityService.getMyProjects().catch((e: unknown) => {
              console.warn('⚠️ Could not load gig projects for transaction history:', e);
              return [] as OpportunityProject[];
            })
          : Promise.resolve([] as OpportunityProject[]),
      ]);

      if (reset) {
        setTransactions(result.transactions);
        const projects = allProjects as OpportunityProject[];
        const pending = projects.filter(p => pendingStatuses.includes(p.status));
        // Use poster_user_id / creator_user_id to reliably determine role
        const currentUserId = session.user.id;
        const asCreator = pending.filter(p => p.creator_user_id === currentUserId);
        const asPoster = pending.filter(p => p.poster_user_id === currentUserId);
        setPendingCreatorProjects(asCreator);
        setPendingPosterProjects(asPoster);
        console.log(`📊 Escrow gig projects — as creator (pending earnings): ${asCreator.length}, as poster (committed payments): ${asPoster.length}`, pending.map(p => ({ id: p.id, status: p.status, poster: p.poster_user_id, creator: p.creator_user_id })));

        // Completed projects as creator — show even if wallet_transaction was never created
        // De-dup: skip projects that already have a matching wallet_transaction row
        const existingProjectRefs = new Set(
          result.transactions
            .filter(t => t.reference_type === 'opportunity_project')
            .map(t => t.reference_id)
        );
        const completedAsCreator = projects.filter(
          p => p.status === 'completed' && p.creator_user_id === currentUserId && !existingProjectRefs.has(p.id)
        );
        setCompletedCreatorProjects(completedAsCreator);
        console.log(`✅ Completed gig projects without wallet_transaction: ${completedAsCreator.length}`);
      } else {
        setTransactions(prev => [...prev, ...result.transactions]);
      }

      setHasMore(result.transactions.length === LIMIT);
      setOffset(currentOffset + result.transactions.length);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transaction history. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const applyFilter = () => {
    if (activeFilter === 'all') {
      setFilteredTransactions(transactions);
      return;
    }

    // The backend currently stores gig payments as 'deposit' type with a gig description.
    // We match both until the backend uses the correct transaction_type consistently.
    if (activeFilter === 'gig_payment') {
      setFilteredTransactions(transactions.filter(t =>
        t.transaction_type === 'gig_payment' ||
        (t.transaction_type === 'deposit' && !!t.description?.toLowerCase().includes('gig'))
      ));
      return;
    }

    if (activeFilter === 'gig_refund') {
      setFilteredTransactions(transactions.filter(t =>
        t.transaction_type === 'gig_refund' ||
        (t.transaction_type === 'refund' && !!t.description?.toLowerCase().includes('gig'))
      ));
      return;
    }

    // For deposit filter, exclude gig-labelled deposits so they don't double-show
    if (activeFilter === 'deposit') {
      setFilteredTransactions(transactions.filter(t =>
        t.transaction_type === 'deposit' && !t.description?.toLowerCase().includes('gig')
      ));
      return;
    }

    setFilteredTransactions(transactions.filter(t => t.transaction_type === activeFilter));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions(true);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadTransactions(false);
    }
  };

  const openReceipt = (transaction: WalletTransaction) => {
    setSelectedTransaction(transaction);
    setReceiptModalVisible(true);
  };

  const RECEIPT_CSS = `
    @page { margin: 16mm 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; background: #fff; color: #111; font-size: 15px; line-height: 1.6; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 4px solid #C0392B; margin-bottom: 36px; }
    .header-left .receipt-word { font-size: 40px; font-weight: 900; color: #111; letter-spacing: -1px; }
    .header-left .ref { font-size: 14px; color: #444; margin-top: 6px; font-weight: 500; }
    .logo-img { height: 110px; object-fit: contain; }
    .amount-block { margin-bottom: 36px; }
    .amount-label { font-size: 13px; color: #444; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 10px; font-weight: 700; }
    .amount { font-size: 56px; font-weight: 900; color: #C0392B; letter-spacing: -2px; line-height: 1; }
    .type { font-size: 20px; font-weight: 600; color: #222; margin-top: 12px; }
    .status-badge { display: inline-block; background: #10B981; color: #fff; font-size: 13px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 6px 18px; border-radius: 20px; margin-top: 12px; }
    .parties { display: flex; gap: 16px; margin-bottom: 36px; }
    .party { flex: 1; background: #f4f4f4; border-radius: 10px; padding: 18px 20px; border: 1px solid #ddd; }
    .party-label { font-size: 12px; color: #333; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 800; }
    .party-name { font-size: 17px; font-weight: 700; color: #111; }
    .party-sub { font-size: 13px; color: #555; margin-top: 4px; font-weight: 500; }
    .section-title { font-size: 12px; color: #222; text-transform: uppercase; letter-spacing: 1.2px; padding-bottom: 10px; border-bottom: 2px solid #ccc; margin-bottom: 6px; font-weight: 800; }
    .breakdown { margin-bottom: 36px; }
    .b-row { display: flex; justify-content: space-between; padding: 13px 0; border-bottom: 1px solid #ddd; }
    .b-row:last-child { border-bottom: none; }
    .b-label { font-size: 15px; color: #333; font-weight: 500; }
    .b-value { font-size: 15px; font-weight: 700; color: #111; }
    .b-row.fee .b-label { color: #C0392B; }
    .b-row.fee .b-value { color: #C0392B; }
    .b-row.net { background: #edfaf5; border-radius: 10px; padding: 16px 18px; margin-top: 10px; border: 2px solid #10B981; }
    .b-row.net .b-label { font-weight: 800; color: #111; font-size: 16px; }
    .b-row.net .b-value { font-weight: 900; color: #10B981; font-size: 22px; }
    .details { margin-bottom: 36px; }
    .d-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 13px 0; border-bottom: 1px solid #ddd; gap: 16px; }
    .d-row:last-child { border-bottom: none; }
    .d-label { font-size: 14px; color: #444; flex: 1; font-weight: 600; }
    .d-value { font-size: 14px; font-weight: 700; color: #111; flex: 2; text-align: right; word-break: break-all; }
    .mono { font-family: 'Courier New', monospace; font-size: 12px; }
    .divider { border: none; border-top: 2px dashed #bbb; margin: 30px 0; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 2px solid #ddd; padding-top: 24px; margin-top: 8px; }
    .footer-left .brand { font-size: 17px; font-weight: 800; color: #C0392B; }
    .footer-left p { font-size: 13px; color: #444; line-height: 1.9; font-weight: 500; }
    .footer-right { text-align: right; font-size: 13px; color: #444; font-style: italic; line-height: 1.9; font-weight: 500; }
  `;

  const buildReceiptHtml = (rows: { label: string; value: string }[], title: string, amount: string, status: string, accentColor: string, logoUri: string) => `
    <!DOCTYPE html><html><head><meta charset="utf-8" />
    <style>${RECEIPT_CSS}
      .amount { font-size: 60px; font-weight: 900; color: ${accentColor}; letter-spacing: -2px; line-height: 1; }
      .status-badge { background: ${accentColor}18; color: ${accentColor}; }
    </style></head>
    <body>
      <div class="header">
        <div class="header-left">
          <div class="receipt-word">RECEIPT</div>
          <div class="ref">${title} · ${status}</div>
        </div>
        ${logoUri ? `<img class="logo-img" src="${logoUri}" alt="SoundBridge Live" />` : '<span style="font-size:20px;font-weight:800;color:#C0392B;">SoundBridge Live</span>'}
      </div>
      <div class="amount-block">
        <div class="amount-label">Amount</div>
        <div class="amount">${amount}</div>
        <div class="type">${title}</div>
        <div class="status-badge">${status}</div>
      </div>
      <hr class="divider" />
      <div class="details">
        <div class="section-title">Transaction Details</div>
        ${rows.map(r => `<div class="d-row"><span class="d-label">${r.label}</span><span class="d-value${r.label.includes('ID') || r.label.includes('PI') || r.label.includes('Reference') ? ' mono' : ''}">${r.value}</span></div>`).join('')}
        <div class="d-row"><span class="d-label">Payment Method</span><span class="d-value">Stripe</span></div>
        <div class="d-row"><span class="d-label">VAT</span><span class="d-value">Contact us for VAT invoice</span></div>
      </div>
      <div class="footer">
        <div class="footer-left">
          <p class="brand">SoundBridge Live Ltd</p>
          <p>Co. No. 16854928</p>
          <p>4 Whitlock House, 2 Cedar Grove, Wokingham, UK</p>
          <p>contact@soundbridge.live · soundbridge.live</p>
        </div>
        <div class="footer-right">Thank you for using<br/>SoundBridge Live</div>
      </div>
    </body></html>
  `;

  const buildGigReceiptHtml = (project: OpportunityProject, payerName: string, payeeName: string, logoUri: string) => {
    const dateStr = project.completed_at ?? project.created_at;
    const displayDate = dateStr
      ? new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—';
    const sym = project.currency === 'GBP' ? '£' : '$';
    const gross = Number(project.agreed_amount ?? 0).toFixed(2);
    const fee = Number(project.platform_fee_amount ?? 0).toFixed(2);
    // platform_fee_percent is often 0 in DB even when a fee was charged.
    // Derive it from the actual amounts to be accurate.
    const grossNum = Number(project.agreed_amount ?? 0);
    const feeNum = Number(project.platform_fee_amount ?? 0) || (grossNum - Number(project.creator_payout_amount ?? grossNum));
    const derivedPercent = grossNum > 0 ? Math.round((feeNum / grossNum) * 100) : Number(project.platform_fee_percent ?? 0);
    const feePercent = derivedPercent.toFixed(0);
    const net = Number(project.creator_payout_amount ?? project.agreed_amount ?? 0).toFixed(2);
    const refShort = project.id.split('-')[0].toUpperCase();
    const gigTitle = project.opportunity?.title ?? project.title ?? 'Gig Project';

    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${RECEIPT_CSS}</style></head>
    <body>
      <div class="header">
        <div class="header-left">
          <div class="receipt-word">RECEIPT</div>
          <div class="ref">Ref: ${refShort} · ${displayDate}</div>
        </div>
        ${logoUri ? `<img class="logo-img" src="${logoUri}" alt="SoundBridge Live" />` : '<span style="font-size:20px;font-weight:800;color:#C0392B;">SoundBridge Live</span>'}
      </div>

      <div class="amount-block">
        <div class="amount-label">Net Gig Payment Received</div>
        <div class="amount">+${sym}${net}</div>
        <div class="type">Gig Payment — ${gigTitle}</div>
        <div class="status-badge">COMPLETED</div>
      </div>

      <div class="parties">
        <div class="party">
          <div class="party-label">Client (Paid)</div>
          <div class="party-name">${payerName}</div>
          <div class="party-sub">Gig Poster</div>
        </div>
        <div class="party">
          <div class="party-label">Service Provider (Received)</div>
          <div class="party-name">${payeeName}</div>
          <div class="party-sub">Musician / Creator</div>
        </div>
      </div>

      <hr class="divider" />

      <div class="breakdown">
        <div class="section-title">Payment Breakdown</div>
        <div class="b-row">
          <span class="b-label">Gross Amount Paid by Client</span>
          <span class="b-value">${sym}${gross}</span>
        </div>
        <div class="b-row fee">
          <span class="b-label">SoundBridge Platform Fee (${feePercent}%)</span>
          <span class="b-value">− ${sym}${fee}</span>
        </div>
        <div class="b-row net">
          <span class="b-label">Net Payout to Service Provider</span>
          <span class="b-value">+ ${sym}${net}</span>
        </div>
      </div>

      <hr class="divider" />

      <div class="details">
        <div class="section-title">Transaction Details</div>
        <div class="d-row"><span class="d-label">Gig</span><span class="d-value">${gigTitle}</span></div>
        <div class="d-row"><span class="d-label">Project Reference</span><span class="d-value mono">${project.id}</span></div>
        <div class="d-row"><span class="d-label">Date & Time</span><span class="d-value">${displayDate}</span></div>
        <div class="d-row"><span class="d-label">Currency</span><span class="d-value">${project.currency}</span></div>
        <div class="d-row"><span class="d-label">Payment Method</span><span class="d-value">Stripe (Card Payment)</span></div>
        ${project.stripe_payment_intent_id ? `<div class="d-row"><span class="d-label">Stripe Reference</span><span class="d-value mono">${project.stripe_payment_intent_id}</span></div>` : ''}
        <div class="d-row"><span class="d-label">VAT</span><span class="d-value">Contact us for VAT invoice</span></div>
      </div>

      <div class="footer">
        <div class="footer-left">
          <p class="brand">SoundBridge Live Ltd</p>
          <p>Co. No. 16854928</p>
          <p>4 Whitlock House, 2 Cedar Grove, Wokingham, UK</p>
          <p>contact@soundbridge.live · soundbridge.live</p>
        </div>
        <div class="footer-right">
          Thank you for using SoundBridge Live.<br/>
          Quote ref <strong>${refShort}</strong> for any disputes.
        </div>
      </div>
    </body></html>`;
  };

  const sharePdfReceipt = async (html: string, filename: string) => {
    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      // Move to a named file in cache so the share sheet shows a proper filename
      const dest = FileSystem.cacheDirectory + filename;
      await FileSystem.moveAsync({ from: uri, to: dest });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: 'Share Receipt', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Sharing not available', 'Your device does not support file sharing.');
      }
    } catch (error) {
      console.error('Error sharing PDF receipt:', error);
      Alert.alert('Error', 'Failed to generate receipt PDF. Please try again.');
    }
  };

  const shareReceipt = async (transaction: WalletTransaction) => {
    const isCredit = transaction.amount > 0;
    const logoUri = await getLogoDataUri();
    const rows = [
      { label: 'Transaction ID', value: transaction.id },
      { label: 'Date & Time', value: walletService.formatDate(transaction.created_at) },
      { label: 'Currency', value: transaction.currency.toUpperCase() },
      ...(transaction.description ? [{ label: 'Description', value: transaction.description }] : []),
      ...(transaction.reference_id ? [{ label: 'Reference ID', value: transaction.reference_id }] : []),
      ...(transaction.reference_type ? [{ label: 'Reference Type', value: transaction.reference_type.replace(/_/g, ' ') }] : []),
    ];
    const html = buildReceiptHtml(
      rows,
      walletService.getTransactionTypeDisplay(transaction.transaction_type),
      `${isCredit ? '+' : ''}${currencyService.formatAmount(transaction.amount, transaction.currency)}`,
      transaction.status.toUpperCase(),
      isCredit ? '#10B981' : '#6B7280',
      logoUri,
    );
    await sharePdfReceipt(html, `soundbridge_receipt_${transaction.id}.pdf`);
  };

  const emailReceipt = async (transaction: WalletTransaction) => {
    if (!session) return;
    try {
      setEmailSending(true);
      const apiBase = config.apiUrl.endsWith('/api') ? config.apiUrl : `${config.apiUrl}/api`;
      const response = await fetch(`${apiBase}/wallet/transactions/${transaction.id}/send-receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        Alert.alert('Receipt Sent', `A receipt has been emailed to ${user?.email}`);
      } else {
        Alert.alert('Error', 'Failed to send receipt email. Please try again.');
      }
    } catch (error) {
      console.error('Error emailing receipt:', error);
      Alert.alert('Error', 'Failed to send receipt email. Please try again.');
    } finally {
      setEmailSending(false);
    }
  };

  const renderReceiptModal = () => {
    if (!selectedTransaction) return null;
    const tx = selectedTransaction;
    const isCredit = tx.amount > 0;

    return (
      <Modal
        visible={receiptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[styles.receiptSheet, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {/* Handle */}
            <View style={[styles.receiptHandle, { backgroundColor: theme.colors.border }]} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.receiptScroll}>
              {/* Header */}
              <View style={styles.receiptHeader}>
                <LinearGradient
                  colors={isCredit ? ['#10B981', '#059669'] : ['#6B7280', '#4B5563']}
                  style={styles.receiptIconBg}
                >
                  <Ionicons
                    name={walletService.getTransactionIcon(tx.transaction_type) as any}
                    size={28}
                    color="#FFFFFF"
                  />
                </LinearGradient>
                <Text style={[styles.receiptTitle, { color: theme.colors.text }]}>
                  {walletService.getTransactionTypeDisplay(tx.transaction_type)}
                </Text>
                <Text style={[styles.receiptAmount, { color: isCredit ? theme.colors.success : theme.colors.error }]}>
                  {isCredit ? '+' : ''}{currencyService.formatAmount(tx.amount, tx.currency)}
                </Text>
                <View style={[styles.receiptStatusBadge, { backgroundColor: walletService.getStatusColor(tx.status) + '20' }]}>
                  <Text style={[styles.receiptStatusText, { color: walletService.getStatusColor(tx.status) }]}>
                    {tx.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View style={[styles.receiptDivider, { borderColor: theme.colors.border }]} />

              {/* Details */}
              <View style={styles.receiptDetails}>
                <ReceiptRow label="Transaction ID" value={tx.id} mono theme={theme} />
                <ReceiptRow label="Date & Time" value={walletService.formatDate(tx.created_at)} theme={theme} />
                <ReceiptRow label="Currency" value={tx.currency.toUpperCase()} theme={theme} />
                {tx.description ? <ReceiptRow label="Description" value={tx.description} theme={theme} /> : null}
                {tx.reference_id ? <ReceiptRow label="Reference ID" value={tx.reference_id} mono theme={theme} /> : null}
                {tx.reference_type ? <ReceiptRow label="Reference Type" value={tx.reference_type.replace(/_/g, ' ')} theme={theme} /> : null}
              </View>

              <View style={[styles.receiptDivider, { borderColor: theme.colors.border }]} />

              {/* SoundBridge info */}
              <View style={styles.receiptFooterInfo}>
                <Text style={[styles.receiptFooterLabel, { color: theme.colors.textSecondary }]}>SoundBridge Ltd</Text>
                <Text style={[styles.receiptFooterLabel, { color: theme.colors.textSecondary }]}>contact@soundbridge.live</Text>
              </View>

              {/* Actions */}
              <View style={styles.receiptActions}>
                <TouchableOpacity
                  style={[styles.receiptActionBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => shareReceipt(tx)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.receiptActionBtnText}>Share Receipt</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.receiptActionBtn, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}
                  onPress={() => emailReceipt(tx)}
                  disabled={emailSending}
                  activeOpacity={0.85}
                >
                  {emailSending ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Ionicons name="mail-outline" size={18} color={theme.colors.primary} />
                  )}
                  <Text style={[styles.receiptActionBtnText, { color: theme.colors.primary }]}>
                    {emailSending ? 'Sending…' : 'Email Receipt'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.receiptCloseBtn, { borderColor: theme.colors.border }]}
              onPress={() => setReceiptModalVisible(false)}
            >
              <Text style={[styles.receiptCloseBtnText, { color: theme.colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const shareGigReceipt = async (project: OpportunityProject) => {
    const logoUri = await getLogoDataUri();
    const payerName = project.other_party?.display_name ?? project.other_party?.username ?? 'Client';
    const payeeName = user?.user_metadata?.display_name ?? user?.user_metadata?.full_name ?? user?.email ?? 'Service Provider';
    const html = buildGigReceiptHtml(project, payerName, payeeName, logoUri);
    await sharePdfReceipt(html, `soundbridge_gig_receipt_${project.id}.pdf`);
  };

  const renderGigReceiptModal = () => {
    if (!selectedGigProject) return null;
    const project = selectedGigProject;
    const amount = (project.creator_payout_amount ?? project.agreed_amount ?? 0).toFixed(2);
    const currencySymbol = project.currency === 'GBP' ? '£' : '$';
    const dateStr = project.completed_at ?? project.created_at;
    const displayDate = dateStr
      ? new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Completed';

    return (
      <Modal
        visible={gigReceiptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGigReceiptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[styles.receiptSheet, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[styles.receiptHandle, { backgroundColor: theme.colors.border }]} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.receiptScroll}>
              <View style={styles.receiptHeader}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.receiptIconBg}>
                  <Ionicons name="flash" size={28} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.receiptTitle, { color: theme.colors.text }]}>Gig Payment</Text>
                <Text style={[styles.receiptAmount, { color: theme.colors.success }]}>
                  +{currencySymbol}{amount}
                </Text>
                <View style={[styles.receiptStatusBadge, { backgroundColor: '#10B98120' }]}>
                  <Text style={[styles.receiptStatusText, { color: '#10B981' }]}>COMPLETED</Text>
                </View>
              </View>

              <View style={[styles.receiptDivider, { borderColor: theme.colors.border }]} />

              <View style={styles.receiptDetails}>
                <ReceiptRow label="Project ID" value={project.id} mono theme={theme} />
                <ReceiptRow label="Date" value={displayDate} theme={theme} />
                <ReceiptRow label="Gig" value={project.opportunity?.title ?? project.title ?? 'Gig project'} theme={theme} />
                <ReceiptRow label="Currency" value={project.currency} theme={theme} />
                {project.stripe_payment_intent_id
                  ? <ReceiptRow label="Stripe PI" value={project.stripe_payment_intent_id} mono theme={theme} />
                  : null}
              </View>

              <View style={[styles.receiptDivider, { borderColor: theme.colors.border }]} />

              <View style={styles.receiptFooterInfo}>
                <Text style={[styles.receiptFooterLabel, { color: theme.colors.textSecondary }]}>SoundBridge Ltd</Text>
                <Text style={[styles.receiptFooterLabel, { color: theme.colors.textSecondary }]}>contact@soundbridge.live</Text>
              </View>

              <View style={styles.receiptActions}>
                <TouchableOpacity
                  style={[styles.receiptActionBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => shareGigReceipt(project)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.receiptActionBtnText}>Share Receipt</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.receiptCloseBtn, { borderColor: theme.colors.border }]}
              onPress={() => setGigReceiptModalVisible(false)}
            >
              <Text style={[styles.receiptCloseBtnText, { color: theme.colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderTransaction = ({ item }: { item: WalletTransaction }) => (
    <TouchableOpacity
      onPress={() => openReceipt(item)}
      activeOpacity={0.75}
      style={[styles.transactionItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
    >
      <View style={[styles.transactionIcon, { backgroundColor: walletService.getStatusColor(item.status) + '20' }]}>
        <Ionicons
          name={walletService.getTransactionIcon(item.transaction_type) as any}
          size={24}
          color={walletService.getStatusColor(item.status)}
        />
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.transactionHeader}>
          <Text style={[styles.transactionType, { color: theme.colors.text }]}>
            {walletService.getTransactionTypeDisplay(item.transaction_type)}
          </Text>
          <Text style={[
            styles.amountText,
            { color: item.amount > 0 ? theme.colors.success : theme.colors.error }
          ]}>
            {item.amount > 0 ? '+' : ''}{currencyService.formatAmount(item.amount, item.currency)}
          </Text>
        </View>

        <Text style={[styles.transactionDescription, { color: theme.colors.textSecondary }]}>
          {item.description || 'Wallet transaction'}
        </Text>

        <View style={styles.transactionFooter}>
          <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
            {walletService.formatDate(item.created_at)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.statusBadge, { backgroundColor: walletService.getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: walletService.getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="receipt-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={[styles.transactionDate, { color: theme.colors.textSecondary, fontSize: 11 }]}>Receipt</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFilter = ({ item }: { item: typeof FILTER_OPTIONS[0] }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        { 
          backgroundColor: activeFilter === item.key ? theme.colors.primary : theme.colors.surface,
          borderColor: activeFilter === item.key ? theme.colors.primary : theme.colors.border
        }
      ]}
      onPress={() => setActiveFilter(item.key)}
    >
      <Ionicons 
        name={item.icon as any} 
        size={16} 
        color={activeFilter === item.key ? '#FFFFFF' : theme.colors.text} 
      />
      <Text style={[
        styles.filterText,
        { color: activeFilter === item.key ? '#FFFFFF' : theme.colors.text }
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading more...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No Transactions</Text>
      <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
        {activeFilter === 'all' 
          ? 'Your transaction history will appear here'
          : `No ${FILTER_OPTIONS.find(f => f.key === activeFilter)?.label.toLowerCase()} transactions found`
        }
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Main Background Gradient - Uses theme colors */}
        <LinearGradient
          colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={styles.mainGradient}
        />
        
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading transactions...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Background Gradient - Uses theme colors */}
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <BackButton 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
         />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Transaction History</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filters */}
      <View style={[styles.filtersContainer, { backgroundColor: theme.colors.surface }]}>
        <FlatList
          data={FILTER_OPTIONS}
          renderItem={renderFilter}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      {/* Summary */}
      {(() => {
        const escrowCount = (activeFilter === 'all' || activeFilter === 'gig_payment')
          ? pendingCreatorProjects.length + pendingPosterProjects.length + completedCreatorProjects.length
          : 0;
        const total = filteredTransactions.length + escrowCount;
        return (
          <View style={[styles.summaryContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
              {total} {total === 1 ? 'transaction' : 'transactions'}
              {activeFilter !== 'all' && ` • ${FILTER_OPTIONS.find(f => f.key === activeFilter)?.label}`}
            </Text>
          </View>
        );
      })()}

      {/* Pending Gig Earnings — user is provider (creator), money is in escrow */}
      {(activeFilter === 'all' || activeFilter === 'gig_payment') && pendingCreatorProjects.length > 0 && (
        <EscrowSection
          title="PENDING GIG EARNINGS (IN ESCROW)"
          projects={pendingCreatorProjects}
          isEarning
          theme={theme}
          styles={styles}
        />
      )}

      {/* Committed Gig Payments — user is poster, money is in escrow */}
      {(activeFilter === 'all' || activeFilter === 'gig_payment') && pendingPosterProjects.length > 0 && (
        <EscrowSection
          title="COMMITTED GIG PAYMENTS (IN ESCROW)"
          projects={pendingPosterProjects}
          isEarning={false}
          theme={theme}
          styles={styles}
        />
      )}

      {/* Completed gig earnings without a matching wallet_transaction row */}
      {(activeFilter === 'all' || activeFilter === 'gig_payment') && completedCreatorProjects.length > 0 && (
        <CompletedGigSection
          projects={completedCreatorProjects}
          theme={theme}
          styles={styles}
          onPress={(project) => {
            setSelectedGigProject(project);
            setGigReceiptModalVisible(true);
          }}
        />
      )}

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          filteredTransactions.length === 0 && styles.emptyListContent
        ]}
        showsVerticalScrollIndicator={false}
      />
      </SafeAreaView>

      {renderReceiptModal()}
      {renderGigReceiptModal()}
    </View>
  );
}

const ESCROW_STATUS_LABEL: Record<string, string> = {
  payment_pending: 'Payment pending',
  awaiting_acceptance: 'Awaiting your acceptance',
  active: 'In progress',
  delivered: 'Delivered — awaiting confirmation',
};

function EscrowSection({
  title,
  projects,
  isEarning,
  theme,
  styles,
}: {
  title: string;
  projects: OpportunityProject[];
  isEarning: boolean;
  theme: any;
  styles: any;
}) {
  const color = isEarning ? '#F59E0B' : '#6B7280';
  return (
    <View style={[styles.pendingSection, { borderColor: theme.colors.border, marginBottom: 4 }]}>
      <View style={styles.pendingSectionHeader}>
        <Ionicons name="time-outline" size={14} color={color} />
        <Text style={[styles.pendingSectionTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
      </View>
      {projects.map((project) => (
        <View
          key={project.id}
          style={[styles.pendingItem, { backgroundColor: theme.colors.card }]}
        >
          <View style={[styles.transactionIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name={isEarning ? 'hourglass-outline' : 'lock-closed-outline'} size={22} color={color} />
          </View>
          <View style={styles.transactionDetails}>
            <View style={styles.transactionHeader}>
              <Text style={[styles.transactionType, { color: theme.colors.text }]}>
                {isEarning ? 'Gig Earning' : 'Gig Payment'}
              </Text>
              <Text style={[styles.amountText, { color }]}>
                {isEarning ? '+' : '-'}{project.currency === 'GBP' ? '£' : '$'}
                {isEarning
                  ? (project.creator_payout_amount ?? project.agreed_amount ?? 0).toFixed(2)
                  : (project.agreed_amount ?? 0).toFixed(2)}
              </Text>
            </View>
            <Text style={[styles.transactionDescription, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {project.opportunity?.title ?? 'Gig project'}
            </Text>
            <View style={styles.transactionFooter}>
              <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
                {ESCROW_STATUS_LABEL[project.status] ?? project.status}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                <Text style={[styles.statusText, { color }]}>ESCROW</Text>
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function CompletedGigSection({
  projects,
  theme,
  styles,
  onPress,
}: {
  projects: OpportunityProject[];
  theme: any;
  styles: any;
  onPress: (project: OpportunityProject) => void;
}) {
  const color = '#10B981';
  return (
    <View style={[styles.pendingSection, { borderColor: theme.colors.border, marginBottom: 4 }]}>
      <View style={[styles.pendingSectionHeader, { backgroundColor: '#10B98115' }]}>
        <Ionicons name="checkmark-circle-outline" size={14} color={color} />
        <Text style={[styles.pendingSectionTitle, { color: theme.colors.textSecondary }]}>GIG EARNINGS (COMPLETED)</Text>
      </View>
      {projects.map((project) => {
        const dateStr = project.completed_at ?? project.created_at;
        const displayDate = dateStr
          ? new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Completed';
        return (
          <TouchableOpacity
            key={project.id}
            style={[styles.pendingItem, { backgroundColor: theme.colors.card }]}
            activeOpacity={0.75}
            onPress={() => onPress(project)}
          >
            <View style={[styles.transactionIcon, { backgroundColor: color + '20' }]}>
              <Ionicons name="checkmark-circle" size={22} color={color} />
            </View>
            <View style={styles.transactionDetails}>
              <View style={styles.transactionHeader}>
                <Text style={[styles.transactionType, { color: theme.colors.text }]}>
                  Gig Payment
                </Text>
                <Text style={[styles.amountText, { color }]}>
                  +{project.currency === 'GBP' ? '£' : '$'}
                  {(project.creator_payout_amount ?? project.agreed_amount ?? 0).toFixed(2)}
                </Text>
              </View>
              <Text style={[styles.transactionDescription, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {project.opportunity?.title ?? project.title ?? 'Completed gig'}
              </Text>
              <View style={styles.transactionFooter}>
                <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
                  {displayDate}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.statusText, { color }]}>EARNED</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="receipt-outline" size={13} color={theme.colors.textSecondary} />
                    <Text style={[styles.transactionDate, { color: theme.colors.textSecondary, fontSize: 11 }]}>Receipt</Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ReceiptRow({ label, value, mono, theme }: { label: string; value: string; mono?: boolean; theme: any }) {
  return (
    <View style={receiptRowStyles.row}>
      <Text style={[receiptRowStyles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text
        style={[receiptRowStyles.value, { color: theme.colors.text }, mono && receiptRowStyles.mono]}
        selectable
        numberOfLines={mono ? 1 : 2}
      >
        {value}
      </Text>
    </View>
  );
}

const receiptRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 12,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  value: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'transparent',
  },
  loadingText: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  filtersContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  summaryText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    gap: 12,
    backgroundColor: 'transparent',
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  transactionType: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    flex: 1,
  },
  amountText: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 'bold',
  },
  transactionDescription: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionDate: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    ...Typography.label,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyStateTitle: {
    ...Typography.headerMedium,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 'bold',
  },
  emptyStateText: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // Pending gig projects (escrow)
  pendingSection: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pendingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F59E0B15',
  },
  pendingSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  pendingItem: {
    flexDirection: 'row',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F59E0B22',
  },
  // Receipt modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  receiptSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  receiptHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  receiptScroll: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  receiptHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  receiptIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  receiptAmount: {
    fontSize: 28,
    fontWeight: '800',
  },
  receiptStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  receiptStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  receiptDivider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  receiptDetails: {
    gap: 0,
  },
  receiptFooterInfo: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 2,
  },
  receiptFooterLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  receiptActions: {
    gap: 10,
    marginTop: 16,
  },
  receiptActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  receiptActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  receiptCloseBtn: {
    marginHorizontal: 24,
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  receiptCloseBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
