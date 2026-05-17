Here's the prompt for Cursor:

---

## **FEATURE REQUEST: Paid Audio Content (Tracks, Albums, Podcasts)**

### **Overview**
Enable subscribed creators to sell their audio content (individual tracks, albums, and podcasts) directly to users. Users can purchase, download, and own the content permanently. SoundBridge takes a 10% platform fee, with 90% going to the creator's digital wallet.

### **Eligibility**
- **Only subscribed creators** can sell audio content
- Free/non-subscribed creators cannot enable this feature
- This is a monetization perk for paying subscribers

### **Supported Content Types**
1. **Individual Tracks** (single songs/audio files)
2. **Albums** (collections of tracks)
3. **Podcasts** (individual episodes or entire podcast series)

### **Pricing**
- Creators set their own prices
- Suggested price range: £0.99 - £50.00 (enforce minimum/maximum to prevent abuse)
- Support multiple currencies based on user location (if multi-currency already implemented)
- Prices should be displayed clearly before purchase

### **Purchase Flow**

**User Journey:**
1. User browses creator's profile and sees available paid content
2. User clicks "Buy" on a track/album/podcast
3. Purchase confirmation modal shows:
   - Content title
   - Price
   - "You'll be able to download this after purchase"
   - Payment method (existing wallet/card on file)
4. User confirms purchase
5. Payment processed:
   - 90% to creator's digital wallet
   - 10% to SoundBridge platform fee account
6. User immediately gains access to download the content
7. Content is marked as "Owned" on user's account
8. User can download to local device (unlimited downloads)

**Creator Journey:**
1. Creator uploads audio content (track/album/podcast)
2. In content settings, toggle "Enable Paid Access"
3. Set price (with currency selector if applicable)
4. Publish content
5. Track sales in analytics dashboard

### **Backend Requirements**

**IMPORTANT - Database Verification:**
- **Mobile and web teams are in separate codebases**
- **Web app team handles web app AND backend**
- Before implementing, **verify the existing database schema** for audio content
- Confirm whether data is stored as:
  - `audio_tracks` (for individual tracks)
  - `albums` (for album collections)
  - `podcasts` (for podcast episodes)
  - Or some other naming convention
- **Use the actual table names** that exist in the system

**New Database Fields/Tables Required:**

**For Content (whichever tables exist: `audio_tracks`, `albums`, `podcasts`):**
- `is_paid` (boolean, default false)
- `price` (decimal, nullable)
- `currency` (string, default 'GBP')
- `total_sales_count` (integer, default 0)
- `total_revenue` (decimal, default 0.00)

**New Table: `content_purchases`:**
- `id` (primary key)
- `user_id` (foreign key to users)
- `content_id` (foreign key to audio_tracks/albums/podcasts)
- `content_type` (enum: 'track', 'album', 'podcast')
- `price_paid` (decimal)
- `currency` (string)
- `platform_fee` (decimal, calculated as 10% of price)
- `creator_earnings` (decimal, calculated as 90% of price)
- `transaction_id` (string, reference to payment processor transaction)
- `purchased_at` (timestamp)
- `download_count` (integer, default 0) — track how many times user has downloaded

**Payment Processing:**
- Integrate with existing payment system (Stripe or whatever is currently used)
- On successful purchase:
  - Transfer 90% to creator's digital wallet (use existing wallet system)
  - Transfer 10% to platform account
  - Record transaction in `content_purchases`
  - Grant user permanent access to content

**API Endpoints:**

**For Creators:**
- `PUT /api/audio-tracks/:id/pricing` - Set/update track price
- `PUT /api/albums/:id/pricing` - Set/update album price
- `PUT /api/podcasts/:id/pricing` - Set/update podcast price
- `GET /api/creator/sales-analytics` - Retrieve sales metrics

**For Users:**
- `POST /api/content/purchase` - Purchase content (body: content_id, content_type)
- `GET /api/user/purchased-content` - Get list of user's purchased content
- `GET /api/content/:id/download` - Download purchased content (verify ownership first)

**Access Control:**
- Before allowing download, verify:
  1. User has purchased the content (`content_purchases` record exists)
  2. OR user is the creator of the content
  3. Reject download request if neither condition is met

### **Frontend UI Requirements**

**Creator Side (Content Management):**

**Upload/Edit Content Screen:**
- Add new section: "Pricing"
- Toggle: "Make this available for purchase"
  - When OFF: Content is free (existing behavior)
  - When ON: Show price input field
- Price input with currency symbol
- Help text: "You'll keep 90% of sales. SoundBridge takes 10%."
- Preview of creator earnings: "You'll earn £X.XX per sale"

**Analytics Dashboard (Add New Section: "Sales"):**
- **Total Revenue** (lifetime earnings from sales)
- **Revenue This Month**
- **Total Sales Count** (number of purchases)
- **Sales Breakdown:**
  - Tracks sold: [count]
  - Albums sold: [count]
  - Podcasts sold: [count]
- **Top Selling Content** (list of best-selling items with revenue)
- **Recent Sales** (table showing recent purchases with date, content, price)

**NOTE:** If these analytics metrics do NOT currently exist in the dashboard, **create them first** before implementing the sales feature.

**User Side (Browse/Purchase):**

