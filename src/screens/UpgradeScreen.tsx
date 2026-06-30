import React, { useState, useEffect } from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SystemTypography as Typography } from '../constants/Typography';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import RevenueCatService, { RevenueCatProduct } from '../services/RevenueCatService';
import { config } from '../config/environment';
import { subscriptionPlans, Plan } from '../constants/subscriptionPlans';

export default function UpgradeScreen() {
  const navigation = useNavigation();
  const { user, session, refreshUser, userProfile } = useAuth();
  const { theme } = useTheme();
  const { width } = Dimensions.get('window');

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'premium' | 'unlimited'>('free');
  const [currentBillingCycle, setCurrentBillingCycle] = useState<'monthly' | 'yearly' | null>(null);
  const [revenueCatProducts, setRevenueCatProducts] = useState<RevenueCatProduct[]>([]);

  // Plan configurations matching RevenueCat packages
  const plans: Plan[] = subscriptionPlans;

  useEffect(() => {
    loadProducts();
    checkSubscriptionStatus();
  }, []);

  useEffect(() => {
    // Update current plan from user data
    checkSubscriptionStatus();
  }, [user]);

  // Auto-retry loading products if they're empty after initialization
  useEffect(() => {
    if (!isInitializing && revenueCatProducts.length === 0) {
      console.log('🔄 Products empty after initialization, retrying...');
      const timer = setTimeout(() => {
        loadProducts();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isInitializing, revenueCatProducts.length]);

  const checkSubscriptionStatus = async () => {
    try {
      console.log('🔍 Checking subscription status...');
      console.log('👤 User profile subscription_tier:', userProfile?.subscription_tier);

      // Development bypass: Use hardcoded tier
      if (config.bypassRevenueCat && config.developmentTier) {
        console.log('🔧 DEVELOPMENT MODE: Using hardcoded tier');
        console.log(`🔧 Hardcoded tier: ${config.developmentTier.toUpperCase()}`);
        setCurrentPlan(config.developmentTier);
        setCurrentBillingCycle('monthly');
        return;
      }

      // Wait for RevenueCat to be ready (with longer timeout for sandbox)
      let attempts = 0;
      const maxAttempts = 20; // 10 seconds total
      while (!RevenueCatService.isReady() && attempts < maxAttempts) {
        console.log(`⏳ Waiting for RevenueCat... attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!RevenueCatService.isReady()) {
        console.warn('⚠️ RevenueCat not ready after waiting 10 seconds');
        console.warn('⚠️ This means RevenueCat SDK failed to initialize. Check API key and network.');
        // Fallback to user profile
        const tier = userProfile?.subscription_tier;
        if (tier === 'premium' || tier === 'unlimited') {
          console.log(`✅ Using ${tier} tier from user profile (RevenueCat timeout)`);
          setCurrentPlan(tier);
        } else {
          console.log('⚠️ Setting to FREE (RevenueCat timeout, no paid tier in profile)');
          setCurrentPlan('free');
        }
        return;
      }

      // RevenueCat is ready, check entitlements
      console.log('✅ RevenueCat is ready, fetching customer info...');
      const customerInfo = await RevenueCatService.getCustomerInfo();

      if (!customerInfo) {
        console.warn('⚠️ No customer info returned from RevenueCat');
        const profileTier = userProfile?.subscription_tier;
        if (profileTier === 'premium' || profileTier === 'unlimited') {
          console.log(`✅ Using ${profileTier} from Supabase profile (RevenueCat returned null)`);
          setCurrentPlan(profileTier);
        } else {
          setCurrentPlan('free');
        }
        return;
      }

      console.log('📊 Raw customer info:');
      console.log('  - Entitlements active:', Object.keys(customerInfo.entitlements.active));
      console.log('  - Active subscriptions:', customerInfo.activeSubscriptions);
      console.log('  - Original App User ID:', customerInfo.originalAppUserId);

      // Get user tier
      const tier = RevenueCatService.getUserTier(customerInfo);
      console.log(`🎯 Final tier: ${tier.toUpperCase()}`);

      if (tier !== 'free') {
        console.log(`✅ Setting currentPlan to ${tier.toUpperCase()}`);
        setCurrentPlan(tier);

        // Detect billing cycle from active subscriptions
        const activeSubscriptions = customerInfo.activeSubscriptions;
        console.log('🔍 Detecting billing cycle from subscriptions:', activeSubscriptions);

        // Check if subscription product ID contains monthly/yearly indicators
        const hasMonthly = activeSubscriptions.some(sub =>
          sub.toLowerCase().includes('month') && !sub.toLowerCase().includes('annual')
        );
        const hasYearly = activeSubscriptions.some(sub =>
          sub.toLowerCase().includes('year') || sub.toLowerCase().includes('annual')
        );

        if (hasMonthly) {
          console.log('✅ Detected MONTHLY billing cycle');
          setCurrentBillingCycle('monthly');
        } else if (hasYearly) {
          console.log('✅ Detected YEARLY billing cycle');
          setCurrentBillingCycle('yearly');
        } else {
          console.warn('⚠️ Could not detect billing cycle, defaulting to monthly');
          setCurrentBillingCycle('monthly');
        }
      } else {
        // RevenueCat says free — check Supabase profile for institutional access
        const profileTier = userProfile?.subscription_tier;
        if (profileTier === 'premium' || profileTier === 'unlimited') {
          console.log(`✅ RevenueCat returned free but Supabase profile shows ${profileTier} — using institutional tier`);
          setCurrentPlan(profileTier);
          setCurrentBillingCycle(null);
        } else {
          console.log('⚠️ Setting currentPlan to FREE');
          setCurrentPlan('free');
          setCurrentBillingCycle(null);
        }
      }

    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
      // Fallback to user profile data
      const tier = userProfile?.subscription_tier;
      if (tier === 'premium' || tier === 'unlimited') {
        console.log('⚠️ Using fallback from user profile:', tier);
        setCurrentPlan(tier);
      } else {
        console.log('⚠️ No paid subscription_tier in user profile, defaulting to FREE');
        setCurrentPlan('free');
      }
    }
  };

  const loadProducts = async () => {
    try {
      setIsInitializing(true);
      console.log('🚀 Loading RevenueCat products...');

      // Development bypass: Skip product loading
      if (config.bypassRevenueCat) {
        console.log('🔧 DEVELOPMENT MODE: Skipping RevenueCat product loading');
        setRevenueCatProducts([]);
        return;
      }

      // Wait for RevenueCat to be ready (with timeout)
      let attempts = 0;
      while (!RevenueCatService.isReady() && attempts < 10) {
        console.log(`⏳ Waiting for RevenueCat to initialize... attempt ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!RevenueCatService.isReady()) {
        console.warn('⚠️ RevenueCat not initialized after waiting 5 seconds');
        console.warn('⚠️ This usually means:');
        console.warn('   1. Network issue preventing RevenueCat connection');
        console.warn('   2. Invalid RevenueCat API key');
        console.warn('   3. RevenueCat dashboard not configured properly');
        Alert.alert(
          'Service Not Ready',
          'The subscription service is still initializing. Please try again in a moment.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('✅ RevenueCat is ready, fetching products...');
      const products = await RevenueCatService.getAvailableProducts();

      console.log('📦 Products received from RevenueCat:', products.length);

      if (products.length === 0) {
        console.warn('⚠️ No products returned from RevenueCat!');
        console.warn('⚠️ Possible causes:');
        console.warn('   1. No offerings configured in RevenueCat dashboard');
        console.warn('   2. No products in current offering');
        console.warn('   3. App Store Connect products not properly linked');
        console.warn('   4. RevenueCat offering identifier mismatch');
      } else {
        console.log('✅ Loaded products successfully:', products.length);
        // Log product details for debugging
        products.forEach(p => {
          console.log(`  📦 ${p.identifier}: ${p.priceString} (${p.billingCycle})`);
        });
      }

      setRevenueCatProducts(products);
    } catch (error) {
      console.error('❌ Failed to load products:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      Alert.alert(
        'Error',
        'Failed to load subscription options. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const getProductPrice = (plan: Plan): string => {
    if (plan.id === 'free') return 'Free';

    const packageId = plan.packageIds[billingCycle];
    if (!packageId) return `${plan.price[billingCycle]}`;

    // If still initializing, show loading
    if (isInitializing) {
      return 'Loading...';
    }

    // If no products loaded, show hardcoded fallback price
    if (revenueCatProducts.length === 0) {
      console.warn(`⚠️ No products loaded, using hardcoded price`);
      if (plan.id === 'premium') {
        return billingCycle === 'monthly' ? '£6.99/month' : '£69.99/year';
      } else if (plan.id === 'unlimited') {
        return billingCycle === 'monthly' ? '£12.99/month' : '£129.99/year';
      }
      return 'Free';
    }

    console.log(`🔍 Looking for package: ${packageId}, billing cycle: ${billingCycle}`);
    console.log(`📦 Available products:`, revenueCatProducts.map(p => ({
      id: p.identifier,
      price: p.priceString,
      billingCycle: p.billingCycle
    })));

    // Try multiple strategies to find the price:

    // Strategy 1: Exact package ID match
    let product = revenueCatProducts.find(p => p.identifier === packageId);
    if (product) {
      console.log(`✅ Found price by exact match (${packageId}): ${product.priceString}`);
      return product.priceString;
    }

    // Strategy 2: Try with $rc_ prefix (RevenueCat default)
    const rcPackageId = `$rc_${packageId}`;
    product = revenueCatProducts.find(p => p.identifier === rcPackageId);
    if (product) {
      console.log(`✅ Found price with $rc_ prefix (${rcPackageId}): ${product.priceString}`);
      return product.priceString;
    }

    // Strategy 3: Match by billing cycle
    product = revenueCatProducts.find(p => p.billingCycle === billingCycle);
    if (product) {
      console.log(`✅ Found price by billing cycle (${billingCycle}): ${product.priceString}`);
      return product.priceString;
    }

    // Strategy 4: For monthly, try any variation
    if (billingCycle === 'monthly') {
      product = revenueCatProducts.find(p =>
        p.identifier.toLowerCase().includes('month') ||
        p.billingCycle === 'monthly'
      );
      if (product) {
        console.log(`✅ Found monthly price by keyword match: ${product.priceString}`);
        return product.priceString;
      }
    }

    // Strategy 5: For yearly, try any variation
    if (billingCycle === 'yearly') {
      product = revenueCatProducts.find(p =>
        p.identifier.toLowerCase().includes('year') ||
        p.identifier.toLowerCase().includes('annual') ||
        p.billingCycle === 'yearly'
      );
      if (product) {
        console.log(`✅ Found yearly price by keyword match: ${product.priceString}`);
        return product.priceString;
      }
    }

    // Fallback: Use hardcoded price from plan definition
    console.warn(`⚠️ No exact match for ${packageId}, using hardcoded fallback`);
    if (plan.id === 'premium') {
      return billingCycle === 'monthly' ? '£6.99/month' : '£69.99/year';
    } else if (plan.id === 'unlimited') {
      return billingCycle === 'monthly' ? '£12.99/month' : '£129.99/year';
    }
    return 'Free';
  };

  const handleUpgrade = async (plan: Plan) => {
    if (plan.id === 'free') {
      Alert.alert('Downgrade to Free', 'To cancel your subscription, please manage your subscription in App Store settings.');
      return;
    }

    // Development bypass: Show alert explaining bypass mode
    if (config.bypassRevenueCat) {
      Alert.alert(
        'Development Mode',
        `Subscription purchases are disabled in development mode.\n\nCurrent hardcoded tier: ${config.developmentTier?.toUpperCase()}\n\nTo enable purchases:\n1. Build a production app\n2. Set bypassRevenueCat: false in environment.ts`,
        [{ text: 'OK' }]
      );
      return;
    }

    const packageId = plan.packageIds[billingCycle];
    if (!packageId) {
      Alert.alert('Error', 'Invalid subscription plan selected.');
      return;
    }

    // Check if user is switching between billing cycles
    if ((currentPlan === 'premium' || currentPlan === 'unlimited') && currentBillingCycle && currentBillingCycle !== billingCycle) {
      const currentCycleName = currentBillingCycle === 'monthly' ? 'Monthly' : 'Yearly';
      const newCycleName = billingCycle === 'monthly' ? 'Monthly' : 'Yearly';

      Alert.alert(
        'Switch Billing Cycle',
        `You are currently subscribed to the ${currentCycleName} plan.\n\nSwitching to ${newCycleName} will start a new subscription immediately. We recommend waiting until your current billing period ends to avoid overlapping charges.\n\nDo you want to proceed?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Switch Now',
            style: 'destructive',
            onPress: () => performPurchase(packageId, plan.name, billingCycle),
          },
        ]
      );
      return;
    }

    // Check if already subscribed (shouldn't reach here due to isCurrentPlan check)
    if ((currentPlan === 'premium' || currentPlan === 'unlimited') && currentBillingCycle === billingCycle && currentPlan === plan.id) {
      Alert.alert(
        'Already Subscribed',
        `You already have an active ${plan.name} subscription with this billing cycle.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // New subscription
    Alert.alert(
      'Confirm Upgrade',
      `Upgrade to ${plan.name} (${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}) for ${getProductPrice(plan)}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Upgrade',
          onPress: () => performPurchase(packageId, plan.name, billingCycle),
        },
      ]
    );
  };

  const performPurchase = async (packageId: string, planName: string, billingCycle: 'monthly' | 'yearly') => {
    try {
      setIsLoading(true);
      console.log('💳 Starting upgrade process...');
      console.log('📦 Package ID:', packageId);
      console.log('💰 Plan:', planName);
      console.log('🔄 Billing cycle:', billingCycle);

      if (!RevenueCatService.isReady()) {
        Alert.alert('Error', 'Subscription service not ready. Please try again.');
        return;
      }

      // Make the purchase
      const result = await RevenueCatService.purchasePackage(packageId);

      if (result.success) {
        console.log('✅ Purchase successful!');

        // Refresh user profile to get updated subscription status
        await refreshUser();

        // Also refresh the current plan status from RevenueCat
        await checkSubscriptionStatus();

        // Success!
        Alert.alert(
          'Success! 🎉',
          `You've successfully upgraded to ${planName}!\n\nYou now have access to all ${planName} features.`,
          [
            {
              text: 'Awesome!',
              onPress: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        console.error('❌ Purchase failed:', result.error);

        if (result.error === 'Purchase cancelled') {
          // User cancelled - just show a toast, don't alert
          console.log('User cancelled purchase');
        } else {
          Alert.alert(
            'Purchase Failed',
            result.error || 'Something went wrong. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('❌ Purchase error:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Restoring purchases...');

      const result = await RevenueCatService.restorePurchases();

      if (result.success) {
        await refreshUser();

        const tier = result.customerInfo ? RevenueCatService.getUserTier(result.customerInfo) : 'free';

        if (tier !== 'free') {
          Alert.alert(
            'Success! 🎉',
            `Your ${tier === 'premium' ? 'Premium' : 'Unlimited'} subscription has been restored!`,
            [
              {
                text: 'Great!',
                onPress: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
              },
            ]
          );
        } else {
          Alert.alert(
            'No Purchases Found',
            'We couldn\'t find any previous purchases to restore.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Restore Failed',
          result.error || 'Failed to restore purchases. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Restore error:', error);
      Alert.alert(
        'Error',
        'Failed to restore purchases. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlanCard = (plan: Plan) => {
    // Check if this is the current plan AND billing cycle
    const isCurrentPlan = plan.id === currentPlan && (
      plan.id === 'free' || // Free plan doesn't have billing cycle
      currentBillingCycle === billingCycle // Paid plans must match billing cycle
    );
    const price = getProductPrice(plan);

    const cardWidth = width - 64;

    const getPlanGradient = (): [string, string, string] => {
      switch (plan.id) {
        case 'premium':
          return ['#241236', '#6D28D9', '#EC4899'];
        case 'unlimited':
          return ['#2A1408', '#F59E0B', '#EC4899'];
        default:
          return ['#0F2457', '#3B82F6', '#2563EB'];
      }
    };

    const planIconName = plan.id === 'free' ? plan.icon : 'crown';

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isCurrentPlan && styles.planCardActive,
          { borderColor: plan.color, width: cardWidth },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          handleUpgrade(plan);
        }}
        disabled={isLoading || isInitializing}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={getPlanGradient()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.planCardGradient,
            { minHeight: plan.id === 'free' ? 380 : 520 },
          ]}
        >
          {plan.popular && (
            <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
              <Text style={styles.popularText}>Most Popular</Text>
            </View>
          )}

          <View style={styles.planHeader}>
            <View style={[styles.planIcon, { backgroundColor: plan.color + '20' }]}>
              {plan.id === 'free' ? (
                <Ionicons name={planIconName as any} size={32} color={plan.color} />
              ) : (
                <MaterialCommunityIcons name={planIconName as any} size={32} color={plan.color} />
              )}
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planDescription}>{plan.description}</Text>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>{price}</Text>
            {plan.id !== 'free' && (
              <Text style={styles.pricePeriod}>
                /{billingCycle === 'monthly' ? 'month' : 'year'}
              </Text>
            )}
          </View>

          {plan.savings && billingCycle === 'yearly' && (
            <View style={[styles.savingsBadge, { backgroundColor: plan.color + '30' }]}>
              <Text style={[styles.savingsText, { color: plan.color }]}>{plan.savings}</Text>
            </View>
          )}

          <View style={styles.featuresContainer}>
            {plan.features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color={plan.color} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {isCurrentPlan ? (
            <View style={[styles.currentPlanBadge, { backgroundColor: plan.color }]}>
              <Text style={styles.currentPlanText}>Current Plan</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleUpgrade(plan);
              }}
              disabled={isLoading || isInitializing}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeButtonGradient}
              >
                <Text style={[styles.upgradeButtonText, { color: plan.color }]}>
                  {plan.id === 'free'
                    ? 'Downgrade'
                    : (currentPlan === 'premium' || currentPlan === 'unlimited') && currentBillingCycle !== billingCycle
                      ? 'Switch Plan'
                      : currentPlan !== 'free' && currentPlan !== plan.id
                        ? 'Switch to ' + plan.name
                        : 'Upgrade Now'}
                </Text>
                {plan.id !== 'free' && (
                  <Ionicons name="arrow-forward" size={20} color={plan.color} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (isInitializing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading subscription options...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Upgrade</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Unlock all features and take your music career to the next level
          </Text>
        </View>

        {/* Billing Cycle Toggle */}
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={styles.billingOption}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setBillingCycle('monthly');
            }}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {billingCycle === 'monthly' ? (
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.billingOptionGradient}
              >
                <Text style={styles.billingTextActive}>Monthly</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.billingText}>Monthly</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.billingOption}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setBillingCycle('yearly');
            }}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {billingCycle === 'yearly' ? (
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.billingOptionGradient}
              >
                <View style={styles.billingRow}>
                  <Text style={styles.billingTextActive} numberOfLines={1}>
                    Yearly
                  </Text>
                  <View style={styles.savingsPill}>
                    <Text style={styles.savingsPillText} numberOfLines={1}>
                      Save up to 17%
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            ) : (
              <View style={styles.billingRow}>
                <Text style={styles.billingText} numberOfLines={1}>
                  Yearly
                </Text>
                <View style={styles.savingsPill}>
                  <Text style={styles.savingsPillText} numberOfLines={1}>
                    Save up to 17%
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Plan Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={width - 48}
          decelerationRate="fast"
          contentContainerStyle={styles.plansScrollContent}
        >
          {plans.map(plan => renderPlanCard(plan))}
        </ScrollView>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={isLoading}
        >
          <Ionicons name="refresh" size={20} color={theme.colors.primary} />
          <Text style={[styles.restoreButtonText, { color: theme.colors.primary }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Subscriptions automatically renew unless cancelled at least 24 hours before the end of the
            current period.
          </Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('TermsOfService' as never)}>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerDivider}>•</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy' as never)}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingOverlayText}>Processing...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -0.4,
    lineHeight: 40,
    color: '#FFFFFF',
    fontFamily: Typography.body.fontFamily,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    ...Typography.headerLarge,
    fontSize: 32,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 28,
    padding: 6,
    marginHorizontal: 16,
    marginBottom: 30,
  },
  billingOption: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billingOptionGradient: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billingRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  billingText: {
    ...Typography.button,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    flexShrink: 1,
  },
  billingTextActive: {
    color: '#FFFFFF',
    ...Typography.button,
    fontSize: 14,
    flexShrink: 1,
  },
  savingsPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    flexShrink: 0,
  },
  savingsPillText: {
    ...Typography.label,
    fontSize: 10,
    color: '#FFFFFF',
  },
  plansScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  planCard: {
    borderRadius: 26,
    borderWidth: 2,
    marginRight: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  planCardActive: {
    borderWidth: 3,
  },
  planCardGradient: {
    padding: 24,
    backgroundColor: '#111827',
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  popularText: {
    ...Typography.label,
    fontSize: 12,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    ...Typography.headerMedium,
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  planDescription: {
    ...Typography.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  price: {
    ...Typography.headerLarge,
    fontSize: 40,
    color: '#FFFFFF',
  },
  pricePeriod: {
    ...Typography.body,
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 4,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  savingsText: {
    ...Typography.button,
    fontSize: 14,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    ...Typography.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
  currentPlanBadge: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentPlanText: {
    ...Typography.button,
    fontSize: 16,
    color: '#FFFFFF',
  },
  upgradeButton: {
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 999,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  upgradeButtonText: {
    ...Typography.button,
    fontSize: 16,
    color: '#FFFFFF',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 20,
  },
  restoreButtonText: {
    ...Typography.button,
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    alignItems: 'center',
  },
  footerText: {
    ...Typography.label,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerLink: {
    ...Typography.label,
    fontSize: 12,
    color: '#10B981',
    textDecorationLine: 'underline',
  },
  footerDivider: {
    ...Typography.label,
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
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
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#1F2937',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  loadingOverlayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
