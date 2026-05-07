import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { config } from '../config/environment';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  PurchasesStoreProduct,
  LOG_LEVEL,
} from 'react-native-purchases';

export interface RevenueCatProduct {
  identifier: string;
  description: string;
  title: string;
  price: number;
  priceString: string;
  currencyCode: string;
  billingCycle: 'monthly' | 'yearly';
  tier: 'premium' | 'unlimited';
}

export interface PurchaseResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}

class RevenueCatService {
  private isInitialized = false;
  private initializationAttempted = false;
  private initializationFailed = false;
  private currentOffering: PurchasesOffering | null = null;
  
  /**
   * Check if running in Expo Go (where native store features aren't available)
   */
  private isExpoGo(): boolean {
    try {
      // Check if we're in Expo Go by checking the execution environment
      return Constants.executionEnvironment === 'storeClient';
    } catch {
      // If Constants is not available, assume we're not in Expo Go
      return false;
    }
  }

  /**
   * Initialize RevenueCat SDK
   * @param apiKey - RevenueCat public API key (get from dashboard)
   * @param appUserID - Optional user ID (Supabase user ID recommended)
   */
  async initialize(apiKey: string, appUserID?: string): Promise<boolean> {
    // Prevent re-initialization if already attempted and failed
    if (this.initializationAttempted && this.initializationFailed) {
      console.log('⚠️ RevenueCat initialization already attempted and failed. Skipping to prevent loop.');
      return false;
    }

    // Skip initialization in Expo Go (native store not available)
    if (this.isExpoGo()) {
      console.log('⚠️ Running in Expo Go - RevenueCat native store features not available. Skipping initialization.');
      console.log('ℹ️ Use a development build or Test Store API Key for testing. See: https://rev.cat/sdk-test-store');
      this.initializationAttempted = true;
      this.initializationFailed = true;
      return false;
    }

    // Prevent multiple simultaneous initialization attempts
    if (this.initializationAttempted && !this.isInitialized) {
      console.log('⚠️ RevenueCat initialization already in progress. Skipping duplicate call.');
      return false;
    }

    this.initializationAttempted = true;

    if (!apiKey || apiKey.trim().length === 0) {
      console.warn('⚠️ RevenueCat API key is empty. Skipping initialization to prevent crash.');
      this.initializationFailed = true;
      return false;
    }

    try {
      console.log('🚀 Initializing RevenueCat...');
      console.log('📱 Platform:', Platform.OS);
      console.log('🔑 API Key:', apiKey.substring(0, 20) + '...');

      if (appUserID) {
        console.log('👤 App User ID:', appUserID);
      }

      // Configure RevenueCat
      Purchases.setLogLevel(LOG_LEVEL.DEBUG); // Use LOG_LEVEL.INFO in production

      // Initialize with API key
      if (Platform.OS === 'ios') {
        await Purchases.configure({ apiKey, appUserID });
      } else if (Platform.OS === 'android') {
        await Purchases.configure({ apiKey, appUserID });
      }

      console.log('✅ RevenueCat configured successfully');

      // Load current offering
      await this.loadOfferings();

      this.isInitialized = true;
      this.initializationFailed = false;
      console.log('✅ RevenueCat initialized successfully');
      return true;
    } catch (error: any) {
      this.initializationFailed = true;
      const errorMessage = error?.message || 'Unknown error';
      
      // Check if this is the Expo Go error
      if (errorMessage.includes('Expo Go') || errorMessage.includes('native store is not available')) {
        console.warn('⚠️ RevenueCat cannot initialize in Expo Go. This is expected.');
        console.warn('ℹ️ Use a development build or Test Store API Key for testing. See: https://rev.cat/sdk-test-store');
      } else {
        console.error('❌ Failed to initialize RevenueCat:', error);
      }
      
      // Don't throw - allow app to continue without RevenueCat
      return false;
    }
  }