**Content Display:**
- If content is paid, show:
  - Price badge (e.g., "£2.99") instead of or alongside the play button
  - "Buy" button (primary action)
  - Play button disabled or shows "Preview" (if preview is supported)
- If user already owns content:
  - Show "Owned" badge
  - Enable play button
  - Show "Download" button

**Purchase Modal:**
- Content thumbnail/cover art
- Title
- Creator name
- Price
- "You'll be able to download this content after purchase"
- Payment method selector (use existing payment UI)
- "Confirm Purchase" button
- "Cancel" button

**Post-Purchase:**
- Success message: "Purchase complete! You can now download [Content Title]."
- Immediate redirect to content with download button enabled
- Add content to "My Purchases" or "Library" section

**User's Library/Purchased Content:**
- New tab or section: "Purchased"
- List of all purchased content with:
  - Thumbnail
  - Title
  - Creator
  - Purchase date
  - "Play" button
  - "Download" button

**Download Functionality:**
- On click, initiate download of audio file to user's device
- Track download count in `content_purchases` table (increment `download_count`)
- Support unlimited re-downloads

### **Security & Access Control**

1. **Only subscribed creators can enable paid content**
   - Check creator's subscription status before allowing pricing toggle
   - If creator's subscription expires, disable sales (but keep existing purchased content accessible to buyers)

2. **Verify ownership before download**
   - Check `content_purchases` table for matching user_id + content_id
   - OR check if user is the creator
   - Return 403 Forbidden if neither condition is met

3. **Prevent duplicate purchases**
   - Check if user has already purchased content before allowing re-purchase
   - Show "Already Owned" instead of "Buy" button

4. **Refund Policy (for future consideration, NOT implemented now):**
   - No refunds for digital downloads (standard practice)
   - Document this in Terms of Service

### **Payment Processing**

- Use **existing payment infrastructure** (likely Stripe)
- On successful payment:
  - Create `content_purchases` record
  - Transfer 90% to creator's digital wallet (use existing wallet transfer logic)
  - Transfer 10% to SoundBridge platform account
  - Send confirmation email/notification to user and creator

- On failed payment:
  - Show error message to user
  - Do NOT grant access to content
  - Log failure for admin review

### **Error Handling**

**User-Facing Errors:**
- "Payment failed. Please try again or use a different payment method."
- "You've already purchased this content."
- "This content is no longer available for purchase."
- "Only subscribed creators can sell content." (if non-subscribed creator tries to enable pricing)

**Admin Logging:**
- Log all purchase transactions (successful and failed)
- Log payment processing errors
- Log unauthorized download attempts

### **Email/Notification System**

**For Buyers:**
- Purchase confirmation email with:
  - Content title
  - Price paid
  - Receipt/transaction ID
  - Link to download

**For Creators:**
- New sale notification:
  - "[Content Title] was purchased by [Username]"
  - Amount earned
  - Link to sales analytics

### **Analytics - Critical Step**

**BEFORE implementing the sales feature, verify:**
1. Does the analytics dashboard currently track:
   - Audio sales by content type (tracks, albums, podcasts)?
   - Total revenue?
   - Revenue breakdown by content type?

2. **If these metrics DO NOT exist:**
   - **Create them FIRST**
   - Add database tables/fields to track sales metrics
   - Build analytics dashboard UI to display metrics
   - THEN implement the purchase flow

3. **If these metrics already exist:**
   - Integrate purchase data into existing analytics
   - Ensure proper categorization (track vs. album vs. podcast)

### **Testing Checklist**

Before shipping:
- [ ] Verify only subscribed creators can enable paid content
- [ ] Test purchase flow end-to-end (payment → wallet transfer → access grant)
- [ ] Verify 90/10 revenue split is calculated correctly
- [ ] Test download functionality (file downloads successfully)
- [ ] Verify users can't download content they haven't purchased
- [ ] Test duplicate purchase prevention
- [ ] Verify analytics dashboard shows accurate sales data
- [ ] Test payment failure scenarios
- [ ] Test cross-platform consistency (web app and mobile app)
- [ ] Verify creators receive sale notifications
- [ ] Verify buyers receive purchase confirmation

### **Cross-Team Coordination**

**Web App Team (Backend + Web Frontend):**
- Implement backend API endpoints
- Implement payment processing logic
- Implement web app UI for creators and users
- Verify and use correct database table names

**Mobile App Team:**
- Implement mobile UI for purchase flow
- Implement download functionality for mobile
- Ensure payment flow works on iOS and Android
- Sync with web team on API contract

**Both teams should coordinate on:**
- Database schema (use same table names)
- API endpoint specifications
- Payment processing flow
- Error handling standards

### **Future Enhancements (DO NOT implement now):**
- Bulk pricing (e.g., "Buy 3 tracks, get 1 free")
- Discount codes
- Preview clips for paid content (30-second samples)
- Gift purchases (buy content for someone else)
- Subscription bundles (monthly access to creator's catalog)

---

**Implementation Priority: CRITICAL - MVP Feature**
**Estimated Complexity: High**
**Target: Q1 2026 - MUST BE IMPLEMENTED NOW**
**Revenue Impact: Direct monetization for creators and platform**

---

