import { Platform, Alert } from 'react-native';
import { config } from '../config/environment';

// Graceful import for expo-iap that handles development environments
let ExpoIAP: any = null;
let isExpoIAPAvailable = false;

try {
  ExpoIAP = require('expo-iap');
  isExpoIAPAvailable = true;
  console.log('✅ expo-iap loaded successfully');
} catch (error) {
  console.warn('⚠️ expo-iap not available in development environment:', error);
  isExpoIAPAvailable = false;
}

export interface SoundBridgeProduct {
  id: string;
  platform: 'apple' | 'google';
  productId: string;
  tier: 'pro';
  billingCycle: 'monthly' | 'yearly';
  priceUsd: number;
  currency: string;
  displayName: string;
  description: string;
}

export interface PurchaseResult {
  success: boolean;
  subscription?: any;
  profile?: any;
  error?: string;
}

class InAppPurchaseService {
  private isInitialized = false;
  private products: any[] = [];
  private soundBridgeProducts: SoundBridgeProduct[] = [];

  // Product IDs matching App Store Connect and Google Play Console
  private readonly productIds = Platform.select({
    ios: [
      'com.soundbridge.premium.monthly',
      'com.soundbridge.premium.yearly',
      'com.soundbridge.unlimited.monthly',
      'com.soundbridge.unlimited.yearly',
    ],
    android: [
      'soundbridge_premium:premium-monthly',
      'soundbridge_premium:premium-yearly',
      'soundbridge_unlimited:unlimited-monthly',
      'soundbridge_unlimited:unlimited-yearly',
    ],
  }) || [];

  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing Expo IAP Service...');
      
      if (!isExpoIAPAvailable) {
        console.warn('⚠️ expo-iap not available - running in development fallback mode');
        // Load SoundBridge product configurations only
        await this.loadSoundBridgeProducts();
        this.isInitialized = true;
        return true;
      }
      
      // Initialize connection to app store
      await ExpoIAP.initializeAsync();
      console.log('✅ Expo IAP Connection initialized');

      // Load products from app store
      await this.loadProducts();

      // Load SoundBridge product configurations
      await this.loadSoundBridgeProducts();