  /**
   * Load available offerings from RevenueCat
   */
  private async loadOfferings(): Promise<void> {
    try {
      console.log('📦 Loading offerings from RevenueCat...');

      const offerings = await Purchases.getOfferings();

      if (offerings.current !== null) {
        this.currentOffering = offerings.current;
        console.log('✅ Current offering loaded:', this.currentOffering.identifier);
        console.log('📦 Available packages:', this.currentOffering.availablePackages.length);

        // Log available packages
        this.currentOffering.availablePackages.forEach((pkg) => {
          console.log(`  - ${pkg.identifier}: ${pkg.product.priceString} (${pkg.product.productIdentifier})`);
        });
      } else {
        console.warn('⚠️ No current offering found. Check RevenueCat dashboard configuration.');
      }
    } catch (error) {
      console.error('❌ Failed to load offerings:', error);
      throw error;
    }
  }

  /**
   * Get available subscription products
   */
  async getAvailableProducts(): Promise<RevenueCatProduct[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('RevenueCat not initialized. Call initialize() first.');
      }

      if (!this.currentOffering) {
        console.warn('⚠️ No offerings available');
        return [];
      }

      const products: RevenueCatProduct[] = [];

      for (const pkg of this.currentOffering.availablePackages) {
        const product = pkg.product;

        // Determine billing cycle and tier from product ID
        const billingCycle = this.getBillingCycleFromProduct(product.productIdentifier);
        const tier = this.getTierFromProduct(product.productIdentifier);

        const revenueCatProduct = {
          identifier: pkg.identifier,
          description: product.description,
          title: product.title,
          price: product.price,
          priceString: product.priceString,
          currencyCode: product.currencyCode,
          billingCycle,
          tier,
        };

        console.log(`📦 Package: ${pkg.identifier} | Product: ${product.productIdentifier} | Price: ${product.priceString}`);
        products.push(revenueCatProduct);
      }

