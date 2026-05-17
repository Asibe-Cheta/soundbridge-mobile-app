# Payment Flow Messaging — Web Team Implementation Guide

## The Flow (for all gig/opportunity payments)

1. **Payer** books a gig and pays via Stripe (card/PayPal)
2. On gig **completion**, SoundBridge captures the PaymentIntent and transfers earnings to the creator's **SoundBridge wallet**
3. Creator requests a **withdrawal** from their wallet (minimum $25)
4. SoundBridge sends the payout via **Wise** to the creator's local bank account
5. Funds arrive in the creator's local bank within **1–3 business days**

This flow applies to: Urgent Gigs, Opportunities, tips, and content sales.

---

## What to Update on the Web App

The goal is to make sure users — especially in Africa, Asia, and Latin America — understand the payment flow and feel confident that money is on its way.

### 1. Digital Wallet page / Wallet section

Add or update the "About" or informational section to reflect:

> Your digital wallet stores earnings from gigs, tips, and content sales. Once funds are in your wallet, you can request a withdrawal to your local bank account at any time (minimum $25).
>
> - Gig payments land in your wallet on completion
> - Withdraw to your local bank via Wise (1–3 business days)
> - Supports 40+ currencies across Africa, Asia & Latin America
> - Minimum withdrawal: $25

### 2. Withdrawal / Payout page

Replace any references to "2–7 business days" with:

> Funds are sent via Wise and typically arrive in your local bank within **1–3 business days**. No SoundBridge fees charged.

Update the confirmation modal/alert to say:

> Your withdrawal request has been submitted. Funds are sent via Wise and typically arrive in your local bank within 1–3 business days.

Update any agreement/consent checkbox text to say:

> I understand that withdrawals are processed via Wise and typically arrive in my local bank within 1–3 business days.

### 3. Payment Methods / Bank Account page (Wise users)

For users with Wise-routed currencies (NGN, GHS, KES, ZAR, INR, BRL, etc.), the description under their bank account card should read:

> Your bank account is set up and ready. When you earn from gigs, tips, or content, funds land in your SoundBridge wallet first. You can then withdraw to your local bank in {CURRENCY} via Wise — typically arriving within 1–3 business days. Minimum withdrawal is $25. No further verification needed.

See `WEB_TEAM_WISE_VERIFICATION_STATUS_FIX.md` for the full list of Wise currencies.

### 4. Gig / Opportunity detail page (for providers)

When a creator views an opportunity or gig they've been hired for, add a note near the payment section:

> Payment is held securely by SoundBridge and released to your wallet on gig completion. You can then withdraw to your local bank via Wise (1–3 business days).

### 5. Gig confirmation / booking success screen

After a gig is confirmed, show the provider:

> You'll be paid via your SoundBridge wallet once the gig is completed. Withdrawals to your local bank via Wise typically take 1–3 business days.

---

## Wise Currency Reference

| Region | Currencies |
|--------|-----------|
| Africa | NGN, GHS, KES, ZAR, TZS, UGX, EGP, RWF, XOF, XAF |
| South & Southeast Asia | INR, IDR, MYR, PHP, THB, VND, BDT, PKR, LKR, NPR |
| East Asia | CNY, KRW |
| Latin America | BRL, MXN, ARS, CLP, COP, CRC, UYU |
| Middle East & Eastern Europe | TRY, ILS, MAD, UAH, GEL |

Stripe Connect countries (GBP, USD, EUR, CAD, AUD, etc.) go through the normal Stripe payout flow — messaging for those users can remain as-is.

---

## Priority

**Medium** — no broken functionality, but users in emerging markets are currently seeing vague/incorrect timing info ("2–7 business days") which erodes trust. This is especially important for new Nigerian, Ghanaian, Kenyan, and Indian users seeing their first payment.
