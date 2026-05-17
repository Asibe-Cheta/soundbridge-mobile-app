# Backend API Requirements for Paid Audio Content Feature

**Status:** 🚨 CRITICAL - MVP Feature
**Priority:** Q1 2026 - MUST BE IMPLEMENTED NOW
**Mobile Implementation:** ✅ Partially Complete (Awaiting Backend)

---

## 📱 Mobile Team Status

The mobile team has completed:
- ✅ Type definitions for paid content
- ✅ Purchase modal UI component
- ✅ Track details screen with pricing/purchase buttons
- ✅ Ownership checking logic
- ✅ Content purchase service with API integration
- ⏳ Pending: AudioPlayerContext ownership enforcement
- ⏳ Pending: Purchased content library screen
- ⏳ Pending: Creator pricing controls
- ⏳ Pending: Sales analytics dashboard

**Mobile is ready and waiting for backend implementation.**

---

## 🗄️ Required Database Schema Changes

### 1. Add Fields to `audio_tracks` Table

```sql
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS total_sales_count INTEGER DEFAULT 0;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10, 2) DEFAULT 0.00;
```

**Constraints:**
- `price` must be between 0.99 and 50.00 when `is_paid = true`
- `currency` should be one of: 'USD', 'GBP', 'EUR'
- Only subscribed creators can set `is_paid = true`

### 2. Create `content_purchases` Table

```sql
CREATE TABLE content_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'album', 'podcast')),
  price_paid DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,      -- 10% of price_paid
  creator_earnings DECIMAL(10, 2) NOT NULL,   -- 90% of price_paid
  transaction_id VARCHAR(255) NOT NULL,       -- Stripe transaction ID
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  download_count INTEGER DEFAULT 0,

  CONSTRAINT unique_user_content UNIQUE (user_id, content_id, content_type)
);

CREATE INDEX idx_content_purchases_user ON content_purchases(user_id);
CREATE INDEX idx_content_purchases_content ON content_purchases(content_id, content_type);
CREATE INDEX idx_content_purchases_status ON content_purchases(status);
```

### 3. Row Level Security (RLS) Policies

**For `audio_tracks` pricing fields:**
```sql
-- Public can view pricing info
CREATE POLICY "Anyone can view track pricing"
  ON audio_tracks FOR SELECT
  USING (true);

-- Only creator can update pricing
CREATE POLICY "Creators can update own track pricing"
  ON audio_tracks FOR UPDATE
  USING (auth.uid() = creator_id);
```

**For `content_purchases` table:**
```sql
-- Enable RLS
ALTER TABLE content_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
  ON content_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Insert is handled by backend with proper authorization
CREATE POLICY "Backend can insert purchases"
  ON content_purchases FOR INSERT
  WITH CHECK (true);  -- Backend will validate

-- Creators can view purchases of their content
CREATE POLICY "Creators can view content purchases"
  ON content_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM audio_tracks
      WHERE audio_tracks.id = content_purchases.content_id
      AND audio_tracks.creator_id = auth.uid()
    )
  );
```

---

## 🔌 Required API Endpoints

All endpoints should be at `https://www.soundbridge.live/api/`

### 1. **Check Content Ownership**

**Endpoint:** `GET /api/content/ownership`

**Query Parameters:**
- `content_id` (required): UUID of the content
- `content_type` (required): 'track' | 'album' | 'podcast'

**Headers:**
- `Authorization: Bearer <access_token>` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "owns": true,
    "is_creator": false,
    "purchase": {
      "id": "uuid",
      "purchased_at": "2026-01-14T10:00:00Z",
      "price_paid": 2.99,
      "currency": "USD"
    }
  }
}
```

**Logic:**
- Return `owns: true` if user is the creator
- Return `owns: true` if user has a `content_purchases` record
- Return `owns: false` otherwise

---

### 2. **Purchase Content**

**Endpoint:** `POST /api/content/purchase`

**Headers:**
- `Authorization: Bearer <access_token>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "content_id": "uuid",
  "content_type": "track",
  "payment_method_id": "pm_xxxxx"  // Stripe payment method ID
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "purchase": {
      "id": "uuid",
      "user_id": "uuid",
      "content_id": "uuid",
      "content_type": "track",
      "price_paid": 2.99,
      "currency": "USD",
      "platform_fee": 0.30,
      "creator_earnings": 2.69,
      "transaction_id": "pi_xxxxx",
      "status": "completed",
      "purchased_at": "2026-01-14T10:00:00Z",
      "download_count": 0
    }
  },
  "message": "Purchase successful"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "You already own this content"
}
```

**Validation Required:**
- User must be authenticated
- Content must exist and have `is_paid = true`
- User must not already own the content
- Process payment through Stripe
- Calculate fees: `platform_fee = price * 0.10`, `creator_earnings = price * 0.90`
- Transfer earnings to creator's digital wallet
- Create `content_purchases` record
- Increment `total_sales_count` and `total_revenue` on content

**Error Cases:**
- 401: Not authenticated
- 400: Already purchased
- 400: Content is free
- 400: Payment failed
- 404: Content not found

---

### 3. **Get User's Purchased Content**

**Endpoint:** `GET /api/user/purchased-content`

**Headers:**
- `Authorization: Bearer <access_token>` (required)

**Query Parameters (Optional):**
- `content_type`: Filter by 'track' | 'album' | 'podcast'
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "purchase": {
        "id": "uuid",
        "content_id": "uuid",
        "content_type": "track",
        "price_paid": 2.99,
        "currency": "USD",
        "purchased_at": "2026-01-14T10:00:00Z",
        "download_count": 3
      },
      "content": {
        "id": "uuid",
        "title": "Amazing Track",
        "creator_id": "uuid",
        "cover_art_url": "https://...",
        "duration": 180,
        "file_url": "https://...",
        "creator": {
          "id": "uuid",
          "username": "artist",
          "display_name": "The Artist",
          "avatar_url": "https://..."
        }
      }
    }
  ]
}
```

