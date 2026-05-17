## 2‑Page Rehearsal Sheet (Quick Read)

### 1) One‑Sentence Summary
SoundBridge helps audio creators upload, monetize, and grow through music, events, and community.

### 2) Core Stack
- Mobile: React Native (Expo) + TypeScript  
- Auth + DB + Realtime: Supabase (Postgres)  
- Payments: Stripe  
- Mobile subscriptions: RevenueCat  

### 3) How Login Works (Very Simple)
User signs in → Supabase returns a token → token is used for every request.

### 4) How Data Is Protected
- Supabase Auth + JWT sessions  
- Row Level Security (RLS) in the database  
- TLS in transit, Supabase encryption at rest  

### 5) Upload Flow (Simple)
Validate file → upload to storage → fingerprint with ACRCloud if needed → save track data → show in app.

### 6) Copyright Protection
ACRCloud detects matches → ISRC is required → user attests ownership → audit trail saved.

### 7) Reporting & Moderation
Users can report posts/drops in‑app → report API receives it → moderation reviews.

### 8) Messaging
Supabase Realtime pushes new messages to the UI instantly.

### 9) Payments
Stripe handles payments (tips, tickets).  
RevenueCat handles mobile subscriptions.  
Payouts use Stripe Connect or Wise (Africa).

### 10) Events
Events are personalized by location + category + user behavior.

### 11) Monitoring
ErrorTrackingService with optional Sentry.

### 12) Biggest Risks (Say This Honestly)
Scaling uploads, payout automation, and consistent personalization quality.

### 13) In‑Progress Compliance Items
Retention jobs, GDPR export, age gate, rate limiting, fraud/chargeback workflow, Cloudflare setup.

