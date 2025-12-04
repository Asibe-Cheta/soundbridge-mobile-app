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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import InAppPurchaseService, { SoundBridgeProduct } from '../services/InAppPurchaseService';

interface Plan {
  id: 'free' | 'pro';
  name: string;
  description: string;
  icon: string;
  price: { monthly: number; yearly: number };
  color: string;
  features: string[];
  popular: boolean;
  savings?: string;
  productIds: {
    monthly: string;
    yearly: string;
  };
}

export default function UpgradeScreen() {
  const navigation = useNavigation();
  const { user, session, refreshUser } = useAuth();
  const { theme } = useTheme();
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro'>('free');
  const [appStoreProducts, setAppStoreProducts] = useState<any[]>([]);
  const [soundBridgeProducts, setSoundBridgeProducts] = useState<SoundBridgeProduct[]>([]);
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false); // Hide dev banner in all builds

  // Product IDs based on web team's configuration
  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      icon: 'flash',
      price: { monthly: 0, yearly: 0 },
      color: '#3B82F6',
      features: [
        '3 lifetime uploads',
        '5 professional searches/month',
        '3 direct messages/month',
        '150MB storage',
        'Basic profile & portfolio',
        'Community support',
      ],
      popular: false,
      productIds: { monthly: '', yearly: '' },
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Everything you need to grow your career',
      icon: 'diamond',
      price: { monthly: 9.99, yearly: 99 },
      color: '#10B981',
      features: [
        '10 uploads per month (resets on 1st)',
        'Unlimited searches & messages',
        '500MB storage',
        'Advanced filters',
        'Verified badge eligibility',
        'Payment protection & escrow',
        'Detailed analytics',
        'Availability calendar',
        'Priority support',
      ],
      popular: true,
      savings: 'Save £20',
      productIds: Platform.select({
        ios: {
          monthly: 'com.soundbridge.pro.monthly',
          yearly: 'com.soundbridge.pro.yearly',
        },
        android: {
          monthly: 'soundbridge_pro_monthly',
          yearly: 'soundbridge_pro_yearly',
        },
      }) || { monthly: '', yearly: '' },
    },
  ];

  useEffect(() => {
    initializeIAP();
  }, []);

  useEffect(() => {
    // Update current plan from user data
    if ((user as any)?.subscription_tier) {
      setCurrentPlan((user as any).subscription_tier as 'free' | 'pro');
    }
  }, [user]);

  const initializeIAP = async () => {
    try {
      setIsInitializing(true);
      console.log('🚀 Initializing In-App Purchases...');
      
      const success = await InAppPurchaseService.initialize();
      if (success) {
        const { appStoreProducts, soundBridgeProducts } = await InAppPurchaseService.getAvailableProducts();
        setAppStoreProducts(appStoreProducts);
        setSoundBridgeProducts(soundBridgeProducts);
        console.log('✅ IAP initialized successfully');
        console.log('📦 App Store products:', appStoreProducts.length);
        console.log('🌐 SoundBridge products:', soundBridgeProducts.length);
      } else {
        console.error('❌ Failed to initialize IAP');
        Alert.alert('Error', 'Failed to load subscription options. Please try again.');
      }
    } catch (error) {
      console.error('❌ IAP initialization error:', error);
      Alert.alert('Error', 'Failed to initialize payment system. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  };

  const getProductPrice = (plan: Plan): string => {
    const productId = plan.productIds[billingCycle];
    if (!productId) return `$${plan.price[billingCycle]}`;

    // Try to find the actual price from app store
    const appStoreProduct = appStoreProducts.find(p => p.productId === productId);
    if (appStoreProduct) {
      return `${appStoreProduct.price} ${appStoreProduct.currencyCode}`;
    }

    // Fallback to configured price
    return `$${plan.price[billingCycle]}`;
  };

  const handleUpgrade = async (plan: Plan) => {
    if (!session?.access_token) {
      Alert.alert('Error', 'Please log in to upgrade your subscription.');
      return;
    }

    if (plan.id === 'free') {
      Alert.alert('Info', 'You are already on the free plan.');
      return;
    }

    if (plan.id === currentPlan) {
      Alert.alert('Info', `You are already subscribed to the ${plan.name} plan.`);
      return;
    }

    const productId = plan.productIds[billingCycle];
    if (!productId) {
      Alert.alert('Error', 'Product not available for this platform.');
      return;
    }

    try {
      setIsLoading(true);
      console.log('💳 Starting upgrade process...');
      console.log('📦 Product ID:', productId);
      console.log('💰 Plan:', plan.name);
      console.log('🔄 Billing cycle:', billingCycle);

      // Show confirmation dialog
      Alert.alert(
        'Confirm Subscription',
        `Upgrade to ${plan.name} (${billingCycle}) for ${getProductPrice(plan)}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Subscribe',
            onPress: async () => {
              await performPurchase(productId, plan);
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Upgrade error:', error);
      Alert.alert('Error', 'Failed to start upgrade process. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const performPurchase = async (productId: string, plan: Plan) => {
    try {
      setIsLoading(true);
      console.log('🛒 Performing purchase for:', productId);

      const result = await InAppPurchaseService.purchaseProduct(productId, session!.access_token);
      
      if (result.success) {
        console.log('✅ Purchase successful!');
        
        // Refresh user data to get updated subscription
        await refreshUser();
        
        // Haptic feedback for success
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          console.log('Haptics not available:', error);
        }
        
        // Enhanced success message with feature highlights
        const planFeatures = plan.id === 'pro' 
          ? '✨ Unlimited uploads\n🎵 High-quality audio\n📊 Advanced analytics\n💰 Monetization tools'
          : '✨ Everything in Pro\n👥 Team collaboration\n🏷️ White-label solution\n🔧 API access\n🛡️ Advanced security';
        
        Alert.alert(
          'Subscription Activated! 🎉',
          `Welcome to ${plan.name}! Your subscription is now active and all premium features are unlocked.\n\n${planFeatures}\n\nEnjoy your enhanced SoundBridge experience!`,
          [
            {
              text: 'Explore Features',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        console.error('❌ Purchase failed:', result.error);
        Alert.alert('Purchase Failed', result.error || 'Unable to complete purchase. Please try again.');
      }
    } catch (error) {
      console.error('❌ Purchase error:', error);
      Alert.alert('Purchase Error', 'An error occurred during purchase. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Restoring purchases...');
      
      const purchases = await InAppPurchaseService.restorePurchases();
      
      if (purchases.length > 0) {
        console.log('✅ Found purchases to restore:', purchases.length);
        
        // Refresh user data to sync any restored subscriptions
        await refreshUser();
        
        Alert.alert('Purchases Restored', 'Your previous purchases have been restored.');
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      }
    } catch (error) {
      console.error('❌ Restore purchases error:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
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
        
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Loading subscription options...
            </Text>
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
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        
        <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <BackButton
            style={styles.backButton}
            onPress={() => navigation.goBack()}
           />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Choose Your Plan
          </Text>
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
            disabled={isLoading}
          >
            <Ionicons name="refresh" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Development Mode Banner */}
        {isDevelopmentMode && (
          <View style={[styles.devBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Ionicons name="warning" size={16} color="#F59E0B" />
            <Text style={[styles.devBannerText, { color: '#92400E' }]}>
              Development Mode: IAP simulation enabled
            </Text>
          </View>
        )}

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Unlock premium features and take your music to the next level
        </Text>

        {/* Billing Cycle Toggle */}
        <View style={[styles.billingToggle, { backgroundColor: theme.colors.card }]}>
          <Text style={[
            styles.billingText,
            { color: billingCycle === 'monthly' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            Monthly
          </Text>
          <Switch
            value={billingCycle === 'yearly'}
            onValueChange={(value) => setBillingCycle(value ? 'yearly' : 'monthly')}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.background}
          />
          <View style={styles.yearlyContainer}>
            <Text style={[
              styles.billingText,
              { color: billingCycle === 'yearly' ? theme.colors.primary : theme.colors.textSecondary }
            ]}>
              Yearly
            </Text>
            <View style={[styles.savingsBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.savingsText}>Save 17%</Text>
            </View>
          </View>
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                { 
                  backgroundColor: theme.colors.card,
                  borderColor: plan.popular ? plan.color : theme.colors.border,
                  borderWidth: plan.popular ? 2 : 1,
                },
                currentPlan === plan.id && styles.currentPlanCard,
              ]}
            >
              {plan.popular && (
                <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                  <Text style={styles.popularText}>Most Popular</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View style={[styles.planIcon, { backgroundColor: plan.color }]}>
                  <Ionicons name={plan.icon as any} size={24} color="#FFFFFF" />
                </View>
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, { color: theme.colors.text }]}>
                    {plan.name}
                  </Text>
                  <Text style={[styles.planDescription, { color: theme.colors.textSecondary }]}>
                    {plan.description}
                  </Text>
                </View>
                {currentPlan === plan.id && (
                  <View style={[styles.currentBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.currentText}>Current</Text>
                  </View>
                )}
              </View>

              <View style={styles.priceContainer}>
                <Text style={[styles.price, { color: theme.colors.text }]}>
                  {plan.id === 'free' ? 'Free' : getProductPrice(plan)}
                </Text>
                {plan.id !== 'free' && (
                  <Text style={[styles.priceSubtext, { color: theme.colors.textSecondary }]}>
                    per {billingCycle === 'monthly' ? 'month' : 'year'}
                  </Text>
                )}
                {billingCycle === 'yearly' && plan.savings && (
                  <Text style={[styles.savings, { color: plan.color }]}>
                    {plan.savings}
                  </Text>
                )}
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons name="checkmark" size={16} color={plan.color} />
                    <Text style={[styles.featureText, { color: theme.colors.text }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.upgradeButton,
                  {
                    backgroundColor: currentPlan === plan.id 
                      ? theme.colors.border 
                      : plan.color,
                  },
                ]}
                onPress={() => handleUpgrade(plan)}
                disabled={isLoading || currentPlan === plan.id}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.upgradeButtonText}>
                      {currentPlan === plan.id 
                        ? 'Current Plan' 
                        : plan.id === 'free' 
                        ? 'Downgrade' 
                        : 'Subscribe'}
                    </Text>
                    {currentPlan !== plan.id && (
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            • Subscriptions auto-renew unless cancelled
          </Text>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            • Cancel anytime in your device settings
          </Text>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            • Prices may vary by region
          </Text>
        </View>
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
    top: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  restoreButton: {
    padding: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
    lineHeight: 22,
  },
  billingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  billingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  yearlyContainer: {
    alignItems: 'center',
    marginLeft: 12,
  },
  savingsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  savingsText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  plansContainer: {
    paddingHorizontal: 20,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
  },
  currentPlanCard: {
    opacity: 0.8,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    right: 20,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  planDescription: {
    fontSize: 14,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceSubtext: {
    fontSize: 14,
  },
  savings: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  devBannerText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});