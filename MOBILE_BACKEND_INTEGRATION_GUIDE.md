# Mobile App Integration Guide - Paid Content Backend

**Date:** January 14, 2026
**Status:** 🟢 **BACKEND READY** - Integration Testing Can Begin
**Backend Team Response:** All 4 endpoints implemented and live!

---

## 🎉 Great News!

The web team has confirmed that **all 4 critical backend endpoints are now live and ready**:

✅ POST /api/payments/create-intent
✅ POST /api/payments/webhook
✅ POST /api/stripe/onboard
✅ POST /api/payouts/create

Plus 3 alias endpoints for mobile compatibility:
✅ GET /api/purchases/check-ownership
✅ GET /api/purchases/user
✅ GET /api/sales/analytics

---

## 📋 Integration Checklist

### Phase 1: Environment Setup

- [ ] Verify `API_BASE_URL` is set to `https://www.soundbridge.live/api`
- [ ] Verify `STRIPE_PUBLISHABLE_KEY` is set in .env
- [ ] Test authentication with backend endpoints

### Phase 2: Purchase Flow Integration

- [ ] Create PurchaseModal component (if not exists)
- [ ] Test payment intent creation
- [ ] Test Stripe SDK payment confirmation
- [ ] Test ownership check after purchase
- [ ] Test playback of purchased content

### Phase 3: Sales Analytics

- [ ] Verify CreatorSalesAnalyticsScreen loads data
- [ ] Test revenue metrics display
- [ ] Test sales breakdown by content type
- [ ] Test top selling content ranking

### Phase 4: Purchased Content Library

- [ ] Verify PurchasedContentScreen loads purchases
- [ ] Test filtering (All/Tracks/Albums/Podcasts)
- [ ] Test playback from purchased library
- [ ] Test download functionality

### Phase 5: Payout Flow

- [ ] Implement Stripe Connect onboarding UI
- [ ] Test onboarding flow
- [ ] Implement payout request UI in WalletScreen
- [ ] Test payout creation
- [ ] Test minimum balance validation

---

## 🔌 API Integration Details

### Base URL

```typescript
const API_BASE_URL = 'https://www.soundbridge.live/api';
```

### Authentication

The backend supports multiple authentication methods for mobile:

```typescript
// Option 1: Bearer token (recommended)
headers: {
  'Authorization': `Bearer ${session.access_token}`,
  'Content-Type': 'application/json',
}

// Option 2: Alternative headers (mobile-friendly)
headers: {
  'x-authorization': `Bearer ${session.access_token}`,
  'Content-Type': 'application/json',
}

// Option 3: Supabase token
headers: {
  'x-supabase-token': session.access_token,
  'Content-Type': 'application/json',
}
```

---

## 📝 Implementation Steps

### Step 1: Create PurchaseModal Component

**File:** `src/components/PurchaseModal.tsx`

Create this component if it doesn't exist yet:

```typescript
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../lib/supabase';

interface PurchaseModalProps {
  track: {
    id: string;
    title: string;
    price: number;
    currency: string;
    creator?: { display_name: string };
    cover_image_url?: string;
  };
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PurchaseModal({ track, visible, onClose, onSuccess }: PurchaseModalProps) {
  const { confirmPayment } = useStripe();
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    try {
      setLoading(true);

      // 1. Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Please log in to purchase content');
        return;
      }

      // 2. Create payment intent
      const response = await fetch('https://www.soundbridge.live/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_id: track.id,
          content_type: 'track',
          price: track.price,
          currency: track.currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      // 3. Confirm payment with Stripe SDK
      const { error } = await confirmPayment(data.client_secret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        Alert.alert('Payment Failed', error.message);
        return;
      }

      // 4. Success!
      Alert.alert(
        'Purchase Complete!',
        `You now own "${track.title}". You can play it anytime!`,
        [{ text: 'OK', onPress: () => {
          onSuccess();
          onClose();
        }}]
      );

    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const currencySymbol = track.currency === 'GBP' ? '£' : track.currency === 'USD' ? '$' : '€';

  return (
    <View style={styles.container}>
      <View style={styles.modal}>
        <Text style={styles.title}>Purchase Content</Text>

        <View style={styles.content}>
          <Text style={styles.trackTitle}>{track.title}</Text>
          <Text style={styles.artist}>by {track.creator?.display_name}</Text>
          <Text style={styles.price}>
            {currencySymbol}{track.price.toFixed(2)}
          </Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.purchaseButton]}
            onPress={handlePurchase}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.purchaseText}>Purchase</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  trackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  artist: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#2A2A2A',
  },
  purchaseButton: {
    backgroundColor: '#10B981',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  purchaseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

### Step 2: Add Purchase Button to TrackDetailsScreen

**File:** `src/screens/TrackDetailsScreen.tsx` (or wherever track details are shown)

```typescript
import PurchaseModal from '../components/PurchaseModal';

