/**
 * Creator Sales Analytics Screen
 * Dashboard showing sales performance and revenue
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { contentPurchaseService } from '../services/ContentPurchaseService';
import { supabase } from '../lib/supabase';
import type { SalesAnalytics } from '../types/paid-content';
import { SystemTypography as Typography } from '../constants/Typography';

export default function CreatorSalesAnalyticsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        console.error('No session found');
        return;
      }

      const data = await contentPurchaseService.getSalesAnalytics(session.data.session);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Error', 'Failed to load sales analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading analytics...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Sales Analytics
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
          {analytics && (
            <>
              {/* Revenue Cards */}
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                  <Ionicons name="cash" size={32} color="#10B981" />
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>
                    {formatCurrency(analytics.total_revenue, analytics.primary_currency)}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                    Total Revenue
                  </Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                  <Ionicons name="trending-up" size={32} color="#3B82F6" />
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>
                    {formatCurrency(analytics.revenue_this_month, analytics.primary_currency)}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                    This Month
                  </Text>
                </View>
              </View>

              {/* Sales Count */}
              <View style={[styles.statCard, styles.fullWidthCard, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="cart" size={32} color={theme.colors.primary} />
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {analytics.total_sales}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Total Sales
                </Text>
              </View>

              {/* Sales by Content Type */}
              {analytics.sales_by_type && analytics.sales_by_type.length > 0 && (
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Sales by Content Type
                  </Text>
                  {analytics.sales_by_type.map((item) => (
                    <View key={item.content_type} style={styles.typeRow}>
                      <View style={styles.typeInfo}>
                        <Ionicons
                          name={
                            item.content_type === 'track' ? 'musical-note' :
                            item.content_type === 'album' ? 'albums' : 'mic'
                          }
                          size={20}
                          color={theme.colors.primary}
                        />
                        <Text style={[styles.typeName, { color: theme.colors.text }]}>
                          {item.content_type.charAt(0).toUpperCase() + item.content_type.slice(1)}s
                        </Text>
                      </View>
                      <Text style={[styles.typeCount, { color: theme.colors.textSecondary }]}>
                        {item.count} sales
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Top Selling Content */}
              {analytics.top_selling_content && analytics.top_selling_content.length > 0 && (
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Top Selling Content
                  </Text>
                  {analytics.top_selling_content.map((item, index) => (
                    <View key={item.content_id} style={styles.topContentRow}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>#{index + 1}</Text>
                      </View>
                      <View style={styles.contentInfo}>
                        <Text style={[styles.contentTitle, { color: theme.colors.text }]} numberOfLines={1}>
                          {item.content_title}
                        </Text>
                        <Text style={[styles.contentMeta, { color: theme.colors.textSecondary }]}>
                          {item.sales_count} sales • {formatCurrency(item.total_revenue, analytics.primary_currency)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Recent Sales */}
              {analytics.recent_sales && analytics.recent_sales.length > 0 && (
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Recent Sales
                  </Text>
                  {analytics.recent_sales.map((sale) => (
                    <View key={sale.purchase_id} style={styles.saleRow}>
                      <View style={styles.saleInfo}>
                        <Text style={[styles.saleContent, { color: theme.colors.text }]} numberOfLines={1}>
                          {sale.content_title}
                        </Text>
                        <Text style={[styles.saleDate, { color: theme.colors.textSecondary }]}>
                          {new Date(sale.purchased_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={[styles.saleAmount, { color: theme.colors.primary }]}>
                        {formatCurrency(sale.amount, sale.currency)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    ...Typography.headerMedium,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  fullWidthCard: {
    marginBottom: 12,
  },
  statValue: {
    ...Typography.headerMedium,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeName: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  typeCount: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
  },
  topContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#3B82F6',
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 'bold',
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 4,
  },
  contentMeta: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
  },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  saleInfo: {
    flex: 1,
  },
  saleContent: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 4,
  },
  saleDate: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
  },
  saleAmount: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
});
