# **SOUNDBRIDGE URGENT GIG SYSTEM - TECHNICAL REQUIREMENTS**

## **1. DATABASE SCHEMA REQUIREMENTS**

### **1.1 Gig Posts Table**

**Fields needed:**
```
gigs
├── id (UUID, primary key)
├── created_by (user_id, foreign key)
├── gig_type (enum: 'urgent', 'planned')
├── title (text)
├── description (text)
├── skill_required (text - e.g., "trumpeter", "vocalist")
├── genre (array - gospel, jazz, classical, etc.)
├── location_lat (decimal)
├── location_lng (decimal)
├── location_address (text)
├── location_radius_km (integer - search within X km)
├── date_needed (datetime)
├── duration_hours (decimal)
├── payment_amount (decimal)
├── payment_currency (text - GBP)
├── payment_status (enum: 'pending', 'escrowed', 'released', 'refunded')
├── escrow_transaction_id (UUID, foreign key)
├── status (enum: 'searching', 'pending_acceptance', 'confirmed', 'in_progress', 'completed', 'cancelled')
├── selected_provider_id (user_id, foreign key - nullable)
├── expires_at (datetime - for urgent gigs)
├── created_at (timestamp)
├── updated_at (timestamp)
```

---

### **1.2 Gig Responses Table**

**Fields needed:**
```
gig_responses
├── id (UUID, primary key)
├── gig_id (foreign key)
├── provider_id (user_id, foreign key)
├── status (enum: 'pending', 'accepted', 'declined', 'expired')
├── response_time_seconds (integer - how fast they responded)
├── message (text - optional message to requester)
├── notified_at (timestamp)
├── responded_at (timestamp)
├── created_at (timestamp)
```

---

### **1.3 User Availability Table**

**Fields needed:**
```
user_availability
├── id (UUID, primary key)
├── user_id (foreign key)
├── available_for_urgent_gigs (boolean)
├── current_lat (decimal - nullable)
├── current_lng (decimal - nullable)
├── general_area (text - e.g., "Luton" - if not using precise location)
├── max_radius_km (integer - willing to travel)
├── hourly_rate (decimal)
├── per_gig_rate (decimal)
├── rate_negotiable (boolean)
├── availability_schedule (JSONB - day/time availability)
├── last_location_update (timestamp)
├── created_at (timestamp)
├── updated_at (timestamp)
```

**Example availability_schedule JSON:**
```json
{
  "monday": {"available": true, "hours": "18:00-23:00"},
  "tuesday": {"available": true, "hours": "all_day"},
  "wednesday": {"available": false},
  "thursday": {"available": true, "hours": "18:00-23:00"},
  "friday": {"available": true, "hours": "18:00-23:00"},
  "saturday": {"available": true, "hours": "all_day"},
  "sunday": {"available": true, "hours": "14:00-22:00"}
}
```

---

### **1.4 Notification Queue Table**

**Fields needed:**
```
notification_queue
├── id (UUID, primary key)
├── user_id (foreign key)
├── gig_id (foreign key)
├── notification_type (enum: 'urgent_gig', 'gig_accepted', 'gig_confirmed', etc.)
├── sent (boolean)
├── sent_at (timestamp - nullable)
├── read (boolean)
├── read_at (timestamp - nullable)
├── push_notification_sent (boolean)
├── created_at (timestamp)
```

---

### **1.5 Escrow Payments Table**

**Fields needed:**
```
escrow_payments
├── id (UUID, primary key)
├── gig_id (foreign key)
├── payer_id (user_id, foreign key)
├── payee_id (user_id, foreign key - nullable until gig confirmed)
├── amount (decimal)
├── currency (text)
├── platform_fee_percent (decimal - 12%)
├── platform_fee_amount (decimal)
├── net_to_payee (decimal)
├── stripe_payment_intent_id (text)
├── status (enum: 'pending', 'held', 'released', 'refunded', 'disputed')
├── held_at (timestamp)
├── released_at (timestamp - nullable)
├── dispute_reason (text - nullable)
├── created_at (timestamp)
├── updated_at (timestamp)
```