// In your component:
const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);

// Add purchase button:
{track.is_paid && (
  <TouchableOpacity
    style={styles.purchaseButton}
    onPress={() => setPurchaseModalVisible(true)}
  >
    <Ionicons name="cart" size={20} color="#FFFFFF" />
    <Text style={styles.purchaseButtonText}>
      Purchase for {currencySymbol}{track.price?.toFixed(2)}
    </Text>
  </TouchableOpacity>
)}

{/* Add modal */}
<PurchaseModal
  track={track}
  visible={purchaseModalVisible}
  onClose={() => setPurchaseModalVisible(false)}
  onSuccess={() => {
    // Refresh track details or reload ownership
    console.log('Purchase successful!');
  }}
/>
```

---

### Step 3: Update ContentPurchaseService

**File:** `src/services/ContentPurchaseService.ts`

Ensure the service uses the correct API endpoints:

```typescript
class ContentPurchaseService {
  private baseURL = 'https://www.soundbridge.live/api';

  async checkOwnership(
    session: any,
    contentId: string,
    contentType: 'track' | 'album' | 'podcast'
  ): Promise<{ owns: boolean }> {
    try {
      const response = await fetch(
        `${this.baseURL}/purchases/check-ownership?content_id=${contentId}&content_type=${contentType}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      return { owns: data.owns || false };
    } catch (error) {
      console.error('Error checking ownership:', error);
      return { owns: false };
    }
  }

  async getPurchasedContent(session: any): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseURL}/purchases/user`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      return data.purchases || [];
    } catch (error) {
      console.error('Error fetching purchased content:', error);
      return [];
    }
  }

  async getSalesAnalytics(session: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/sales/analytics`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
      return null;
    }
  }
}

export const contentPurchaseService = new ContentPurchaseService();
```

---

### Step 4: Test Payment Flow

**Test Cards (Stripe Test Mode):**

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Card declined |
| 4000 0025 0000 3155 | 3D Secure required |

**Test Flow:**

1. Find a paid track (is_paid = true)
2. Tap "Purchase" button
3. PurchaseModal opens
4. Tap "Purchase"
5. Stripe payment sheet appears
6. Enter test card: 4242 4242 4242 4242
7. Expiry: Any future date (e.g., 12/26)
8. CVC: Any 3 digits (e.g., 123)
9. Confirm payment
10. Alert shows "Purchase Complete!"
11. Try to play the track - should work now!

---

## 🧪 Testing Checklist

### Basic Integration Tests

- [ ] **Payment Intent Creation**
  - Test with valid track
  - Test with invalid track ID
  - Test with already purchased track
  - Test with free track (should fail)

- [ ] **Payment Confirmation**
  - Test successful payment (4242 4242 4242 4242)
  - Test declined card (4000 0000 0000 0002)
  - Test 3D Secure (4000 0025 0000 3155)

- [ ] **Ownership Verification**
  - Check ownership before purchase (should be false)
  - Check ownership after purchase (should be true)
  - Test playback after purchase (should work)

- [ ] **Sales Analytics**
  - View as creator with sales (should show data)
  - View as creator without sales (should show empty state)
  - Verify revenue calculations (90/10 split)

- [ ] **Purchased Content Library**
  - View purchased content list
  - Filter by type (All/Tracks/Albums)
  - Play purchased track from library
  - Test empty state (no purchases)

---

## 🔍 Debugging Tips

### Issue: Payment Intent Creation Fails

**Check:**
1. Is session.access_token valid?
2. Is track.price sent correctly?
3. Check network tab for response error message
4. Verify track exists and is marked as paid in database

**Solution:**
```typescript
console.log('Creating payment intent:', {
  content_id: track.id,
  content_type: 'track',
  price: track.price,
  currency: track.currency,
});

const response = await fetch(...);
console.log('Response status:', response.status);
const data = await response.json();
console.log('Response data:', data);
```

---

### Issue: Stripe Payment Sheet Not Appearing

**Check:**
1. Is Stripe SDK initialized? (StripeProvider in App.tsx)
2. Is STRIPE_PUBLISHABLE_KEY set correctly?
3. Is client_secret received from backend?

**Solution:**
```typescript
console.log('Client secret received:', data.client_secret);
console.log('Confirming payment with Stripe SDK...');
const { error } = await confirmPayment(data.client_secret, {
  paymentMethodType: 'Card',
});
console.log('Payment result:', { error });
```

---

### Issue: Ownership Check Still Returns False After Purchase

**Check:**
1. Wait a few seconds for webhook to process
2. Check Stripe Dashboard for webhook status
3. Verify webhook endpoint is configured correctly
4. Check database for purchase record

**Solution:**
Add a small delay after payment before checking ownership:
```typescript
// After successful payment
await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
const ownership = await contentPurchaseService.checkOwnership(...);
```

---

## 📊 Success Metrics

Track these metrics during integration testing:

1. **Payment Success Rate:** Successful payments / Total attempts
2. **Average Purchase Time:** Time from "Purchase" button to success
3. **Ownership Check Accuracy:** Correct ownership / Total checks
4. **Analytics Load Time:** Time to load sales analytics screen
5. **Purchase Library Load Time:** Time to load purchased content

**Target Metrics:**
- Payment success rate: > 95%
- Average purchase time: < 30 seconds
- Ownership accuracy: 100%
- Analytics load: < 2 seconds
- Library load: < 2 seconds

---

## 🚀 Launch Readiness

### Before Production Launch:

- [ ] All test cases passing
- [ ] Payment flow tested with real cards
- [ ] Error handling verified
- [ ] Loading states implemented
- [ ] Analytics tracking implemented
- [ ] App store screenshots updated
- [ ] Support documentation created
- [ ] Beta testing complete
- [ ] Performance benchmarks met

---

## 📞 Support

**Backend Team:** Web Development Team
**Mobile Team:** [Your Team]
**Support Channel:** #paid-content-feature

**Backend Documentation:**
- [WEB_TEAM_PAID_CONTENT_BACKEND_REQUIREMENTS.md](WEB_TEAM_PAID_CONTENT_BACKEND_REQUIREMENTS.md)
- [PAYMENT_INTEGRATION_STRIPE_WISE.md](PAYMENT_INTEGRATION_STRIPE_WISE.md)

**Mobile Documentation:**
- [PAID_CONTENT_MOBILE_IMPLEMENTATION_COMPLETE.md](PAID_CONTENT_MOBILE_IMPLEMENTATION_COMPLETE.md)

---

## 🎯 Next Steps

1. **Create PurchaseModal component** (see Step 1 above)
2. **Add purchase buttons** to TrackDetailsScreen and other relevant screens
3. **Test payment flow** with Stripe test cards
4. **Test ownership checks** before and after purchase
5. **Test sales analytics** and purchased content screens
6. **Prepare for production launch**

---

**Status:** 🟢 **READY TO INTEGRATE**
**Last Updated:** January 14, 2026

---

**🎉 All backend endpoints are live! Let's get this feature shipped! 🚀**
