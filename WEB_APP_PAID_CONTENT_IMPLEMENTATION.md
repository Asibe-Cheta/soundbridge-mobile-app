# Web App Implementation Guide: Paid Audio Content Feature

**Status:** 🚨 CRITICAL - MVP Feature
**Priority:** Q1 2026 - MUST BE IMPLEMENTED NOW
**Mobile Implementation:** ✅ Partially Complete (Awaiting Backend + Web UI)
**Backend Requirements:** See `PAID_CONTENT_BACKEND_REQUIREMENTS.md`

---

## 📋 Overview

This feature enables **subscribed creators** to sell their audio content (tracks, albums, podcasts) directly to users. The mobile team has completed their implementation and is waiting for:
1. **Backend API endpoints** (detailed in separate document)
2. **Web app UI** (this document)

### Key Features
- Creators can set prices for their content (£0.99 - £50.00)
- 90/10 revenue split (90% to creator, 10% to platform)
- Users purchase and own content permanently
- Download access with unlimited re-downloads
- Sales analytics dashboard for creators
- Only subscribed creators can sell content

---

## 🎯 Web App Implementation Requirements

The web app needs to implement the **same user-facing features** as mobile, plus creator management tools.

---

## 1️⃣ Creator Side: Content Management

### A. Track Upload/Edit Screen - Add Pricing Section

**Location:** Track upload/edit form

**UI Components:**

```jsx
{/* Pricing Section */}
<div className="pricing-section">
  <h3>Pricing</h3>
  <p className="help-text">
    Only available for subscribed creators (Premium & Pro+ tiers)
  </p>

  {/* Toggle for Paid Content */}
  <div className="form-group">
    <label className="switch">
      <input
        type="checkbox"
        checked={isPaid}
        onChange={(e) => setIsPaid(e.target.checked)}
        disabled={!hasActiveSubscription}
      />
      <span className="slider"></span>
    </label>
    <label>Make this available for purchase</label>
  </div>

  {/* Price Input (shown when isPaid = true) */}
  {isPaid && (
    <>
      <div className="form-group">
        <label>Price</label>
        <div className="price-input">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="USD">$ USD</option>
            <option value="GBP">£ GBP</option>
            <option value="EUR">€ EUR</option>
          </select>
          <input
            type="number"
            min="0.99"
            max="50.00"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value))}
            placeholder="2.99"
          />
        </div>
        <p className="help-text">
          Price must be between {getCurrencySymbol(currency)}0.99 and {getCurrencySymbol(currency)}50.00
        </p>
      </div>

      {/* Earnings Preview */}
      <div className="earnings-preview">
        <div className="info-box">
          <span className="icon">💰</span>
          <div>
            <p className="label">You'll keep 90% of sales</p>
            <p className="amount">You'll earn {formatPrice(price * 0.9, currency)} per sale</p>
            <p className="note">SoundBridge takes 10% platform fee</p>
          </div>
        </div>
      </div>
    </>
  )}

  {/* Non-Subscribed Warning */}
  {!hasActiveSubscription && (
    <div className="alert alert-warning">
      <span className="icon">⚠️</span>
      <p>
        Upgrade to Premium or Pro+ to sell your content.
        <a href="/pricing">View Plans</a>
      </p>
    </div>
  )}
</div>
```

**API Integration:**
```javascript
// On form submit
const handleSubmit = async () => {
  // Save track details first
  const track = await saveTrackDetails();

  // Then update pricing
  if (isPaid) {
    await fetch(`/api/audio-tracks/${track.id}/pricing`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_paid: true,
        price: price,
        currency: currency
      })
    });
  }
};
```

**Validation:**
- Check subscription status before showing pricing toggle
- Enforce price range: 0.99 to 50.00
- Show earnings calculation in real-time
- Disable pricing if subscription expires

---

### B. Sales Analytics Dashboard

**Location:** Creator Dashboard → New "Sales" Tab

**Layout:**

