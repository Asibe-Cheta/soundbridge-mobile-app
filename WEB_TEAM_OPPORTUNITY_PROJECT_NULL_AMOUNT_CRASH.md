# 🐛 Fix: Opportunity Project Screen Crashes When Financial Fields Are Null

## What's Happening

When a project is fetched from the backend, the fields `agreed_amount`, `platform_fee_amount`, and `creator_payout_amount` can be `null` or `undefined` (e.g. if the project was created via an unusual path, a previous failed attempt, or a webhook-driven status update rather than the normal accept flow).

Any code that calls `.toFixed()` directly on these values will crash:

```js
project.agreed_amount.toFixed(2)        // ❌ crashes if null
project.platform_fee_amount.toFixed(2)  // ❌ crashes if null
project.creator_payout_amount.toFixed(2) // ❌ crashes if null
```

## The Fix

Add a null fallback before calling `.toFixed()`:

```js
(project.agreed_amount ?? 0).toFixed(2)
(project.platform_fee_amount ?? 0).toFixed(2)
(project.creator_payout_amount ?? 0).toFixed(2)
```

Apply this everywhere these fields are rendered or used in string interpolation on the project detail page — including:
- Payment breakdown card (agreed amount, platform fee, provider payout)
- Escrow status banners (e.g. "£X is in escrow")
- Accept/confirm alert dialogs
- Any tooltip or summary text referencing these amounts

## Why This Happens

The `opportunity_projects` row was advanced to `awaiting_acceptance` (e.g. via a manual SQL update or webhook) without the financial fields being populated. The project object reaches the frontend with `agreed_amount: null`, `platform_fee_amount: null`, `creator_payout_amount: null`.

The longer-term backend fix is to ensure these fields are always populated when the project record is created. But the frontend should be defensively null-safe regardless — a null field should show `0.00`, not crash the page.

## Affected Fields

| Field | Type | Default if null |
|-------|------|-----------------|
| `agreed_amount` | decimal | `0` |
| `platform_fee_amount` | decimal | `0` |
| `creator_payout_amount` | decimal | `0` |
| `platform_fee_percent` | integer | `0` |

## Priority

Medium — the crash is reproducible and blocks providers from accepting project agreements.