---

## **2. REAL-TIME MATCHING ALGORITHM REQUIREMENTS**

### **2.1 Match Score Calculation**

**Algorithm must calculate match score based on:**

**Weighting:**
- 40% Skill match (exact skill + genre match)
- 25% Distance (proximity to gig location)
- 20% Rating (service provider rating)
- 10% Availability (available right now vs scheduled)
- 5% Price (within requester's budget)

**Implementation requirements:**
- Must run when user posts urgent gig
- Must query users with `available_for_urgent_gigs = true`
- Must calculate distance using Haversine formula (lat/lng)
- Must filter by:
  - Skill match (user's listed skills contain required skill)
  - Genre match (user's genres overlap with gig genres)
  - Distance (within max_radius_km)
  - Time availability (user available at gig date/time)
  - Budget (user's rate ≤ gig payment)
- Must return top 10 matches ranked by score
- Must send notifications to top 10 only (not all matches)

---

### **2.2 Distance Calculation**

**Requirements:**
- Use Haversine formula for calculating distance between two lat/lng points
- Return distance in kilometers
- Filter users within requester's specified radius (default 20km)
- Consider provider's max_radius_km (don't notify if gig outside their travel radius)

**Formula reference needed:**
- Haversine distance calculation
- Account for Earth's curvature
- Accuracy within 100m acceptable

---

### **2.3 Real-Time Availability Check**

**Must verify:**
- User has `available_for_urgent_gigs = true`
- Current day/time matches user's availability_schedule
- User not already booked for conflicting gig at same time
- User's last_location_update is recent (< 30 minutes old, or use general_area)

---

## **3. NOTIFICATION SYSTEM REQUIREMENTS**

### **3.1 Push Notification Service**

**Platform requirements:**
- iOS: Apple Push Notification Service (APNs)
- Android: Firebase Cloud Messaging (FCM)
- Web: Web Push API (for browser notifications)

**Notification triggers:**
1. **Urgent gig posted** → Notify matched providers
2. **Provider accepts** → Notify requester
3. **Requester confirms provider** → Notify selected provider
4. **Gig starting soon** → Remind both parties (1 hour before)
5. **Gig completed** → Prompt both parties to confirm/rate

---

### **3.2 Push Notification Payload Structure**

**For urgent gig notification:**
```json
{
  "title": "🎺 Urgent Gig: Trumpeter Tonight 7pm",
  "body": "£120 | Gospel | 2.3km away | Luton",
  "data": {
    "type": "urgent_gig",
    "gig_id": "uuid-here",
    "distance_km": 2.3,
    "payment": 120,
    "skill": "trumpeter",
    "genre": "gospel",
    "location": "Luton",
    "date_time": "2026-02-23T19:00:00Z"
  },
  "actions": [
    {"id": "accept", "title": "ACCEPT"},
    {"id": "view", "title": "VIEW DETAILS"},
    {"id": "decline", "title": "DECLINE"}
  ],
  "sound": "urgent_gig.mp3",
  "badge": 1,
  "category": "urgent_gig"
}
```

---

### **3.3 Notification Rate Limiting**

**Requirements:**
- Maximum 5 urgent gig notifications per user per day
- If user declines 3 consecutive gigs, pause notifications for 2 hours
- If user doesn't respond to 5 consecutive notifications, reduce notification priority
- Respect user's notification preferences (can disable certain types)
- Do not send notifications during user's "Do Not Disturb" hours (configurable)

---

### **3.4 In-App Notification Center**

**Requirements:**
- All notifications stored in notification_queue table
- Accessible in app even if push notification missed
- Mark as read when viewed
- Badge count shows unread count
- Filter by type (urgent gigs, confirmations, payments, etc.)
- Auto-delete after 30 days

---

## **4. ESCROW PAYMENT SYSTEM REQUIREMENTS**

### **4.1 Stripe Integration**

**Payment flow requirements:**

**Step 1: Gig Posted**
- Capture payment from requester using Stripe Payment Intent
- Hold in Stripe (do not transfer immediately)
- Store `stripe_payment_intent_id` in escrow_payments table
- Set `status = 'held'`

**Step 2: Gig Confirmed**
- Update escrow_payment with `payee_id` (selected provider)
- Payment still held

**Step 3: Gig Completed**
- Requester confirms service rendered
- OR auto-confirm after 48 hours if no dispute raised
- Release payment to provider using Stripe Transfer
- Deduct platform fee (12%)
- Provider receives net amount (88%)
- Set `status = 'released'`

**Step 4: Dispute Handling**
- If requester disputes, set `status = 'disputed'`
- Hold payment pending resolution
- Platform mediates (manual review)
- Either release to provider OR refund to requester

---

### **4.2 Payment Statuses**

**Required status transitions:**
```
pending → held → released (normal flow)
pending → held → refunded (cancellation)
pending → held → disputed → released/refunded (dispute resolution)
```

---

### **4.3 Automatic Release Timer**

**Requirements:**
- After gig date/time + 48 hours, auto-release payment if no dispute
- Send reminder to requester: "Please confirm gig completion" (24 hours after gig)
- If confirmed, release immediately
- If not confirmed and no dispute within 48 hours, auto-release
- Protects providers from non-responsive requesters

---

### **4.4 Platform Fee Calculation**

**Requirements:**
- Platform fee: 12% of gig payment
- Calculate: `platform_fee_amount = payment_amount * 0.12`
- Provider receives: `net_to_payee = payment_amount * 0.88`
- Fee charged to provider (deducted from their payout)
- Stripe fees (~2.9% + £0.30) absorbed by platform or passed to requester

---

## **5. USER INTERFACE REQUIREMENTS**

### **5.1 Requester Flow: Post Urgent Gig**

**Screen 1: Gig Type Selection**
- Two buttons: [POST A GIG] [URGENT GIG 🔥]
- Brief explanation under each

**Screen 2: Gig Details Form**
- Skill needed (dropdown: Trumpeter, Vocalist, Drummer, etc.)
- Genre (multi-select: Gospel, Jazz, Classical, etc.)
- Date & Time (datetime picker)
- Duration (slider: 1-8 hours)
- Location (map picker OR address autocomplete)
- Radius (slider: 5km, 10km, 20km, 50km, 100km)
- Payment amount (number input with currency)
- Description (text area - optional)
- [CONTINUE] button

**Screen 3: Payment**
- Summary: "You're posting: Trumpeter, £120, Gospel, Tonight 7pm"
- Payment method (Stripe card input)
- "Payment will be held until service completed"
- [CONFIRM & PAY] button

**Screen 4: Searching Animation**
- "🔍 Searching for trumpeter nearby..."
- Animated loading indicator
- Shows when notifications sent: "Notified 8 musicians"

**Screen 5: Real-Time Responses**
- List updates in real-time as providers accept
- Each card shows:
  - Name, profile photo
  - Rating (4.8★, 12 reviews)
  - Distance (2.3 km away)
  - Price (£100/hr or £150 per gig)
  - Status: ACCEPTED ✅ | Viewing... ⏳ | DECLINED ❌
  - [VIEW PROFILE] [SELECT] buttons
- Sort by: Distance, Rating, Price

**Screen 6: Selection Confirmation**
- "You selected James for £120"
- "James will receive confirmation shortly"
- "You'll be notified when gig is confirmed"
- Show contact info for coordination
- [MESSAGE JAMES] button

---

### **5.2 Provider Flow: Receive Urgent Gig**

**Notification arrives:**
- Push notification with action buttons
- Tap ACCEPT → directly accepts
- Tap VIEW DETAILS → opens app to details
- Tap DECLINE → declines

**In-app notification detail screen:**
- Large icon/image of skill needed (🎺)
- Title: "Urgent Gig: Trumpeter Tonight 7pm"
- Payment: £120 (large, prominent)
- Distance: 2.3 km away
- Location: Luton Church, 123 High St
- Genre: Gospel
- Duration: 2 hours (7pm-9pm)
- Requester: Sarah M. (4.9★, 12 reviews)
- Description: "We need a trumpeter for our worship night..."
- [ACCEPT GIG] [DECLINE] [SEND MESSAGE] buttons

**After accepting:**
- "You've accepted! Waiting for requester to confirm..."
- Show status: "Sarah is reviewing applications (3 accepted, 2 pending)"
- If selected: "🎉 Confirmed! You've been selected for this gig"
- If not selected: "This gig was filled by another musician"

---

### **5.3 Provider Settings: Availability Controls**

**Availability screen:**
```
📍 URGENT GIG AVAILABILITY

[Toggle ON/OFF] Available for Urgent Gigs
When enabled, you'll receive real-time notifications for last-minute gigs near you.

LOCATION TRACKING
○ Use precise location (GPS) - More accurate matches
● Use general area - Enter your area manually
  General area: [Luton                    ]

TRAVEL RADIUS
How far are you willing to travel?
[Slider: 5km - 10km - 20km - 50km - 100km]
Currently: 20km

YOUR RATES
Hourly rate: £ [100    ] /hour
Per gig rate: £ [150    ] /gig
[✓] Rates are negotiable

AVAILABILITY SCHEDULE
When are you available for gigs?

Monday:    [Toggle ON]  [18:00 - 23:00    ]
Tuesday:   [Toggle ON]  [All day          ]
Wednesday: [Toggle OFF]
Thursday:  [Toggle ON]  [18:00 - 23:00    ]
Friday:    [Toggle ON]  [18:00 - 23:00    ]
Saturday:  [Toggle ON]  [All day          ]
Sunday:    [Toggle ON]  [14:00 - 22:00    ]

NOTIFICATION LIMITS
Maximum urgent gig notifications per day: [5 ]
(Prevents notification fatigue)

DO NOT DISTURB
Don't send notifications during:
[23:00] - [08:00]

[SAVE SETTINGS]
```

---

## **6. BACKGROUND PROCESSING REQUIREMENTS**

### **6.1 Cron Jobs / Scheduled Tasks**

**Required background jobs:**

**Every 1 minute:**
- Check for expired urgent gigs (expires_at passed, no provider selected)
- Auto-cancel and refund
- Notify requester: "Your urgent gig expired. No providers accepted."

**Every 5 minutes:**
- Check gigs where date_needed is approaching (within 1 hour)
- Send reminder notifications to both parties
- "Your gig starts in 1 hour! 📍 Location: ..."

**Every 30 minutes:**
- Clean up stale location data (last_location_update > 30 min)
- Mark users as unavailable if location too old

**Daily at midnight:**
- Auto-release escrow payments for gigs completed >48 hours ago with no dispute
- Send "Confirm gig completion" reminders for completed gigs

**Weekly:**
- Generate analytics: urgent gig fill rate, average response time, etc.
- Send providers summary: "You earned £450 from 5 gigs this week"

---

### **6.2 Real-Time Event Listeners**

**WebSocket / Real-time database listeners needed:**

**When gig posted:**
- Calculate matches
- Send notifications
- Start listening for responses

**When provider responds:**
- Update gig_responses table
- Notify requester in real-time
- Update requester's UI (response card appears)

**When requester selects provider:**
- Update gig status
- Notify selected provider
- Notify rejected providers
- Cancel pending notifications to others

---

## **7. LOCATION SERVICES REQUIREMENTS**

### **7.1 Location Tracking (Optional for Providers)**

**If user enables precise location:**
- Request location permission: "Allow SoundBridge to access your location to match you with nearby gigs"
- Update location every 15 minutes when app active
- Use coarse location (city-level) to save battery
- Store lat/lng in user_availability table
- Last update timestamp

**If user uses general area:**
- User manually enters area (e.g., "Luton", "Birmingham City Centre")
- Geocode to lat/lng using Google Maps Geocoding API
- Use this as static location
- No battery drain

---

### **7.2 Distance Calculation Service**

**Requirements:**
- Calculate distance between two lat/lng coordinates
- Return kilometers (UK standard)
- Haversine formula implementation
- Cache results for same location pairs (optimization)

**API needed:**
- Google Maps Distance Matrix API (OR)
- Haversine formula implementation in backend

---

## **8. RATING & REVIEW SYSTEM REQUIREMENTS**

### **8.1 Post-Gig Rating Flow**

**After gig marked completed:**
- Both parties prompted to rate each other
- Modal appears: "How was your experience with [Name]?"
- Rating components:
  - Overall (1-5 stars)
  - Specific metrics (professionalism, punctuality, quality)
  - Written review (optional)
- Cannot see other's rating until both submitted
- Ratings visible publicly on profiles

---

### **8.2 Rating Schema**

**Table: gig_ratings**
```
gig_ratings
├── id (UUID)
├── gig_id (foreign key)
├── rater_id (user who's rating)
├── ratee_id (user being rated)
├── overall_rating (1-5)
├── professionalism_rating (1-5)
├── punctuality_rating (1-5)
├── quality_rating (1-5) - for providers
├── payment_promptness_rating (1-5) - for requesters
├── review_text (text)
├── created_at (timestamp)
```

---

## **9. DISPUTE RESOLUTION REQUIREMENTS**

### **9.1 Dispute Initiation**

**Requester can dispute if:**
- Provider didn't show up
- Provider showed up late (>30 min)
- Quality of service unsatisfactory
- Service not as described

**Provider can dispute if:**
- Requester changed requirements last-minute
- Requester requested additional unpaid work
- Unsafe working conditions
- Payment issue

---

### **9.2 Dispute Resolution Flow**

**Step 1: Dispute raised**
- Disputing party clicks "Raise Dispute"
- Selects reason from dropdown
- Provides description and evidence (photos, messages)
- Payment automatically held

**Step 2: Other party notified**
- Receives notification: "A dispute has been raised"
- Can respond with their side
- Provide counter-evidence

**Step 3: Platform review**
- Admin reviews both sides
- Checks messages, ratings, evidence
- Makes decision within 72 hours

**Step 4: Resolution**
- Full refund to requester (if provider at fault)
- Full payment to provider (if requester at fault)
- Partial split (if both partially at fault)
- Decision is final

---

## **10. ANALYTICS & MONITORING REQUIREMENTS**

### **10.1 Metrics to Track**

**Urgent gig metrics:**
- Average time to first acceptance (target: <5 minutes)
- Fill rate (% of urgent gigs that get filled)
- Average number of acceptances per gig
- Cancellation rate
- Dispute rate

**Provider metrics:**
- Average response time to notifications
- Acceptance rate (% of notifications they accept)
- Decline rate
- No-response rate
- Earnings per week

**Requester metrics:**
- Repeat usage rate
- Average payment amount
- Success rate (gigs completed vs cancelled)

---

### **10.2 Dashboard for Admin**

**Required views:**
- Active urgent gigs (currently searching)
- Gigs awaiting confirmation
- Gigs in progress
- Completed gigs (last 24 hours)
- Disputed gigs (pending resolution)
- Total escrow balance
- Revenue from platform fees (last 7 days, 30 days, all-time)

---

## **11. SECURITY & COMPLIANCE REQUIREMENTS**

### **11.1 Data Privacy**

**Location data:**
- Only collect when user explicitly opts in
- Clear disclosure: "We use your location to match you with nearby gigs"
- Allow user to delete location data
- Don't share precise location with requesters until gig confirmed
- GDPR compliant

**Payment data:**
- Never store full card numbers (use Stripe tokens)
- PCI DSS compliant (Stripe handles this)
- Encrypt sensitive data at rest

---

### **11.2 Fraud Prevention**

**Prevent fake gigs:**
- Require payment upfront (prevents spam)
- Verify requester identity (email, phone)
- Rate limit: Max 3 urgent gigs per user per day
- Flag suspicious behavior (same user posting/canceling repeatedly)

**Prevent provider gaming:**
- If provider accepts then cancels >3 times, temporary ban from urgent gigs
- Track response time (too slow = lower priority in future)
- Require minimum 4.0★ rating to receive urgent gig notifications

---

## **12. PERFORMANCE REQUIREMENTS**

### **12.1 Response Time Targets**

**Critical paths:**
- Match calculation: <2 seconds
- Notification delivery: <5 seconds
- Real-time UI update (when provider accepts): <1 second
- Payment capture: <3 seconds
- Escrow release: <5 seconds

---

### **12.2 Scalability Requirements**

**Must handle:**
- 10,000+ concurrent users
- 500+ urgent gigs posted per day
- 5,000+ notifications sent per minute (peak)
- Real-time updates for 100+ simultaneous gigs

**Database optimization:**
- Index on: location (lat/lng), user_id, gig_id, status, created_at
- Geospatial queries optimized (PostGIS extension)
- Cache frequently accessed data (user locations, availability)

---

## **13. TESTING REQUIREMENTS**

### **13.1 Unit Tests**

**Must test:**
- Match score calculation (various scenarios)
- Distance calculation (edge cases: same location, opposite sides of Earth)
- Escrow payment flow (all status transitions)
- Notification logic (who gets notified, who doesn't)
- Availability checking (timezone handling, day boundaries)

---

### **13.2 Integration Tests**

**Must test:**
- End-to-end urgent gig flow (post → match → notify → accept → confirm → complete → pay)
- Payment failure handling
- Notification delivery (push notification received?)
- Real-time updates (UI updates when provider accepts?)

---

### **13.3 Load Testing**

**Scenarios to test:**
- 100 urgent gigs posted simultaneously
- 1,000 providers receiving notifications at once
- Database performance under load
- Real-time update performance

---

## **14. ROLLOUT STRATEGY**

### **14.1 Phased Launch**

**Phase 1: Beta (Week 1-2)**
- Enable for 50 users in London only
- Monitor closely for bugs
- Gather feedback
- Iterate quickly

**Phase 2: Limited Launch (Week 3-4)**
- Enable for 200 users in London, Birmingham, Manchester
- Test across multiple cities
- Optimize matching algorithm based on real data

**Phase 3: Full Launch (Week 5+)**
- Enable for all users nationwide
- Marketing push: "Introducing Urgent Gigs - Get musicians in minutes"
- Monitor KPIs: fill rate, response time, user satisfaction

---

### **14.2 Feature Flags**

**Implement feature toggles:**
- `urgent_gigs_enabled` (global on/off)
- `urgent_gigs_enabled_for_user` (per-user control)
- `urgent_gigs_enabled_for_city` (per-location control)
- `notification_rate_limit` (adjustable threshold)

Allows instant disable if critical bug found.

---

## **15. DOCUMENTATION REQUIREMENTS**

### **15.1 User Guides**

**Requester guide:**
- "How to post an urgent gig"
- "Understanding escrow payments"
- "What to do if provider doesn't show up"

**Provider guide:**
- "How to enable urgent gig notifications"
- "Setting your availability"
- "Maximizing your chances of being selected"

---

### **15.2 API Documentation**

**Endpoints needed:**
- `POST /gigs/urgent` - Post urgent gig
- `GET /gigs/urgent/:id` - Get gig details
- `POST /gigs/:id/respond` - Accept/decline gig
- `POST /gigs/:id/select` - Select provider
- `POST /gigs/:id/complete` - Mark complete
- `POST /gigs/:id/dispute` - Raise dispute
- `PATCH /user/availability` - Update availability settings

---

## **🎯 IMPLEMENTATION PRIORITY (This Week)**

**Day 1-2: Core Database & Matching**
- Set up database tables
- Implement matching algorithm
- Test distance calculation

**Day 3-4: Payment Integration**
- Stripe escrow flow
- Test payment capture, hold, release

**Day 5-6: Notifications**
- Push notification setup (FCM, APNs)
- Notification delivery logic
- Test notification triggers

**Day 7: UI & Testing**
- Build requester flow UI
- Build provider notification UI
- End-to-end testing

---