```jsx
<div className="sales-dashboard">
  {/* Summary Cards */}
  <div className="stats-grid">
    <div className="stat-card">
      <div className="icon">💵</div>
      <div className="content">
        <h3>Total Revenue</h3>
        <p className="amount">{formatPrice(analytics.total_revenue, 'USD')}</p>
        <p className="subtitle">All-time earnings</p>
      </div>
    </div>

    <div className="stat-card">
      <div className="icon">📈</div>
      <div className="content">
        <h3>This Month</h3>
        <p className="amount">{formatPrice(analytics.revenue_this_month, 'USD')}</p>
        <p className="subtitle">Revenue in {currentMonth}</p>
      </div>
    </div>

    <div className="stat-card">
      <div className="icon">🛒</div>
      <div className="content">
        <h3>Total Sales</h3>
        <p className="amount">{analytics.total_sales_count}</p>
        <p className="subtitle">Content purchases</p>
      </div>
    </div>
  </div>

  {/* Sales Breakdown */}
  <div className="sales-breakdown">
    <h3>Sales by Content Type</h3>
    <div className="breakdown-grid">
      <div className="breakdown-item">
        <span className="label">Tracks Sold</span>
        <span className="value">{analytics.sales_by_type.tracks}</span>
      </div>
      <div className="breakdown-item">
        <span className="label">Albums Sold</span>
        <span className="value">{analytics.sales_by_type.albums}</span>
      </div>
      <div className="breakdown-item">
        <span className="label">Podcasts Sold</span>
        <span className="value">{analytics.sales_by_type.podcasts}</span>
      </div>
    </div>
  </div>

  {/* Top Selling Content */}
  <div className="top-selling">
    <h3>Top Selling Content</h3>
    <table className="sales-table">
      <thead>
        <tr>
          <th>Content</th>
          <th>Type</th>
          <th>Sales</th>
          <th>Revenue</th>
        </tr>
      </thead>
      <tbody>
        {analytics.top_selling_content.map(item => (
          <tr key={item.content_id}>
            <td>{item.title}</td>
            <td><span className="badge">{item.content_type}</span></td>
            <td>{item.sales_count}</td>
            <td>{formatPrice(item.revenue, 'USD')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* Recent Sales */}
  <div className="recent-sales">
    <h3>Recent Sales</h3>
    <table className="sales-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Buyer</th>
          <th>Content</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {analytics.recent_sales.map(sale => (
          <tr key={sale.purchase_id}>
            <td>{formatDate(sale.purchased_at)}</td>
            <td>@{sale.buyer_username}</td>
            <td>{sale.content_title}</td>
            <td>{formatPrice(sale.price_paid, sale.currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

**API Integration:**
```javascript
useEffect(() => {
  const fetchAnalytics = async () => {
    const response = await fetch('/api/creator/sales-analytics', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    setAnalytics(data.data);
  };

  fetchAnalytics();
}, []);
```

---

## 2️⃣ User Side: Browse & Purchase

### A. Track Display (Track Card/List Item)

**Visual Indicators:**

```jsx
<div className="track-card">
  <img src={track.cover_art_url} alt={track.title} />
  <div className="track-info">
    <h4>{track.title}</h4>
    <p className="creator">{track.creator.display_name}</p>

    {/* Price Badge for Paid Content */}
    {track.is_paid && (
      <div className="price-badge">
        {userOwnsTrack ? (
          <span className="owned-badge">
            <CheckCircleIcon /> Owned
          </span>
        ) : (
          <span className="price">
            {formatPrice(track.price, track.currency)}
          </span>
        )}
      </div>
    )}
  </div>

  {/* Action Button */}
  <div className="track-actions">
    {track.is_paid && !userOwnsTrack ? (
      <button
        className="btn-primary"
        onClick={() => openPurchaseModal(track)}
      >
        <CartIcon /> Buy
      </button>
    ) : (
      <button
        className="btn-secondary"
        onClick={() => playTrack(track)}
      >
        <PlayIcon /> Play
      </button>
    )}
  </div>
</div>
```

---

### B. Purchase Modal

**Design:**

```jsx
<Modal isOpen={showPurchaseModal} onClose={closePurchaseModal}>
  <div className="purchase-modal">
    {/* Header */}
    <div className="modal-header">
      <h2>Purchase Content</h2>
      <button onClick={closePurchaseModal}>×</button>
    </div>

    {/* Content Preview */}
    <div className="content-preview">
      <img src={track.cover_art_url} alt={track.title} className="cover" />
      <div className="details">
        <h3>{track.title}</h3>
        <p className="creator">by {track.creator.display_name}</p>
        <p className="price">{formatPrice(track.price, track.currency)}</p>
      </div>
    </div>

    {/* Info Box */}
    <div className="info-box">
      <InfoIcon />
      <p>You'll be able to download this content after purchase</p>
    </div>

    {/* Payment Method */}
    <div className="payment-section">
      <h4>Payment Method</h4>
      <div className="payment-method">
        <CreditCardIcon />
        <span>Default Payment Method</span>
        <button className="btn-link">Change</button>
      </div>
    </div>

    {/* Actions */}
    <div className="modal-actions">
      <button
        className="btn-secondary"
        onClick={closePurchaseModal}
      >
        Cancel
      </button>
      <button
        className="btn-primary"
        onClick={handlePurchase}
        disabled={isPurchasing}
      >
        {isPurchasing ? (
          <><Spinner /> Processing...</>
        ) : (
          <><CartIcon /> Purchase {formatPrice(track.price, track.currency)}</>
        )}
      </button>
    </div>
  </div>
</Modal>
```

**Purchase Flow:**
```javascript
const handlePurchase = async () => {
  setIsPurchasing(true);

  try {
    const response = await fetch('/api/content/purchase', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content_id: track.id,
        content_type: 'track',
        payment_method_id: selectedPaymentMethod.id
      })
    });

    const data = await response.json();

    if (data.success) {
      // Show success message
      showNotification({
        type: 'success',
        title: 'Purchase Complete!',
        message: `You can now download "${track.title}".`
      });

      // Close modal and refresh
      closePurchaseModal();
      refreshTrackOwnership();
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    showNotification({
      type: 'error',
      title: 'Purchase Failed',
      message: error.message || 'Please try again.'
    });
  } finally {
    setIsPurchasing(false);
  }
};
```

---

### C. Track Details Page - Ownership Check

**Before Playing:**

```javascript
const handlePlayTrack = async () => {
  // Check if track is paid
  if (track.is_paid) {
    // Check ownership
    const ownership = await checkOwnership(track.id, 'track');

    if (!ownership.owns) {
      // User doesn't own the track - show purchase modal
      openPurchaseModal(track);
      return;
    }
  }

  // Track is free or user owns it - play normally
  playTrack(track);
};

