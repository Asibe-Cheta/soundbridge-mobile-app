# Institutional Partner Badges — Web Team Brief

**Feature shipped on mobile:** 2026-07-11
**Prepared for:** Web team (backend DB + web app)
**Contact:** Justice (mobile)

---

## What this feature is

Creators can be affiliated with an institutional partner (currently Abbey Road Institute or Sound Academy). When set, a small badge image appears next to their name on their profile page and on every artist card where they appear (search results, Discover, listings).

- Badge is **admin-assigned only** — creators cannot self-declare affiliation
- A creator can hold **at most one** badge at a time
- If no affiliation is set, nothing is shown — no empty slot, no placeholder

---

## 1. Database migration

Add one nullable column to the `profiles` table:

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS institution_badge TEXT
  CHECK (institution_badge IN ('abbey_road_institute', 'sound_academy'));
```

**Notes:**
- `TEXT` with a `CHECK` constraint (not a foreign-key enum) — keeps it simple to extend later
- Nullable — `NULL` means no badge
- No default value needed
- Index not required for v1 (low cardinality, infrequent query)

**Initial values (identifiers, not display labels):**

| Identifier | Institution |
|---|---|
| `abbey_road_institute` | Abbey Road Institute |
| `sound_academy` | Sound Academy |

---

## 2. Badge assets

Two image files are in the mobile repo at:

```
assets/images/abb-badge.png   ← Abbey Road Institute
assets/sa-2.png               ← Sound Academy
```

Host these in your CDN/static asset store and reference them by identifier. The mapping is:

```
abbey_road_institute  →  abb-badge.png
sound_academy         →  sa-2.png
```

Render at approximately **18–20 px** on full profile pages, **13–16 px** on card/list rows.

---

## 3. Display logic (web app)

Wherever a creator's name appears, show the badge image inline immediately after any existing verified checkmark. Rendering rules:

```
if institution_badge is null → render nothing (no empty slot)
if institution_badge === 'abbey_road_institute' → render abb-badge.png
if institution_badge === 'sound_academy'        → render sa-2.png
```

**Where to add it (matching mobile parity):**

| Surface | Placement |
|---|---|
| Creator full profile page | Inline after verified badge, next to display name (heading + sticky header) |
| Discover / Browse artist cards | Inline after display name on the card |
| Search results (people/artists) | Inline after display name in the result row |
| Any other creator listing | Same — inline after display name |

---

## 4. Admin UI — integrate into existing Partners section

**Do not create a new admin section.** Add badge assignment inside the existing Partners tab/section of the admin dashboard.

The UI is simple — it is a two-field operation per creator:

1. **Search / look up a user** — by username, display name, or email
2. **Set badge** — dropdown with three options:
   - *(none)* — clears the badge
   - Abbey Road Institute
   - Sound Academy
3. **Save** — runs the SQL below

```sql
-- Assign badge
UPDATE profiles SET institution_badge = 'abbey_road_institute' WHERE id = :user_id;

-- Remove badge
UPDATE profiles SET institution_badge = NULL WHERE id = :user_id;
```

No approval workflow, no notifications, no audit log required for v1.

---

## 5. API / GraphQL (if applicable)

If the web app fetches creator profiles via a REST or GraphQL API, include `institution_badge` in the profile response payload. The mobile app reads it directly from Supabase; the web may use a different layer.

If there is a `/profiles/:id` or similar endpoint, add:
```json
{
  "institution_badge": "abbey_road_institute"  // or null
}
```

If there is a `get_creators_with_stats` Postgres RPC function, update it to also `SELECT institution_badge` — mobile falls back to a direct query when the RPC doesn't include it, but web may rely on the RPC.

---

## 6. Existing related systems — do not modify

These are separate systems and must not be changed:

- **Verified checkmark badge** (`is_verified` column) — completely independent, unaffected
- **Sound Academy referral / institutional access** (`sound_academy` in `user_metadata.source`) — controls premium tier access granted to Sound Academy signups, not the display badge
- **ProResources screen** (mobile) / equivalent web page — user-facing content hub showing partner courses and events; no badge assignment logic goes here

---

## 7. Summary checklist for web team

- [ ] Run the `ALTER TABLE` migration on production `profiles`
- [ ] Host `abb-badge.png` and `sa-2.png` on the CDN
- [ ] Display badge inline on creator full profile page (after verified badge)
- [ ] Display badge inline on artist cards / search result rows
- [ ] Add assignment UI inside the existing Partners admin section (lookup → dropdown → save)
- [ ] Include `institution_badge` in any API/RPC response that returns profile data
- [ ] Confirm the `get_creators_with_stats` RPC selects `institution_badge` (mobile fallback already handles it if not)
