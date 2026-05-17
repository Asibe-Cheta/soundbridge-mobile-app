## Paid Content API Alignment (Web + Mobile)

This note documents the response-shape mismatches we found between the mobile UI expectations and current TypeScript types. Mobile now normalizes multiple shapes for safety, but we want a single canonical API contract across web and mobile.

### Endpoints in question
- `GET /api/sales/analytics` (alias: `GET /api/creator/sales-analytics`)
- `GET /api/purchases/user` (alias: `GET /api/user/purchased-content`)

### 1) Sales Analytics response
Mobile UI expects these fields:
- `primary_currency` (string, e.g. "USD")
- `total_revenue` (number)
- `revenue_this_month` (number)
- `total_sales` (number)
- `sales_by_type` (array of `{ content_type, count }`)
- `top_selling_content` (array of `{ content_id, content_type, content_title, sales_count, total_revenue }`)
- `recent_sales` (array of `{ purchase_id, content_title, amount, currency, purchased_at, buyer_username? }`)

#### Open questions for web team
1) Is `total_sales` or `total_sales_count` the canonical field name?
2) Is `sales_by_type` an array of `{ content_type, count }` or an object with keys like `tracks/albums/podcasts`?
3) For `top_selling_content`, should the title field be `content_title` or `title`? Should revenue be `total_revenue` or `revenue`?
4) For `recent_sales`, should the amount be `amount` or `price_paid`? Which field is canonical?
5) Is `primary_currency` always provided? If not, what should it default to?

#### Example (mobile UI shape)
```
{
  "primary_currency": "USD",
  "total_revenue": 1250.50,
  "revenue_this_month": 220.00,
  "total_sales": 42,
  "sales_by_type": [
    { "content_type": "track", "count": 30 },
    { "content_type": "album", "count": 8 },
    { "content_type": "podcast", "count": 4 }
  ],
  "top_selling_content": [
    {
      "content_id": "uuid",
      "content_type": "track",
      "content_title": "My Song",
      "sales_count": 10,
      "total_revenue": 49.90
    }
  ],
  "recent_sales": [
    {
      "purchase_id": "uuid",
      "content_title": "My Song",
      "amount": 4.99,
      "currency": "USD",
      "purchased_at": "2026-01-18T10:00:00Z",
      "buyer_username": "user123"
    }
  ]
}
```

### 2) User Purchased Content response
Mobile UI expects a list of items with:
- `id` (purchase id)
- `content_id`
- `content_type`
- `price_paid`
- `currency`
- `purchased_at`
- `download_count`
- `content` (full content record used for playback/display)

We also see some responses wrapped like:
```
{ "data": [ ... ] }
```
or
```
{ "purchases": [ ... ] }
```

#### Open questions for web team
1) Is the purchase data nested (`{ purchase, content }`) or flattened?
2) If nested, which is the canonical key: `purchase` or `purchase_info`?
3) Should the top-level array be `data` or `purchases`?
4) Does each item always include full `content` (track/album/podcast), or do we need to fetch it separately?

#### Example (mobile UI shape)
```
{
  "data": [
    {
      "id": "purchase_uuid",
      "content_id": "content_uuid",
      "content_type": "track",
      "price_paid": 1.99,
      "currency": "USD",
      "purchased_at": "2026-01-18T10:00:00Z",
      "download_count": 2,
      "content": {
        "id": "content_uuid",
        "title": "My Song",
        "file_url": "https://...",
        "cover_art_url": "https://...",
        "creator_id": "creator_uuid"
      }
    }
  ]
}
```

### Why this matters
We currently normalize multiple shapes on mobile to prevent UI breakage. Confirming a single canonical response will allow us to remove normalization and keep web + mobile perfectly consistent.