---

### 4. **Download Purchased Content**

**Endpoint:** `GET /api/content/:contentId/download`

**Query Parameters:**
- `content_type` (required): 'track' | 'album' | 'podcast'

**Headers:**
- `Authorization: Bearer <access_token>` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "download_url": "https://cdn.soundbridge.live/signed-url-here",
    "expires_at": "2026-01-14T11:00:00Z"
  }
}
```

**Logic:**
- Verify user owns content (is creator OR has purchase record)
- Generate signed URL with 1-hour expiration
- Increment `download_count` in `content_purchases`
- Return 403 if user doesn't own content

---

### 5. **Set Track Pricing** (Creator Only)

**Endpoint:** `PUT /api/audio-tracks/:trackId/pricing`

**Headers:**
- `Authorization: Bearer <access_token>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "is_paid": true,
  "price": 2.99,
  "currency": "USD"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Track pricing updated successfully"
}
```

**Validation Required:**
- User must be authenticated
- User must be the track creator
- User must have active subscription (premium or unlimited tier)
- Price must be between 0.99 and 50.00
- If `is_paid = false`, clear `price` and `currency`

**Error Cases:**
- 401: Not authenticated
- 403: Not the creator
- 403: No active subscription
- 400: Invalid price range
- 404: Track not found

---

### 6. **Set Album Pricing** (Creator Only)

**Endpoint:** `PUT /api/albums/:albumId/pricing`

**Same structure as track pricing above**

---

### 7. **Set Podcast Pricing** (Creator Only)

**Endpoint:** `PUT /api/podcasts/:podcastId/pricing`

**Same structure as track pricing above**

---

### 8. **Get Creator Sales Analytics**

**Endpoint:** `GET /api/creator/sales-analytics`

**Headers:**
- `Authorization: Bearer <access_token>` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_revenue": 1234.56,
    "revenue_this_month": 234.56,
    "total_sales_count": 150,
    "sales_by_type": {
      "tracks": 120,
      "albums": 25,
      "podcasts": 5
    },
    "top_selling_content": [
      {
        "content_id": "uuid",
        "content_type": "track",
        "title": "Hit Song",
        "sales_count": 45,
        "revenue": 134.55
      }
    ],
    "recent_sales": [
      {
        "purchase_id": "uuid",
        "buyer_username": "user123",
        "content_title": "Amazing Track",
        "price_paid": 2.99,
        "currency": "USD",
        "purchased_at": "2026-01-14T10:00:00Z"
      }
    ]
  }
}
```

**Logic:**
- Aggregate all purchases where the content belongs to this creator
- Calculate totals, monthly revenue, sales counts
- Sort top selling by revenue
- Recent sales limited to last 50

---

## 💳 Payment Processing Requirements

### Integration with Stripe

1. **Payment Intent Creation:**
   - Create Stripe Payment Intent for the purchase amount
   - Metadata should include: `content_id`, `content_type`, `creator_id`, `buyer_id`

2. **Payment Confirmation:**
   - Confirm payment with Stripe
   - On success:
     - Create `content_purchases` record
     - Transfer 90% to creator's wallet
     - Transfer 10% to platform account
     - Increment content sales metrics

3. **Wallet Transfer:**
   - Use existing wallet service to credit creator
   - Transaction type: `'content_sale'`
   - Include metadata: content title, buyer username

4. **Error Handling:**
   - If payment fails, do NOT create purchase record
   - Log failure for admin review
   - Return user-friendly error message

---

## 🔐 Security Requirements

### 1. Subscription Verification
```sql
-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND subscription_tier IN ('premium', 'unlimited')
    AND (subscription_end_date IS NULL OR subscription_end_date > NOW())
  );
END;
$$ LANGUAGE plpgsql;
```

### 2. Prevent Duplicate Purchases
- Use UNIQUE constraint on `(user_id, content_id, content_type)`
- Check before processing payment
- Return friendly error if duplicate

### 3. Ownership Verification
- Before allowing download, verify:
  - User is creator (creator_id = user_id) OR
  - User has purchase record (content_purchases exists)
- Return 403 Forbidden if neither condition met

### 4. Price Range Enforcement
- Minimum: $0.99 / £0.99 / €0.99
- Maximum: $50.00 / £50.00 / €50.00
- Enforce at API level, not just frontend

