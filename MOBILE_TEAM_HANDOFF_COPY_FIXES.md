# Mobile team handoff: copy fixes pushed to main (2026-11-12)

Two commits were pushed directly to `main` as part of a cross-repo copy audit (revenue-share figures, "LinkedIn for X" positioning, and marketplace/booking claims that didn't match actual feature status). All changes are text-only. No payment, fee, payout, or booking logic was touched.

## What's live on origin/main now

**Commit `2ee3ec92` — main copy fixes**
- `src/components/PostCard.tsx`: "creators keep 85 to 90% of every tip" → "creators keep 85% of every tip"
- `src/components/ServiceProviderPromptModal.tsx`: "Keep 95% of what you earn" → "Keep 85% of what you earn"
- `src/constants/subscriptionPlans.ts`: Unlimited plan "90% creator share..." → "85% creator share..."
- `src/screens/FeedScreen.tsx`, `src/screens/TestFeedScreen.tsx`: onboarding tooltip "keep 85 to 90% of every tip" → "keep 85% of every tip"
- `src/screens/HelpSupportScreen.tsx`: tipping FAQ "up to 90%" → "85%"; service-marketplace FAQ rewritten to say in-app booking is coming soon rather than implying it already works
- `src/screens/OnboardingScreen.tsx`: headline "LinkedIn for audio creators" → "Creator networking that pays"; role description "Find talent and book collaborations." → "Find talent and start collaborations."
- `src/screens/UploadScreen.tsx`: two tooltips, 95%→85%, removed "Services marketplace" from an earnings-ready checklist (not launched)
- `src/services/NudgeService.ts`: "keep between 85 and 90% instantly" → "keep 85% instantly"
- `src/services/PayoutService.ts`: code comment only, 95%/5% → 85%/15%
- `src/types/paid-content.ts`: code comments only, 10%/90% → 15%/85%
- `src/screens/OnboardingScreen.tsx.backup` deleted (dead file, unused, still said "95%")

**Commit `36e9655c` — follow-up**
- `src/screens/DiscoverScreen.tsx`: Service Providers walkthrough tooltip "browse portfolios, read reviews, and hire directly" → "browse portfolios and reviews, and get in touch"

Checked and deliberately left unchanged: `src/screens/VenueDetailScreen.tsx`'s "Book Now" button. It only renders when a venue has a real `external_booking_link` set, and opens that actual external URL. That's accurate, not a false claim, so no fix needed.

## Release mechanics

All of the above are JS/TSX text/logic-light changes with no native code touched. They're OTA-eligible via `eas update`, assuming `runtimeVersion: {policy: "appVersion"}` in `app.json` and no native `version` bump since the last published build. **`eas update` has not been run yet** — these fixes are in git but not live to installed apps. Justice asked for push-only, no OTA, for this round; running the OTA update is a separate, explicit step someone still needs to take.

## Important: a held-back commit exists locally only, not pushed

There is a further commit, `ee68948a`, sitting on top of `36e9655c` **only on Justice's local machine** — it is **not** on origin and must not be pushed without explicit legal sign-off. It changes `src/screens/TermsOfServiceScreen.tsx` Section 6 ("Revenue Sharing"), which incorrectly promised "90% of streaming revenue" (streaming royalties aren't a thing in this product at all; actual figure is 85% on tips/sales/tickets/services). The proposed fix is correct but this is a legal document shown for acceptance, so it's being held pending lawyer review before it goes anywhere.

If anyone else pulls/clones/works on this repo from a different machine, you will **not** see this commit — it only exists in Justice's local `.git`. Do not independently try to "fix" the same ToS section without checking with Justice first, to avoid conflicting versions landing later.
