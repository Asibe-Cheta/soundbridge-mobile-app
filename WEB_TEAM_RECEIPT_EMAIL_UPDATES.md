# Web Team: Receipt & Email Updates Required

## 1. Update Contact Email in All Receipt Emails

The correct support email is `contact@soundbridge.live`, not `support@soundbridge.live`.

Please update this in:
- Wallet transaction receipt emails (`POST /api/wallet/transactions/:id/send-receipt`)
- Event ticket receipt emails (`POST /api/event-tickets/:id/send-receipt`)
- Any other transactional emails sent by the platform (tips, payouts, subscriptions, etc.)

**Old:** `support@soundbridge.live`
**New:** `contact@soundbridge.live`

---

## 2. Add SoundBridge Logo to Receipt Emails

All receipt emails should include the SoundBridge logo at the top of the email body.

The logo file is: `logo-trans-lockup.png` (pink/red gradient sound waves + "SoundBridge" wordmark in red).

Host it on your CDN/storage and reference it as an `<img>` tag at the top of every receipt email HTML template. Example:

```html
<div style="text-align:center; margin-bottom: 32px;">
  <img src="https://your-cdn.com/logos/soundbridge-logo.png"
       alt="SoundBridge"
       height="48"
       style="object-fit:contain;" />
</div>
```

The logo should appear above the receipt amount on all:
- Wallet transaction receipts
- Event ticket receipts
- Gig payment receipts (if/when you send those)
- Any future receipt-style emails

---

## 3. PDF Receipt Generation (Already Done on Mobile)

The mobile app now generates **branded PDF receipts** locally using `expo-print` for:
- Wallet transactions (share from Transaction History)
- Completed gig payments (share from Transaction History)
- Event tickets (share from Ticket Confirmation screen)

Each PDF includes:
- SoundBridge logo (embedded as base64)
- Large coloured amount
- Status badge
- Data rows: transaction/project/ticket ID, date, description, currency, Stripe PI ID where available
- Footer: `SoundBridge Ltd · contact@soundbridge.live · soundbridge.live`

No action needed from the web team for PDF generation — this is fully client-side.

---

## 4. Completed Gig Payments Now Visible Without Wallet Transaction Row

Mobile Transaction History now reads directly from `GET /api/opportunity-projects?role=creator` and displays `status: completed` projects as "GIG EARNINGS (COMPLETED)" even if a `wallet_transactions` row was never created.

This was a workaround for the now-fixed `confirm-delivery` bug where wallet credits were silently swallowed. Future completions will create wallet_transaction rows correctly (per your fix). The mobile fallback ensures past completions are still visible to service providers.

No backend action needed — this is a pure mobile read from an existing endpoint.

---

## Summary of Actions for Web Team

| # | Action | Priority |
|---|--------|----------|
| 1 | Change `support@soundbridge.live` → `contact@soundbridge.live` in all transactional emails | P0 |
| 2 | Add SoundBridge logo to top of all receipt email HTML templates | P1 |
