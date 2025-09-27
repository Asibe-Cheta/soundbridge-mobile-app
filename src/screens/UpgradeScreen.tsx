import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface Plan {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  description: string;
  icon: string;
  price: { monthly: number; yearly: number };
  color: string;
  features: string[];
  popular: boolean;
  savings?: string;
}

export default function UpgradeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'enterprise'>('free'); // TODO: Get from user data

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      icon: 'flash',
      price: { monthly: 0, yearly: 0 },
      color: '#3B82F6',
      features: [
        '3 uploads total',
        '10MB file size limit',
        '100MB total storage',
        'Standard processing (2-5 min)',
        'Basic copyright protection',
        'Basic analytics',
        'Community features',
        'Standard audio quality',
        'SoundBridge branding'
      ],
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For growing creators',
      icon: 'crown',
      price: { monthly: 9.99, yearly: 99.99 },
      color: '#8B5CF6',
      features: [
        'Everything in Free',
        '50MB file size limit',
        '2GB total storage',
        '10 uploads per month',
        'Priority processing (1-2 min)',
        'Advanced copyright protection',
        'Advanced analytics',
        'Custom branding',
        'Revenue sharing (95%)',
        'Priority support',
        'HD audio quality',
        'Direct fan messaging',
        '3 concurrent uploads'
      ],
      popular: true,
      savings: 'Save 17%'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For professional creators',
      icon: 'star',
      price: { monthly: 49.99, yearly: 499.99 },
      color: '#F59E0B',
      features: [
        'Everything in Pro',
        '100MB file size limit',
        '10GB total storage',
        'Unlimited uploads',
        'Instant processing (< 1 min)',
        'AI-powered copyright protection',
        'Human + AI content moderation',
        'White-label platform',
        'Custom integrations',
        'Revenue sharing (98%)',
        'Dedicated support',
        'API access',
        'Custom domain',
        'Advanced collaboration tools',
        'Priority feature requests',
        '5 concurrent uploads'
      ],
      popular: false,
      savings: 'Save 17%'
    }
  ];

  const handleUpgrade = async (planId: 'pro' | 'enterprise') => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to upgrade your plan');
      return;
    }

    setIsLoading(true);
    
    try {
      // TODO: Implement actual upgrade logic
      Alert.alert(
        'Upgrade Plan',
        `Upgrade to ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan for $${billingCycle === 'monthly' ? plans.find(p => p.id === planId)?.price.monthly : plans.find(p => p.id === planId)?.price.yearly}/${billingCycle === 'monthly' ? 'month' : 'year'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upgrade', 
            onPress: () => {
              // Mock upgrade success
              Alert.alert('Success', `Successfully upgraded to ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan!`);
              setCurrentPlan(planId);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Upgrade error:', error);
      Alert.alert('Error', 'Failed to upgrade plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      category: 'Content & Uploads',
      icon: 'musical-notes',
      items: [
        { name: 'Music Tracks', free: '3 total', pro: '10/month', enterprise: 'Unlimited' },
        { name: 'Podcast Episodes', free: '3 total', pro: '10/month', enterprise: 'Unlimited' },
        { name: 'Events', free: '3 total', pro: '10/month', enterprise: 'Unlimited' },
        { name: 'Max File Size', free: '10MB', pro: '50MB', enterprise: '100MB' },
        { name: 'Processing Speed', free: 'Standard (2-5 min)', pro: 'Priority (1-2 min)', enterprise: 'Instant (< 1 min)' },
        { name: 'Concurrent Uploads', free: '1', pro: '3', enterprise: '5' },
        { name: 'Storage Space', free: '100MB', pro: '2GB', enterprise: '10GB' },
        { name: 'Audio Quality', free: 'Standard', pro: 'HD', enterprise: 'Lossless' }
      ]
    },
    {
      category: 'Analytics & Insights',
      icon: 'bar-chart',
      items: [
        { name: 'Basic Analytics', free: '✓', pro: '✓', enterprise: '✓' },
        { name: 'Advanced Analytics', free: '✗', pro: '✓', enterprise: '✓' },
        { name: 'Demographic Data', free: '✗', pro: '✓', enterprise: '✓' },
        { name: 'Geographic Insights', free: '✗', pro: '✓', enterprise: '✓' },
        { name: 'Custom Reports', free: '✗', pro: '✗', enterprise: '✓' }
      ]
    },
    {
      category: 'Monetization',
      icon: 'cash',
      items: [
        { name: 'Revenue Sharing', free: '✗', pro: '95%', enterprise: '98%' },
        { name: 'Direct Payments', free: '✗', pro: '✓', enterprise: '✓' },
        { name: 'Subscription Tiers', free: '✗', pro: '✓', enterprise: '✓' },
        { name: 'Merchandise Sales', free: '✗', pro: '✗', enterprise: '✓' }
      ]
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Upgrade Plan</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.upgradeIcon}>
            <Ionicons name="rocket" size={32} color="#DC2626" />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Choose Your Plan</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Start free, upgrade when you're ready. No hidden fees, no surprises.
          </Text>

          {/* Billing Toggle */}
          <View style={styles.billingToggle}>
            <Text style={[styles.billingLabel, { color: billingCycle === 'monthly' ? theme.colors.text : theme.colors.textSecondary }]}>
              Monthly
            </Text>
            <Switch
              value={billingCycle === 'yearly'}
              onValueChange={(value) => setBillingCycle(value ? 'yearly' : 'monthly')}
              trackColor={{ false: theme.colors.border, true: '#DC2626' }}
              thumbColor={billingCycle === 'yearly' ? '#FFFFFF' : '#f4f3f4'}
            />
            <Text style={[styles.billingLabel, { color: billingCycle === 'yearly' ? theme.colors.text : theme.colors.textSecondary }]}>
              Yearly
            </Text>
            {billingCycle === 'yearly' && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>Save 17%</Text>
              </View>
            )}
          </View>
        </View>

        {/* Pricing Cards */}
        <View style={styles.plansContainer}>
          {plans.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
            const isCurrentPlan = currentPlan === plan.id;
            
            return (
              <View key={plan.id} style={[
                styles.planCard,
                { backgroundColor: theme.colors.surface },
                plan.popular && styles.popularCard,
                isCurrentPlan && styles.currentPlanCard
              ]}>
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>Most Popular</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <View style={[styles.planIcon, { backgroundColor: `${plan.color}20` }]}>
                    <Ionicons name={plan.icon as any} size={24} color={plan.color} />
                  </View>
                  <Text style={[styles.planName, { color: theme.colors.text }]}>{plan.name}</Text>
                  <Text style={[styles.planDescription, { color: theme.colors.textSecondary }]}>{plan.description}</Text>
                  
                  <View style={styles.priceContainer}>
                    <Text style={[styles.price, { color: theme.colors.text }]}>${price}</Text>
                    <Text style={[styles.pricePeriod, { color: theme.colors.textSecondary }]}>
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </Text>
                  </View>

                  {plan.savings && billingCycle === 'yearly' && (
                    <Text style={styles.planSavings}>{plan.savings}</Text>
                  )}
                </View>

                {/* Features */}
                <View style={styles.featuresContainer}>
                  {plan.features.slice(0, 6).map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons name="checkmark" size={16} color="#10B981" />
                      <Text style={[styles.featureText, { color: theme.colors.textSecondary }]}>{feature}</Text>
                    </View>
                  ))}
                  {plan.features.length > 6 && (
                    <Text style={[styles.moreFeatures, { color: theme.colors.textSecondary }]}>
                      +{plan.features.length - 6} more features
                    </Text>
                  )}
                </View>

                {/* CTA Button */}
                <View style={styles.ctaContainer}>
                  {isCurrentPlan ? (
                    <View style={[styles.currentPlanButton, { backgroundColor: theme.colors.card }]}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={[styles.currentPlanText, { color: theme.colors.text }]}>Current Plan</Text>
                    </View>
                  ) : plan.id === 'free' ? (
                    <TouchableOpacity 
                      style={[styles.freeButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                      onPress={() => {
                        if (currentPlan !== 'free') {
                          Alert.alert('Downgrade', 'Are you sure you want to downgrade to the free plan?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Downgrade', onPress: () => setCurrentPlan('free') }
                          ]);
                        }
                      }}
                    >
                      <Text style={[styles.freeButtonText, { color: theme.colors.text }]}>
                        {currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.upgradeButton, { backgroundColor: plan.color }]}
                      onPress={() => handleUpgrade(plan.id as 'pro' | 'enterprise')}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.upgradeButtonText}>Upgrade to {plan.name}</Text>
                          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Features Comparison */}
        <View style={[styles.comparisonSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.comparisonTitle, { color: theme.colors.text }]}>Compare Features</Text>
          
          {features.map((category, categoryIndex) => (
            <View key={categoryIndex} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Ionicons name={category.icon as any} size={20} color="#DC2626" />
                <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>{category.category}</Text>
              </View>
              
              {category.items.map((item, itemIndex) => (
                <View key={itemIndex} style={[styles.comparisonRow, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.featureName, { color: theme.colors.text }]}>{item.name}</Text>
                  <View style={styles.planValues}>
                    <Text style={[styles.planValue, { color: theme.colors.textSecondary }]}>{item.free}</Text>
                    <Text style={[styles.planValue, { color: theme.colors.textSecondary }]}>{item.pro}</Text>
                    <Text style={[styles.planValue, { color: theme.colors.textSecondary }]}>{item.enterprise}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* FAQ Section */}
        <View style={[styles.faqSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.faqTitle, { color: theme.colors.text }]}>Frequently Asked Questions</Text>
          
          {[
            {
              q: "Can I change my plan anytime?",
              a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately."
            },
            {
              q: "What happens to my content if I downgrade?",
              a: "Your content is always safe. You keep all your uploads and can still access them."
            },
            {
              q: "How does revenue sharing work?",
              a: "Pro users keep 95% of earnings, Enterprise users keep 98%. Payouts available at $25 minimum."
            },
            {
              q: "Do you offer refunds?",
              a: "We offer a 30-day money-back guarantee for all paid plans."
            }
          ].map((faq, index) => (
            <View key={index} style={[styles.faqItem, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>{faq.q}</Text>
              <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>{faq.a}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  upgradeIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#DC262620',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  billingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  billingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  savingsBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  plansContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  planCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  popularCard: {
    borderColor: '#8B5CF6',
    transform: [{ scale: 1.02 }],
  },
  currentPlanCard: {
    borderColor: '#10B981',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  pricePeriod: {
    fontSize: 16,
    marginLeft: 4,
  },
  planSavings: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
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
  moreFeatures: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  ctaContainer: {
    marginTop: 'auto',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  freeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  freeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  currentPlanText: {
    fontSize: 16,
    fontWeight: '600',
  },
  comparisonSection: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  comparisonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  featureName: {
    fontSize: 14,
    flex: 1,
  },
  planValues: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },
  planValue: {
    fontSize: 12,
    textAlign: 'center',
    flex: 1,
  },
  faqSection: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  faqItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
});
