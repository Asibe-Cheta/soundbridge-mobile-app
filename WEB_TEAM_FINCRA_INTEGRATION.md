# Web Team — Fincra Payout Integration

**Date:** 2026-04-23  
**Raised by:** Mobile team / Justice  
**Priority:** High — required for Nigerian creator payouts

---

## Background

Fincra has approved SoundBridge Live Ltd for live API access. This document covers everything the web team needs to integrate Fincra payouts into the backend.

---

## Credentials & Environment Variables

The following env vars must be added to the Vercel `soundbridge` project:

| Variable | Value | Notes |
|---|---|---|
| `FINCRA_API_KEY` | *(from Fincra dashboard → API Keys & Webhooks)* | Live key |
| `FINCRA_SECRET_KEY` | *(from Fincra dashboard → API Keys & Webhooks)* | For webhook signature verification |
| `FIXIE_URL` | *(already auto-added by Fixie Vercel integration)* | Static IP proxy — do not remove |

`FIXIE_URL` was automatically injected into the Vercel `soundbridge` project by the Fixie integration. It looks like:
```
http://fixie:kD0ZLkqB7cEzE31@ventoux.usefixie.com:80
```

---

## Why FIXIE_URL is required

Fincra enforces IP whitelisting — only requests from whitelisted IPs can call their API. Vercel serverless functions use dynamic IPs, so all outbound requests to Fincra **must** be routed through the Fixie proxy.

**Whitelisted IPs on Fincra:**
- `54.217.142.99`
- `54.195.3.54`

Any Fincra API call that does NOT go through the proxy will be rejected by Fincra with a 403.

---

## How to route requests through Fixie

Use `axios` with the proxy config on every Fincra API call:

```javascript
const axios = require('axios');
const url = require('url');

function fincraRequest(method, path, body) {
  const fixieUrl = url.parse(process.env.FIXIE_URL);
  const [username, password] = fixieUrl.auth.split(':');

  return axios({
    method,
    url: `https://api.fincra.com${path}`,
    data: body,
    proxy: {
      protocol: 'http',
      host: fixieUrl.hostname,
      port: Number(fixieUrl.port),
      auth: { username, password },
    },
    headers: {
      'api-key': process.env.FINCRA_API_KEY,
      'Content-Type': 'application/json',
    },
  });
}
```

Or if using `node-fetch` / native fetch, use the `https-proxy-agent` package:

```javascript
const { HttpsProxyAgent } = require('https-proxy-agent');

const agent = new HttpsProxyAgent(process.env.FIXIE_URL);

fetch('https://api.fincra.com/...', {
  method: 'POST',
  agent,
  headers: {
    'api-key': process.env.FINCRA_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});
```

---

## Endpoints to implement

### 1. Create a payout (Nigerian bank transfer)

**Fincra endpoint:** `POST /disbursements/payouts`

**When to call:** When a creator requests a withdrawal to their Nigerian bank account.

**Payload:**
```json
{
  "sourceCurrency": "GBP",
  "destinationCurrency": "NGN",
  "amount": 25.00,
  "description": "SoundBridge creator payout",
  "customerReference": "<unique_payout_id>",
  "beneficiary": {
    "firstName": "<creator_first_name>",
    "lastName": "<creator_last_name>",
    "accountNumber": "<bank_account_number>",
    "bankCode": "<bank_code>",
    "type": "individual",
    "country": "NG"
  },
  "paymentDestination": "bank_account",
  "business": "<fincra_business_id>"
}
```

**Our internal route:** `POST /api/payouts/fincra`

### 2. Verify bank account

**Fincra endpoint:** `POST /core/accounts/resolve`

**When to call:** When a creator adds a Nigerian bank account — verify it before saving.

**Payload:**
```json
{
  "accountNumber": "<account_number>",
  "bankCode": "<bank_code>",
  "type": "nuban"
}
```

**Our internal route:** `POST /api/payouts/verify-bank`

### 3. Get list of Nigerian banks

**Fincra endpoint:** `GET /core/banks?country=NG`

**When to call:** When populating the bank selector in the withdrawal form.

**Our internal route:** `GET /api/payouts/banks`

### 4. Check payout status

**Fincra endpoint:** `GET /disbursements/payouts/customer-reference/<reference>`

**When to call:** To poll or update payout status after initiation.

**Our internal route:** `GET /api/payouts/status/:reference`

---

## Webhook

Fincra sends webhook events when payout status changes (e.g. `transfer.successful`, `transfer.failed`).

**Our webhook endpoint:** `POST /api/webhooks/fincra`

Verify the webhook signature using `FINCRA_SECRET_KEY`:

```javascript
const crypto = require('crypto');

function verifyFincraWebhook(req) {
  const signature = req.headers['x-fincra-signature'];
  const hash = crypto
    .createHmac('sha256', process.env.FINCRA_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return hash === signature;
}
```

On `transfer.successful`: release payout record in DB, notify creator via push notification.  
On `transfer.failed`: mark payout failed, refund wallet balance, notify creator.

---

## Database

A `payouts` table is needed (if not already exists):

```sql
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  source_currency CHAR(3) NOT NULL DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'pending',
  fincra_reference TEXT,
  customer_reference TEXT UNIQUE NOT NULL,
  bank_account_number TEXT,
  bank_code TEXT,
  bank_name TEXT,
  beneficiary_name TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payouts_user_id_idx ON payouts(user_id);
```

---

## Summary checklist for web team

- [ ] Add `FINCRA_API_KEY` and `FINCRA_SECRET_KEY` to Vercel env vars
- [ ] Confirm `FIXIE_URL` is present in Vercel env vars (auto-added by Fixie)
- [ ] Implement `POST /api/payouts/fincra` — initiate payout via Fixie proxy
- [ ] Implement `POST /api/payouts/verify-bank` — resolve bank account
- [ ] Implement `GET /api/payouts/banks` — list Nigerian banks
- [ ] Implement `GET /api/payouts/status/:reference` — check payout status
- [ ] Implement `POST /api/webhooks/fincra` — handle webhook events with signature verification
- [ ] Create `payouts` table in Supabase
- [ ] All Fincra API calls must use the Fixie proxy — requests without it will 403

---

*Fincra account is live and approved. Whitelisted IPs are active. The mobile withdrawal UI (CountryAwareBankForm, AddWithdrawalMethodScreen) is ready and will call these endpoints once implemented.*