---

## 📧 Email/Notification Requirements

### For Buyers (Purchase Confirmation):
**Subject:** "Your SoundBridge Purchase: [Content Title]"

**Content:**
- Content title and creator name
- Price paid and currency
- Transaction ID
- Receipt download link
- Link to purchased content

### For Creators (New Sale):
**Subject:** "🎉 New Sale: [Content Title]"

**Content:**
- Content title
- Buyer username (or "Anonymous User" if applicable)
- Amount earned (90% of price)
- Link to sales analytics dashboard

---

## 🧪 Testing Checklist

Before notifying mobile team that backend is ready:

- [ ] All 8 API endpoints implemented and tested
- [ ] Database migrations run successfully
- [ ] RLS policies applied and tested
- [ ] Stripe payment processing integrated
- [ ] Wallet transfer logic working
- [ ] Email notifications sending correctly
- [ ] Subscription verification enforced
- [ ] Duplicate purchase prevention working
- [ ] Price range validation enforced
- [ ] Ownership checks functioning
- [ ] Download URL generation working
- [ ] Sales analytics calculations accurate
- [ ] Error responses match specifications
- [ ] Tested with Postman/curl
- [ ] Deployed to production API (`https://www.soundbridge.live/api/`)

---

## 📊 Example Test Scenarios

### Scenario 1: Successful Purchase
```bash
# 1. Check ownership (should be false)
curl https://www.soundbridge.live/api/content/ownership?content_id=track-123&content_type=track \
  -H "Authorization: Bearer <token>"

# 2. Purchase content
curl -X POST https://www.soundbridge.live/api/content/purchase \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content_id": "track-123",
    "content_type": "track",
    "payment_method_id": "pm_test_card"
  }'

# 3. Check ownership again (should be true)
curl https://www.soundbridge.live/api/content/ownership?content_id=track-123&content_type=track \
  -H "Authorization: Bearer <token>"

# 4. Download content
curl https://www.soundbridge.live/api/content/track-123/download?content_type=track \
  -H "Authorization: Bearer <token>"
```

### Scenario 2: Duplicate Purchase (Should Fail)
```bash
# Try to purchase same content twice
curl -X POST https://www.soundbridge.live/api/content/purchase \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content_id": "track-123",
    "content_type": "track",
    "payment_method_id": "pm_test_card"
  }'

# Expected: 400 error - "You already own this content"
```

### Scenario 3: Non-Subscribed Creator (Should Fail)
```bash
# Free tier creator tries to enable paid content
curl -X PUT https://www.soundbridge.live/api/audio-tracks/track-456/pricing \
  -H "Authorization: Bearer <free-creator-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "is_paid": true,
    "price": 2.99,
    "currency": "USD"
  }'

# Expected: 403 error - "Only subscribed creators can sell content"
```

---

## 🤝 Cross-Team Coordination

### Mobile Team Needs:
1. Confirmation when all endpoints are live
2. Example API responses for each endpoint
3. Error code documentation
4. Rate limiting information (if applicable)
5. Webhook endpoints for payment status updates (if applicable)

### Web Team Provides:
1. API endpoint documentation
2. Test accounts with various subscription tiers
3. Test Stripe payment methods
4. Database migration scripts
5. Postman collection for testing

---

## 📝 Implementation Notes

### Database Migrations
Run migrations in this order:
1. Add fields to `audio_tracks` table
2. Create `content_purchases` table
3. Create helper functions
4. Apply RLS policies
5. Create indexes

### Payment Flow
```
User clicks "Purchase" → Mobile calls /api/content/purchase
  ↓
Backend creates Stripe Payment Intent
  ↓
Backend confirms payment
  ↓
Backend creates purchase record
  ↓
Backend transfers 90% to creator wallet
  ↓
Backend increments content sales metrics
  ↓
Backend sends confirmation emails
  ↓
Mobile receives success response
  ↓
Mobile updates UI to show "Owned"
```

### Revenue Split
- **Platform Fee:** 10% of purchase price
- **Creator Earnings:** 90% of purchase price
- Example: $2.99 purchase = $0.30 platform + $2.69 creator

---

## 🔗 Related Documentation

- Mobile Implementation: `AUDIO_SALES_PROMPT.md`
- Web Implementation: (To be provided by web team)
- Stripe Integration Guide: (To be provided by web team)
- Wallet Service Documentation: (existing)

---

**Status:** ⏳ Awaiting Backend Implementation
**Last Updated:** January 14, 2026
**Mobile Team Contact:** Justice Chetachukwu Asibe
**Web/Backend Team Contact:** [TBD]

---

## ✅ Once Backend is Ready

**Mobile Team Action Items:**
1. Test all API endpoints with Postman
2. Verify error handling for edge cases
3. Complete remaining mobile features:
   - AudioPlayerContext ownership enforcement
   - Purchased Content library screen
   - Creator pricing controls UI
   - Sales analytics dashboard
4. End-to-end testing
5. Deploy to production

**Estimated Mobile Completion Time:** 2-3 days after backend is ready
