# Web Team: Payout Minimum Threshold + Fee Transparency

## Priority: P1

---

## 1. Minimum Payout Threshold — Reconsider $50

The current minimum is $50 USD. This needs to be reconsidered.

### Comparison to other platforms

| Platform | Minimum payout |
|---|---|
| TikTok Creator Fund | $10 |
| YouTube AdSense | $100 |
| Fiverr | $30 |
| Upwork | $1 (bank transfer) |
| PayPal | No minimum |
| Spotify for Artists | ~$10 |
| **SoundBridge (current)** | **$50** |

### The real issue: Wise flat fee

The $50 minimum exists because Wise charges a flat fee (~$7–10 USD) regardless of amount. A $25 payout with a $7 Wise fee = 28% overhead, which is unreasonable.

**However:** $50 with a $7 Wise fee = 14% overhead, still significant.

### Recommendation

**Do NOT use a blanket $50 minimum.** Instead:

**For Wise-routed currencies (NGN, GHS, KES, ZAR, TZS, UGX):**
- Set minimum at $30 USD
- Show the Wise fee estimate prominently before confirmation (mobile already does this — see below)
- Creators make an informed choice; we don't hide the fee behind a high floor

**For non-Wise currencies (GBP, EUR, USD, CAD, AUD):**
- Set minimum at $20 USD
- No Wise fee, so lower threshold is fine

**Implementation:** The `/api/payouts/eligibility` response already returns `min_payout`. Make it currency-aware:
```json
// For NGN/GHS/KES/ZAR/TZS/UGX bank accounts:
{ "min_payout": 30 }

// For GBP/EUR/USD/CAD/AUD bank accounts:
{ "min_payout": 20 }
```

---

## 2. Show Wise Fee Before Transfer (Fee Transparency)

**Mobile has already implemented the UI side** — the RequestPayoutScreen now shows a fee warning card for Wise currencies before the creator confirms their request.

**What web team needs to do:** When `POST /api/admin/payouts/initiate` is called, before creating the Wise transfer, call the Wise quote API and return the actual fee in the response. This lets us eventually show the EXACT fee rather than an estimate.

### Optional: New endpoint `GET /api/payouts/fee-estimate`

```
GET /api/payouts/fee-estimate?amount=40&source_currency=USD&target_currency=NGN
Authorization: Bearer <user JWT>
```

Response:
```json
{
  "source_amount": 40.00,
  "source_currency": "USD",
  "target_currency": "NGN",
  "transfer_fee_usd": 7.31,
  "net_amount_usd": 32.69,
  "estimated_target_amount": 44299,
  "exchange_rate": 1355.52,
  "fee_percentage": 18.3,
  "provider": "wise"
}
```

This calls `POST /v3/quotes` on Wise to get an exact real-time fee. Cache for 5 minutes.

**This is a P2 enhancement** — the mobile currently shows a ~17% estimate which is close enough for now.

---

## 3. Foreign Account Option — Let Creators Bypass Wise Fees

**Add this to the Payment Methods screen and the payout fee warning:**

> "Have a UK, EU, or US bank account? Add it to receive your earnings with significantly lower fees, then transfer to your local account using an app like Lemfi, Wise Personal, or your bank's international transfer."

This is already shown as a tip in the mobile payout screen. Make sure the Payment Methods screen (web) also surfaces this option clearly — especially for creators in Nigeria, Ghana, Kenya, etc.

**Why this matters:** A creator in Nigeria with a UK account (e.g. Monzo, Revolut, or a British bank) can:
1. Receive GBP directly from SoundBridge (no Wise fee — direct sort code transfer)
2. Transfer GBP → NGN themselves via Lemfi (~1–2% fee vs Wise's ~17%)
3. Net result: significantly more money in their Nigerian bank

We cannot do this for them directly (we'd need to know their preferred receiving currency at payout time), but surfacing the option is honest and helpful.

---

## 4. What Mobile Has Already Done

- `RequestPayoutScreen` now fetches the creator's bank account currency on load
- For Wise currencies, shows a yellow warning card:
  - "International Transfer Fee — Payments to Nigeria go through Wise and include a transfer fee (~$5–12 USD depending on amount)"
  - Live estimate: "~$X fee · You'll receive approx $Y equivalent in NGN"
  - Tip about adding a foreign bank account
- Confirmation alert now includes fee breakdown before final submission

No mobile changes needed beyond this. Web team only needs items 1 and 2 above.

---

## Summary Checklist

- [ ] Update `/api/payouts/eligibility` to return currency-aware `min_payout` (NGN/GHS/etc → $30, GBP/EUR/USD → $20)
- [ ] (Optional P2) Add `GET /api/payouts/fee-estimate` endpoint using Wise quote API
- [ ] Add foreign account tip to web Payment Methods screen for users in Wise-currency countries
