## SoundBridge App Explainer (Simple Version)

This is a plain‑English overview of how the app works, plus a Q&A section for review.

### 1) What the app is
SoundBridge is a creator platform for audio (music, podcasts). People can upload tracks, discover content, follow creators, message, tip, sell content, and host events.

### 2) How authentication works (log in / sign up)
- We use **Supabase Auth** for email + password.
- When you log in, Supabase gives the app a **session token (JWT)**.
- That token is used on every request so the backend knows who you are.
- We also use **Row Level Security (RLS)** in the database, which means users can only read/write their own data unless they are allowed to see more.

**Explain like I’m 10:**
- **JWT** is like a stamped wristband at an event. If you have it, you can enter. If you don’t, you can’t.
- **RLS** is like a rule that says you can only open your own locker, not everyone else’s.

**Show me in code (auth/JWT):**
- `src/lib/supabase.ts` (Supabase client + session handling)
- `src/contexts/AuthContext.tsx` (sign in, sign up, sign out flows)

### 3) Database (where data lives)
- We use **Supabase (Postgres)** as the main database.
- Data is stored in tables like:
  - `profiles` (user profiles)
  - `audio_tracks` (uploaded tracks)
  - `likes`, `comments`, `messages` (social activity)
  - `creator_revenue`, `creator_bank_accounts` (earnings + payouts)
- Supabase also handles **Realtime** updates for things like messages and live sessions.

**Show me in code (DB usage):**
- `src/lib/supabase.ts` (dbHelpers queries)
- `src/services/*` (service layer queries)

### 4) File storage (audio, images)
- Uploads go to **Supabase Storage** (for audio, cover art, and fingerprint temp files).
- The app validates file size and type before upload.

**Show me in code (uploads & storage):**
- `src/screens/UploadScreen.tsx` (file validation + upload flow)
- `src/services/UploadService.ts` (upload helpers)

### 5) Content safety (copyright + reporting)
- We use **ACRCloud** to fingerprint tracks and detect released songs.
- If a track looks like a cover or a released song, the user must provide a valid **ISRC**.
- We store a **copyright attestation** in the database for legal safety.
- Users can **report posts/drops** from the app (report modal → API).

**Show me in code (copyright + reporting):**
- `src/screens/UploadScreen.tsx` (ACRCloud + ISRC + attestation UI)
- `src/services/UploadService.ts` (attestation storage)
- `src/modals/ReportContentModal.tsx`
- `src/services/api/reportService.ts`

### 6) Payments
- **Stripe** handles payments (tickets, tips).
- **RevenueCat** handles mobile subscriptions.
- Payouts use **Stripe Connect** for most regions and **Wise** for African payouts.

**Show me in code (payments & payouts):**
- `src/services/EventTicketService.ts` (ticket payments)
- `src/components/TipModal.tsx` and `src/components/live-sessions/LiveTippingModal.tsx` (tips)
- `src/services/SubscriptionService.ts` (subscriptions + usage)
- `src/services/PayoutService.ts` (payout API)
- `src/screens/WithdrawalScreen.tsx` / `src/screens/WalletScreen.tsx`

### 7) Events
- Creators can create events and sell tickets.
- Events are shown to users based on personalization rules (location, category, behavior).

**Show me in code (events):**
- `src/screens/CreateEventScreen.tsx`
- `src/screens/EventDetailsScreen.tsx`
- `src/screens/DiscoverScreen.tsx` (personalized events)

### 8) Messaging & notifications
- Messaging uses Supabase and realtime updates.
- Push notifications use Expo + our NotificationService.

**Show me in code (messaging/notifications):**
- `src/screens/MessagesScreen.tsx` / `src/screens/ChatScreen.tsx`
- `src/services/NotificationService.ts`
- `src/services/realtime/realtimeService.ts`

### 9) Error tracking & monitoring
- We have an **ErrorTrackingService** that can use **Sentry** if configured.

**Show me in code (monitoring):**
- `src/services/monitoring/errorTrackingService.ts`
- `App.tsx` (service initialization)

---

## Q&A (Simple Questions + Simple Answers)

### Auth & Security
1. **Q: What do you use for login?**  
   **A:** Supabase Auth (email + password).

2. **Q: What is a JWT?**  
   **A:** A short token that proves the user is logged in.

3. **Q: How do you stop users from seeing other people’s data?**  
   **A:** Database Row Level Security (RLS).

4. **Q: Where is the data hosted?**  
   **A:** Supabase Postgres (AWS eu‑north‑1).

5. **Q: How are passwords stored?**  
   **A:** Supabase Auth hashes passwords using bcrypt.

### Database
6. **Q: What’s the main database?**  
   **A:** Supabase (PostgreSQL).