const checkOwnership = async (contentId, contentType) => {
  const response = await fetch(
    `/api/content/ownership?content_id=${contentId}&content_type=${contentType}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  const data = await response.json();
  return data.data;
};
```

---

### D. User's Purchased Content Library

**Location:** User Dashboard → New "Purchases" or "Library" Tab

```jsx
<div className="purchased-content">
  <h2>My Purchases</h2>

  {/* Filter Tabs */}
  <div className="filter-tabs">
    <button
      className={contentType === 'all' ? 'active' : ''}
      onClick={() => setContentType('all')}
    >
      All
    </button>
    <button
      className={contentType === 'track' ? 'active' : ''}
      onClick={() => setContentType('track')}
    >
      Tracks
    </button>
    <button
      className={contentType === 'album' ? 'active' : ''}
      onClick={() => setContentType('album')}
    >
      Albums
    </button>
    <button
      className={contentType === 'podcast' ? 'active' : ''}
      onClick={() => setContentType('podcast')}
    >
      Podcasts
    </button>
  </div>

  {/* Purchased Items List */}
  <div className="purchased-list">
    {purchasedContent.map(item => (
      <div key={item.purchase.id} className="purchased-item">
        <img src={item.content.cover_art_url} alt={item.content.title} />
        <div className="item-info">
          <h4>{item.content.title}</h4>
          <p className="creator">by {item.content.creator.display_name}</p>
          <p className="purchase-date">
            Purchased {formatDate(item.purchase.purchased_at)}
          </p>
          <p className="download-count">
            Downloaded {item.purchase.download_count} times
          </p>
        </div>
        <div className="item-actions">
          <button
            className="btn-secondary"
            onClick={() => playContent(item.content)}
          >
            <PlayIcon /> Play
          </button>
          <button
            className="btn-secondary"
            onClick={() => downloadContent(item.content)}
          >
            <DownloadIcon /> Download
          </button>
        </div>
      </div>
    ))}
  </div>

  {/* Empty State */}
  {purchasedContent.length === 0 && (
    <div className="empty-state">
      <ShoppingBagIcon />
      <h3>No purchases yet</h3>
      <p>Browse content from your favorite creators</p>
      <button className="btn-primary" onClick={() => navigate('/discover')}>
        Discover Content
      </button>
    </div>
  )}
</div>
```

**API Integration:**
```javascript
useEffect(() => {
  const fetchPurchasedContent = async () => {
    const response = await fetch('/api/user/purchased-content', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    setPurchasedContent(data.data);
  };

  fetchPurchasedContent();
}, []);

const downloadContent = async (content) => {
  try {
    const response = await fetch(
      `/api/content/${content.id}/download?content_type=track`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    const data = await response.json();

    // Trigger download
    window.location.href = data.data.download_url;
  } catch (error) {
    showNotification({
      type: 'error',
      title: 'Download Failed',
      message: 'Please try again.'
    });
  }
};
```

---

## 3️⃣ Creator Profile Page Updates

### Show Paid Content Prices

```jsx
<div className="creator-tracks">
  {tracks.map(track => (
    <div key={track.id} className="track-item">
      <img src={track.cover_art_url} alt={track.title} />
      <div className="track-info">
        <h4>{track.title}</h4>

        {/* Show price or owned badge */}
        {track.is_paid && (
          <div className="track-pricing">
            {userOwnsTrack(track.id) ? (
              <span className="owned-badge">
                <CheckCircleIcon /> Owned
              </span>
            ) : (
              <span className="price-tag">
                {formatPrice(track.price, track.currency)}
              </span>
            )}
          </div>
        )}

        {/* Sales count (visible to creator only) */}
        {isCreatorProfile && (
          <p className="sales-info">
            {track.total_sales_count} sales · {formatPrice(track.total_revenue, track.currency)} earned
          </p>
        )}
      </div>

      {/* Action Button */}
      {track.is_paid && !userOwnsTrack(track.id) ? (
        <button onClick={() => openPurchaseModal(track)}>
          Buy Now
        </button>
      ) : (
        <button onClick={() => playTrack(track)}>
          Play
        </button>
      )}
    </div>
  ))}
</div>
```

---

## 4️⃣ Subscription Upgrade Prompts

### Non-Subscribed Creator Trying to Enable Paid Content

```jsx
{!hasActiveSubscription && (
  <Modal isOpen={showUpgradeModal}>
    <div className="upgrade-prompt">
      <div className="icon">💎</div>
      <h2>Upgrade to Sell Your Content</h2>
      <p>
        Selling your audio content is exclusive to Premium and Pro+ subscribers.
        Upgrade now to start earning from your music!
      </p>

      <div className="benefits">
        <div className="benefit">
          <CheckIcon />
          <span>Set your own prices</span>
        </div>
        <div className="benefit">
          <CheckIcon />
          <span>Keep 90% of sales revenue</span>
        </div>
        <div className="benefit">
          <CheckIcon />
          <span>Detailed sales analytics</span>
        </div>
        <div className="benefit">
          <CheckIcon />
          <span>Unlimited content uploads</span>
        </div>
      </div>

      <div className="actions">
        <button className="btn-secondary" onClick={closeModal}>
          Maybe Later
        </button>
        <button className="btn-primary" onClick={() => navigate('/pricing')}>
          View Plans
        </button>
      </div>
    </div>
  </Modal>
)}
```

---

## 5️⃣ UI/UX Best Practices

### Price Display
- Always show currency symbol (£, $, €)
- Format with 2 decimal places: `$2.99`
- Use consistent formatting throughout

### Visual Hierarchy
- Paid content should have clear visual distinction
- Price badge should be prominent but not overwhelming
- "Owned" badge should use success color (green)

### Loading States
- Show skeleton loaders while fetching ownership
- Disable purchase button during processing
- Show progress indicator in modal

### Error Handling
- Clear error messages for payment failures
- Suggest alternative payment methods
- Provide support contact for issues

### Responsive Design
- Mobile-first approach
- Purchase modal should work on all screen sizes
- Touch-friendly button sizes

---

## 6️⃣ Testing Checklist

### Creator Flow
- [ ] Free tier creator sees upgrade prompt when trying to enable pricing
- [ ] Subscribed creator can set track as paid
- [ ] Price validation enforces 0.99 - 50.00 range
- [ ] Earnings calculator updates in real-time
- [ ] Sales analytics dashboard loads correctly
- [ ] Top selling content displays accurately

### User Flow
- [ ] Paid tracks show price badge
- [ ] Owned tracks show "Owned" badge
- [ ] Purchase modal opens correctly
- [ ] Payment processing works end-to-end
- [ ] Purchase confirmation displays
- [ ] Purchased content appears in library
- [ ] Download functionality works
- [ ] Can re-download unlimited times

### Edge Cases
- [ ] Duplicate purchase prevented
- [ ] Expired subscription blocks new pricing
- [ ] Existing paid content remains accessible
- [ ] Invalid payment method handled gracefully
- [ ] Network errors handled with retry options

---

## 7️⃣ Styling Guidelines

### Color Scheme
```css
/* Price Elements */
.price {
  color: var(--primary-color);
  font-weight: 700;
}

/* Owned Badge */
.owned-badge {
  background-color: rgba(16, 185, 129, 0.1);
  border: 1px solid #10B981;
  color: #10B981;
  padding: 4px 12px;
  border-radius: 8px;
  font-weight: 600;
}

/* Purchase Button */
.btn-purchase {
  background-color: var(--primary-color);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Sales Dashboard */
.stat-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-card .amount {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary-color);
}
```

---

## 8️⃣ API Endpoint Summary

All endpoints are documented in detail in `PAID_CONTENT_BACKEND_REQUIREMENTS.md`. Quick reference:

1. `GET /api/content/ownership` - Check if user owns content
2. `POST /api/content/purchase` - Purchase content
3. `GET /api/user/purchased-content` - Get user's library
4. `GET /api/content/:id/download` - Download content
5. `PUT /api/audio-tracks/:id/pricing` - Set track price
6. `PUT /api/albums/:id/pricing` - Set album price
7. `PUT /api/podcasts/:id/pricing` - Set podcast price
8. `GET /api/creator/sales-analytics` - Get sales data

---

## 9️⃣ Email Templates

### Purchase Confirmation (Buyer)
**Subject:** "Your SoundBridge Purchase: [Track Title]"

```html
<div class="email-container">
  <h1>Purchase Confirmed!</h1>
  <p>Thank you for your purchase on SoundBridge.</p>

  <div class="purchase-details">
    <img src="[cover_art_url]" alt="Cover" />
    <h2>[Track Title]</h2>
    <p>by [Creator Name]</p>
    <p class="price">$2.99</p>
  </div>

  <p>You can now download and listen to this content anytime.</p>

  <a href="[library_url]" class="btn">View in Library</a>

  <div class="receipt">
    <p>Transaction ID: [transaction_id]</p>
    <p>Date: [purchase_date]</p>
    <a href="[receipt_url]">Download Receipt</a>
  </div>
</div>
```

### New Sale Notification (Creator)
**Subject:** "🎉 New Sale: [Track Title]"

```html
<div class="email-container">
  <h1>You Made a Sale!</h1>
  <p>Great news! Someone just purchased your content.</p>

  <div class="sale-details">
    <h2>[Track Title]</h2>
    <p>Buyer: @[buyer_username]</p>
    <p class="earnings">You earned: $2.69</p>
    <p class="note">(90% of $2.99 sale price)</p>
  </div>

  <p>The earnings have been added to your digital wallet.</p>

  <a href="[analytics_url]" class="btn">View Sales Dashboard</a>
</div>
```

---

## 🔟 Migration Strategy

### Phase 1: Backend (Week 1)
- Implement all 8 API endpoints
- Run database migrations
- Set up payment processing
- Deploy to production

### Phase 2: Web App UI (Week 2)
- Implement creator pricing controls
- Build purchase modal
- Create sales dashboard
- Add purchased content library

### Phase 3: Testing (Week 3)
- End-to-end testing
- Payment flow testing
- Error scenario testing
- Mobile + Web sync testing

### Phase 4: Launch (Week 4)
- Soft launch to beta users
- Monitor sales transactions
- Gather feedback
- Full public launch

---

## 📞 Support & Questions

**Mobile Team Contact:** Justice Chetachukwu Asibe
**Backend Requirements:** See `PAID_CONTENT_BACKEND_REQUIREMENTS.md`
**Design Assets:** [Link to Figma/Design files]
**Project Management:** [Link to project board]

---

## ✅ Definition of Done

Web app implementation is complete when:

- [ ] Creator can enable paid pricing on tracks
- [ ] Creator sees sales analytics dashboard
- [ ] Users can purchase paid content
- [ ] Users can access purchased content library
- [ ] Users can download purchased content
- [ ] All UI matches mobile app experience
- [ ] Responsive design works on all devices
- [ ] Error handling covers all edge cases
- [ ] Email notifications working
- [ ] End-to-end payment flow tested
- [ ] Deployed to production
- [ ] Documentation complete
- [ ] Mobile team notified implementation is ready

---

**Status:** ⏳ Awaiting Web Team Implementation
**Last Updated:** January 14, 2026
**Priority:** CRITICAL - MVP Feature - Q1 2026

---

## 📚 Additional Resources

- Stripe Payment Integration Guide
- SoundBridge Design System
- Audio Player API Documentation
- Wallet Service Integration Guide
- Mobile App Implementation Reference

**Questions?** Contact the mobile team or refer to the backend requirements document for API specifications.
