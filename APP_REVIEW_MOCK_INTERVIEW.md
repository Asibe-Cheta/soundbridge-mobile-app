## Mock Interview (Questions Only)

1) What does SoundBridge do in one sentence?  
2) What tech stack is the mobile app built with?  
3) What do you use for authentication?  
4) What database do you use and why?  
5) How do you prevent users from seeing others’ private data?  
6) Where is your Supabase project hosted?  
7) How do you store and serve uploaded audio?  
8) What happens when a user uploads a track?  
9) How do you detect copyright issues?  
10) What’s the role of ACRCloud and ISRC?  
11) How do users report bad content?  
12) How does messaging stay real‑time?  
13) What systems handle payments and subscriptions?  
14) How do tips work end‑to‑end?  
15) How do creator payouts work?  
16) What happens if Stripe payment fails?  
17) What is your personalization approach for events?  
18) What monitoring/error tracking do you use?  
19) What are the biggest technical risks right now?  
20) What’s still in progress from a compliance point of view?  

---

## Mock Interview (Answers)

1) SoundBridge helps audio creators upload, monetize, and grow through music, events, and community.  
2) React Native (Expo) + TypeScript.  
3) Supabase Auth (email/password + JWT sessions).  
4) Supabase Postgres, because it gives us auth, realtime, and a proven DB quickly.  
5) Row Level Security (RLS) + API auth checks.  
6) AWS eu‑north‑1 (Stockholm).  
7) Supabase Storage + CDN.  
8) Validate file → upload to storage → fingerprint if needed → save metadata in Postgres.  
9) ACRCloud fingerprinting + ISRC verification + user attestation.  
10) ACRCloud finds matches; ISRC proves ownership.  
11) Users can report posts/drops in‑app through the report modal.  
12) Supabase Realtime streams new messages to the UI.  
13) Stripe (payments), RevenueCat (mobile subscriptions).  
14) User pays via Stripe → we record tip → update creator earnings.  
15) Stripe Connect for most regions, Wise for African payouts.  
16) We show an error and the user can retry; Stripe handles the failure response.  
17) We filter by location, category, and behavior so users only see relevant events.  
18) ErrorTrackingService with optional Sentry.  
19) Scaling uploads, realtime volume, payout automation, and content verification accuracy.  
20) Data retention jobs, GDPR export, age gate, rate limiting, fraud/chargeback workflow, and Cloudflare setup.  