      this.isInitialized = true;
      console.log('✅ Expo IAP Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Expo IAP service:', error);
      // Fallback to development mode
      console.warn('🔄 Falling back to development mode without native IAP');
      await this.loadSoundBridgeProducts();
      this.isInitialized = true;
      return true;
    }
  }

  private async loadProducts(): Promise<void> {
    try {
      if (!isExpoIAPAvailable) {
        console.warn('⚠️ Skipping app store products - expo-iap not available');
        return;
      }

      console.log('📦 Loading products from app store...');
      console.log('🔍 Product IDs:', this.productIds);

      // Get products from app store
      this.products = await ExpoIAP.getProductsAsync(this.productIds);

      console.log('✅ Loaded products from app store:', this.products.length);
      this.products.forEach(product => {
        console.log(`📦 ${product.productId}: ${product.price} ${product.currencyCode}`);
      });
    } catch (error) {
      console.error('❌ Failed to load products from app store:', error);
      // Don't throw - we can still work with SoundBridge products
    }
  }

  private async loadSoundBridgeProducts(): Promise<void> {
    try {
      console.log('🌐 Loading SoundBridge product configurations...');
      
      const platform = Platform.OS === 'ios' ? 'apple' : 'google';
      const response = await fetch(`${config.apiUrl}/subscriptions/products?platform=${platform}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 SoundBridge products response:', data);

      if (data.success && data.productList) {
        this.soundBridgeProducts = data.productList;
        console.log('✅ Loaded SoundBridge products:', this.soundBridgeProducts.length);
      } else {
        throw new Error(data.error || 'Failed to load product configurations');
      }
    } catch (error) {
      console.error('❌ Failed to load SoundBridge products:', error);
      // Don't throw - we can still work with app store products
    }
  }

  async getAvailableProducts(): Promise<{ appStoreProducts: any[], soundBridgeProducts: SoundBridgeProduct[] }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return {
      appStoreProducts: this.products,
      soundBridgeProducts: this.soundBridgeProducts,
    };
  }

  async purchaseProduct(productId: string, userToken: string): Promise<PurchaseResult> {
    try {
      console.log('💳 Starting purchase for product:', productId);
      console.log('🔐 User token length:', userToken.length);

      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isExpoIAPAvailable) {
        console.warn('🧪 Development mode: Real payments require App Store build');
        
        // In development, show a message about needing real app store setup
        throw new Error('Real payments require App Store/Google Play configuration. This is development simulation only.');
      }

      // Find the product
      const product = this.products.find(p => p.productId === productId);
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      console.log('📦 Found product:', product);

      // Request purchase from app store
      console.log('🛒 Requesting purchase from app store...');
      const purchase = await ExpoIAP.purchaseItemAsync(productId);
      console.log('✅ Purchase completed:', purchase);

      // Verify purchase with SoundBridge API
      console.log('🔍 Verifying purchase with SoundBridge API...');
      const verificationResult = await this.verifyPurchase(purchase, userToken);
      
      if (verificationResult.success) {
        console.log('✅ Purchase verified and subscription activated!');
        
        // Poll subscription status to confirm activation
        console.log('🔄 Polling subscription status to confirm activation...');
        const activationConfirmed = await this.pollSubscriptionStatus(userToken);
        
        if (activationConfirmed) {
          console.log('✅ Subscription activation confirmed!');
        } else {
          console.warn('⚠️ Subscription activation not confirmed after polling timeout');
          // Still return success, but log warning
        }
        
        // Finish the transaction
        await ExpoIAP.finishTransactionAsync(purchase, false);
        console.log('✅ Transaction finished');

        return verificationResult;
      } else {
        throw new Error(verificationResult.error || 'Purchase verification failed');
      }
    } catch (error) {
      console.error('❌ Purchase failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed',
      };
    }
  }

  private async verifyPurchase(purchase: any, userToken: string): Promise<PurchaseResult> {
    try {
      const platform = Platform.OS === 'ios' ? 'apple' : 'google';
      
      const requestBody = Platform.select({
        ios: {
          platform: 'apple',
          receiptData: purchase.transactionReceipt,
          productId: purchase.productId,
          transactionId: purchase.transactionId,
        },
        android: {
          platform: 'google',
          packageName: 'com.soundbridge.mobile',
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          transactionId: purchase.transactionId,
        },
      });

      console.log('📤 Sending verification request:', requestBody);

      const response = await fetch(`${config.apiUrl}/subscriptions/verify-iap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
          'X-Auth-Token': `Bearer ${userToken}`,
          'X-Authorization': `Bearer ${userToken}`,
          'X-Supabase-Token': userToken,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Verification response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Verification failed:', errorText);
        throw new Error(`Verification failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Verification result:', result);

      return result;
    } catch (error) {
      console.error('❌ Purchase verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Poll subscription status after IAP purchase to confirm activation
   * Polls every 2 seconds, max 15 attempts (30 seconds total)
   */
  private async pollSubscriptionStatus(userToken: string, maxAttempts = 15): Promise<boolean> {
    console.log('🔄 Starting subscription status polling...');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Wait 2 seconds before first check (give backend time to process)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        const response = await fetch(`${config.apiUrl}/subscription/status`, {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Defensive: Use optional chaining - subscription might be null for free users
          const tier = data?.data?.subscription?.tier;
          const status = data?.data?.subscription?.status;

          if ((tier === 'premium' || tier === 'unlimited') && status === 'active') {
            console.log(`✅ Subscription confirmed as ${tier} (attempt ${i + 1}/${maxAttempts})`);
            return true; // Success!
          }

          console.log(`⏳ Subscription not yet active (attempt ${i + 1}/${maxAttempts}), tier: ${tier}, status: ${status}`);
        } else {
          console.warn(`⚠️ Polling attempt ${i + 1} failed with status: ${response.status}`);
        }
      } catch (error) {
        console.warn(`⚠️ Polling attempt ${i + 1} error:`, error);
      }
    }
    
    console.warn('⚠️ Subscription activation polling timeout after 30 seconds');
    return false; // Timeout
  }

  async restorePurchases(): Promise<any[]> {
    try {
      if (!isExpoIAPAvailable) {
        console.warn('🧪 Development mode: Cannot restore purchases without native IAP');
        return [];
      }

      console.log('🔄 Restoring purchases...');
      const purchases = await ExpoIAP.getPurchaseHistoryAsync();
      console.log('✅ Restored purchases:', purchases.length);
      return purchases;
    } catch (error) {
      console.error('❌ Failed to restore purchases:', error);
      return [];
    }
  }

  async finalize(): Promise<void> {
    try {
      console.log('🔚 Finalizing Expo IAP service...');
      // Expo IAP doesn't require explicit finalization
      this.isInitialized = false;
      console.log('✅ Expo IAP service finalized');
    } catch (error) {
      console.error('❌ Failed to finalize Expo IAP service:', error);
    }
  }
}

export default new InAppPurchaseService();