7. **Q: What are some key tables?**  
   **A:** `profiles`, `audio_tracks`, `likes`, `messages`, `creator_revenue`.

### Uploads & Copyright
8. **Q: How do you detect copyright issues?**  
   **A:** ACRCloud fingerprinting + ISRC verification.

9. **Q: What happens if a track looks like a released song?**  
   **A:** The user must enter and verify the ISRC code.

10. **Q: Do users confirm ownership?**  
    **A:** Yes, they must accept a copyright attestation.

### Reporting
11. **Q: Can users report content?**  
    **A:** Yes. Posts/drops can be reported in‑app.

### Payments
12. **Q: What payment system do you use?**  
    **A:** Stripe for payments, RevenueCat for mobile subscriptions.

13. **Q: How do tips work?**  
    **A:** Tips are paid via Stripe; creator earnings are recorded in the database.

14. **Q: How do payouts work?**  
    **A:** Stripe Connect for most regions, Wise for African payouts.

### Events
15. **Q: How do events get shown to users?**  
    **A:** Personalization by location + category + behavior.

### Notifications
16. **Q: How do push notifications work?**  
    **A:** Expo notifications + our NotificationService.

### Monitoring
17. **Q: How do you track errors?**  
    **A:** ErrorTrackingService with optional Sentry.

---

## Quick “Explain Like I’m 10” Summary
- **Login**: Supabase checks who you are.
- **Database**: Supabase stores all user data safely.
- **Uploads**: Files are checked and stored safely.
- **Copyright**: We fingerprint music and ask for proof if needed.
- **Payments**: Stripe handles money; RevenueCat handles subscriptions.
- **Events**: We show events to people who are likely to attend.
- **Messages**: Real‑time chat uses Supabase.
- **Errors**: We log issues so we can fix bugs.

---

## “Show Me Where” (Scaling Uploads + Payout Automation)

### Scaling Uploads (where to show him)
- Validation + size limits: `src/screens/UploadScreen.tsx`
- Storage upload helpers: `src/services/UploadService.ts`
- Fingerprinting: `src/screens/UploadScreen.tsx` (ACRCloud flow)
- Storage quota logic: `src/services/UploadQuotaService.ts`

### Payout Automation (where to show him)
- Payout API client: `src/services/PayoutService.ts`
- Wallet flows: `src/screens/WalletScreen.tsx`, `src/screens/WithdrawalScreen.tsx`
- Bank account storage: `src/services/revenueService.ts`
- Country‑aware bank form: `src/components/CountryAwareBankForm.tsx`

## Review‑Style Q&A (Deeper, but Still Simple)

### System Design
1. **Q: What are the main building blocks of the app?**  
   **A:** Mobile app (React Native), Supabase (database + auth + realtime), Stripe/RevenueCat (payments), and APIs on our backend.

2. **Q: What happens when a user uploads a track?**  
   **A:** We validate file type/size → upload to storage → run ACRCloud if needed → save track data in Postgres → show it in the app.

3. **Q: How does messaging stay real‑time?**  
   **A:** Supabase Realtime listens for new messages and updates the UI instantly.

4. **Q: How do events get personalized?**  
   **A:** We filter by location, category, and behavior so users only see relevant events.

### Data & Security
5. **Q: How do you make sure users can’t read other users’ private data?**  
   **A:** RLS in Postgres and auth checks on API endpoints.

6. **Q: What data is most sensitive?**  
   **A:** Auth sessions, payment data (handled by Stripe), and user content history.

7. **Q: Do you store card details?**  
   **A:** No. Stripe handles card data.

### Payments & Monetization
8. **Q: How do subscriptions work on mobile?**  
   **A:** RevenueCat is the source of truth for IAP subscriptions.

9. **Q: How do creators get paid?**  
   **A:** Earnings are tracked in `creator_revenue`. Payouts use Stripe Connect or Wise depending on region.

10. **Q: What happens if a payment fails?**  
    **A:** The UI shows the failure and the user can retry. Stripe handles the failure response.

### Reliability & Scaling
11. **Q: What could break at scale?**  
    **A:** Large uploads, heavy realtime traffic, or slow queries. We use caching and timeouts.

12. **Q: How do you monitor errors?**  
    **A:** ErrorTrackingService with optional Sentry; fallback to logs.

### Tradeoffs
13. **Q: Why Supabase instead of custom backend?**  
    **A:** Faster development, built‑in auth, realtime, and reliable Postgres.

14. **Q: What’s the biggest technical risk?**  
    **A:** Scaling uploads, copyright enforcement reliability, and payout automation.

15. **Q: What’s the biggest product risk?**  
    **A:** Keeping personalization high‑quality and ensuring creators trust payouts.