      console.log('✅ Loaded products:', products.length);
      console.log('📋 Product identifiers:', products.map(p => p.identifier).join(', '));
      return products;
    } catch (error) {
      console.error('❌ Failed to get available products:', error);
      return [];
    }
  }

  /**
   * Purchase a subscription package
   * @param packageIdentifier - Package identifier (e.g., 'monthly', 'annual')
   */
  async purchasePackage(packageIdentifier: string): Promise<PurchaseResult> {
    try {
      console.log('💳 Starting purchase for package:', packageIdentifier);

      if (!this.isInitialized) {
        throw new Error('RevenueCat not initialized. Call initialize() first.');
      }

      if (!this.currentOffering) {
        throw new Error('No offerings available');
      }

      // Find the package
      const pkg = this.currentOffering.availablePackages.find(
        (p) => p.identifier === packageIdentifier
      );

      if (!pkg) {
        throw new Error(`Package not found: ${packageIdentifier}`);
      }

      console.log('📦 Found package:', pkg.product.title);
      console.log('💰 Price:', pkg.product.priceString);

      // Make the purchase
      console.log('🛒 Requesting purchase from App Store...');
      const purchaseResult = await Purchases.purchasePackage(pkg);

      console.log('✅ Purchase completed!');
      console.log('📊 Customer Info:', purchaseResult.customerInfo);

      // Check if user now has Premium/Unlimited entitlement
      const tier = this.getUserTier(purchaseResult.customerInfo);
      console.log('🎖️ User tier:', tier);

      // Sync with backend
      await this.syncWithBackend(purchaseResult.customerInfo);

      return {
        success: true,
        customerInfo: purchaseResult.customerInfo,
      };
    } catch (error: any) {
      console.error('❌ Purchase failed:', error);

      // Handle user cancellation
      if (error.userCancelled) {
        console.log('🚫 User cancelled the purchase');
        return {
          success: false,
          error: 'Purchase cancelled',
        };
      }

      return {
        success: false,
        error: error.message || 'Purchase failed',
      };
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<PurchaseResult> {
    try {
      console.log('🔄 Restoring purchases...');

      if (!this.isInitialized) {
        throw new Error('RevenueCat not initialized. Call initialize() first.');
      }

      const customerInfo = await Purchases.restorePurchases();
      console.log('✅ Purchases restored');
      console.log('📊 Customer Info:', customerInfo);

      // Check if user has Premium/Unlimited entitlement
      const tier = this.getUserTier(customerInfo);
      console.log('🎖️ User tier:', tier);

      // Sync with backend
      await this.syncWithBackend(customerInfo);

      return {
        success: true,
        customerInfo,
      };
    } catch (error) {
      console.error('❌ Failed to restore purchases:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Restore failed',
      };
    }
  }

  /**
   * Get current customer info
   * This automatically restores purchases from App Store/Play Store
   */
  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ RevenueCat not initialized');
        return null;
      }

      // getCustomerInfo() automatically restores purchases from the store
      // This ensures subscription status is maintained across app updates
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('📊 Customer Info retrieved (subscriptions automatically restored)');
      console.log('📊 Active entitlements:', Object.keys(customerInfo.entitlements.active));
      console.log('📊 Active subscriptions:', customerInfo.activeSubscriptions);

      return customerInfo;
    } catch (error) {
      console.error('❌ Failed to get customer info:', error);
      return null;
    }
  }

  /**
   * Restore subscription status on app launch/update
   * This ensures the user's subscription tier is maintained across app updates
   */
  async restoreSubscriptionStatus(): Promise<{ tier: 'free' | 'premium' | 'unlimited'; synced: boolean }> {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ RevenueCat not initialized, cannot restore subscription');
        return { tier: 'free', synced: false };
      }

      console.log('🔄 Restoring subscription status from RevenueCat...');
      
      // Get customer info (automatically restores from store)
      const customerInfo = await this.getCustomerInfo();
      
      if (!customerInfo) {
        console.warn('⚠️ No customer info available');
        return { tier: 'free', synced: false };
      }

      // Get user's tier
      const tier = this.getUserTier(customerInfo);
      console.log('✅ Subscription tier restored:', tier);

      // Sync with backend
      try {
        await this.syncWithBackend(customerInfo);
        console.log('✅ Subscription status synced with backend');
        return { tier, synced: true };
      } catch (syncError) {
        console.warn('⚠️ Failed to sync with backend (non-critical):', syncError);
        // Still return the tier even if sync fails
        return { tier, synced: false };
      }
    } catch (error) {
      console.error('❌ Failed to restore subscription status:', error);
      return { tier: 'free', synced: false };
    }
  }

  /**
   * Check if user has Premium entitlement
   */
  checkPremiumEntitlement(customerInfo: CustomerInfo): boolean {
    console.log('🔍 Checking Premium entitlement...');
    console.log('  Active entitlements:', Object.keys(customerInfo.entitlements.active));
    console.log('  Active subscriptions:', customerInfo.activeSubscriptions);

    // Check for premium_features entitlement (granted by Premium and Unlimited)
    if (customerInfo.entitlements.active['premium_features'] !== undefined) {
      console.log('  ✅ Found premium_features entitlement');
      return true;
    }

    // Check product IDs for premium subscriptions
    const activeSubscriptions = customerInfo.activeSubscriptions;
    const hasPremium = activeSubscriptions.some(sub =>
      sub.toLowerCase().includes('premium')
    );

    if (hasPremium) {
      console.log('  ✅ Found Premium subscription');
      return true;
    }

    console.log('  ❌ No Premium access found');
    return false;
  }

  /**
   * Check if user has Unlimited entitlement
   */
  checkUnlimitedEntitlement(customerInfo: CustomerInfo): boolean {
    console.log('🔍 Checking Unlimited entitlement...');
    console.log('  Active entitlements:', Object.keys(customerInfo.entitlements.active));
    console.log('  Active subscriptions:', customerInfo.activeSubscriptions);

    // Check for unlimited_features entitlement (granted by Unlimited only)
    if (customerInfo.entitlements.active['unlimited_features'] !== undefined) {
      console.log('  ✅ Found unlimited_features entitlement');
      return true;
    }

    // Check product IDs for unlimited subscriptions
    const activeSubscriptions = customerInfo.activeSubscriptions;
    const hasUnlimited = activeSubscriptions.some(sub =>
      sub.toLowerCase().includes('unlimited')
    );

    if (hasUnlimited) {
      console.log('  ✅ Found Unlimited subscription');
      return true;
    }

    console.log('  ❌ No Unlimited access found');
    return false;
  }

  /**
   * Get user's tier based on entitlements
   * Returns: 'free' | 'premium' | 'unlimited'
   */
  getUserTier(customerInfo: CustomerInfo): 'free' | 'premium' | 'unlimited' {
    if (this.checkUnlimitedEntitlement(customerInfo)) {
      return 'unlimited';
    }
    if (this.checkPremiumEntitlement(customerInfo)) {
      return 'premium';
    }
    return 'free';
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use checkPremiumEntitlement() or getUserTier() instead
   */
  checkProEntitlement(customerInfo: CustomerInfo): boolean {
    return this.checkPremiumEntitlement(customerInfo) || this.checkUnlimitedEntitlement(customerInfo);
  }

  /**
   * Sync RevenueCat subscription with SoundBridge backend
   * This ensures subscription status is maintained across app updates
   */
  async syncWithBackend(customerInfo: CustomerInfo): Promise<void> {
    try {
      console.log('🔄 Syncing subscription with SoundBridge backend...');

      // Get active subscription info
      const activeSubscriptions = customerInfo.activeSubscriptions;
      const entitlements = customerInfo.entitlements.active;

      console.log('📤 Active subscriptions:', activeSubscriptions);
      console.log('📤 Active entitlements:', Object.keys(entitlements));

      // Get user's tier
      const tier = this.getUserTier(customerInfo);

      console.log('🎯 Syncing tier to backend:', tier);

      // Get auth token for the API call
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        console.warn('⚠️ No auth session — skipping backend sync');
        return;
      }

      const response = await fetch(`${config.apiUrl}/subscriptions/sync-revenuecat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          activeSubscriptions,
          entitlements: Object.keys(entitlements),
        }),
      });

      if (!response.ok) {
        console.warn('⚠️ Backend sync returned', response.status, '— webhook will handle update');
      } else {
        console.log('✅ Backend sync successful — tier and email triggered');
      }
    } catch (error) {
      console.error('❌ Failed to sync with backend:', error);
      // Don't throw - sync failure shouldn't block the purchase
    }
  }

  /**
   * Login user with RevenueCat (important for cross-device sync)
   */
  async loginUser(userId: string): Promise<void> {
    try {
      console.log('👤 Logging in user:', userId);
      const customerInfo = await Purchases.logIn(userId);
      console.log('✅ User logged in successfully');
      console.log('📊 Customer Info:', customerInfo);
    } catch (error) {
      console.error('❌ Failed to login user:', error);
      throw error;
    }
  }

  /**
   * Logout user from RevenueCat
   */
  async logoutUser(): Promise<void> {
    try {
      console.log('👤 Logging out user...');
      const customerInfo = await Purchases.logOut();
      console.log('✅ User logged out successfully');
      console.log('📊 Customer Info:', customerInfo);
    } catch (error) {
      console.error('❌ Failed to logout user:', error);
      throw error;
    }
  }

  /**
   * Helper: Determine billing cycle from product ID
   */
  private getBillingCycleFromProduct(productId: string): 'monthly' | 'yearly' {
    if (productId.includes('monthly')) {
      return 'monthly';
    } else if (productId.includes('yearly') || productId.includes('annual')) {
      return 'yearly';
    }
    return 'monthly'; // default
  }

  /**
   * Helper: Determine tier from product ID
   */
  private getTierFromProduct(productId: string): 'premium' | 'unlimited' {
    if (productId.includes('unlimited')) {
      return 'unlimited';
    }
    if (productId.includes('premium')) {
      return 'premium';
    }
    // Legacy support for old 'pro' product IDs
    if (productId.includes('pro')) {
      return 'premium';
    }
    return 'premium'; // default
  }

  /**
   * Get package by identifier
   */
  getPackage(packageIdentifier: string): PurchasesPackage | null {
    if (!this.currentOffering) {
      return null;
    }

    return (
      this.currentOffering.availablePackages.find(
        (pkg) => pkg.identifier === packageIdentifier
      ) || null
    );
  }

  /**
   * Check if RevenueCat is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if initialization has been attempted (even if it failed)
   */
  hasAttemptedInitialization(): boolean {
    return this.initializationAttempted;
  }

  /**
   * Reset initialization state (useful for testing or retry scenarios)
   */
  resetInitializationState(): void {
    this.isInitialized = false;
    this.initializationAttempted = false;
    this.initializationFailed = false;
    this.currentOffering = null;
  }
}

export default new RevenueCatService();
