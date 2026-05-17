# Location Intelligence System — Implementation Inference

**Date:** 2026-02-24
**Based on:** `SoundBridge_Location_Intelligence_Specification.md` + full codebase audit
**Purpose:** Gap analysis, data readiness assessment, and inference notes before any implementation begins

---

## 1. What the spec wants vs what currently exists

### The spec's core ask (plain language)

The spec wants SoundBridge to answer three questions for any artist:

1. **"Is my location a good place for my genre?"** — Location viability score
2. **"Where should I go next?"** — Alternative location recommendations
3. **"What will happen if I hold an event there?"** — Predictive outcomes

It approaches all three from an **audience-centric** lens (where are the *fans*?) rather than artist-centric (where are the *artists*?).

---

## 2. What already exists in the codebase that directly serves this spec

### 2.1 Location data — partially in place

| Data point | Exists? | Where |
|-----------|---------|-------|
| Artist city / country | ✅ | `profiles.city`, `profiles.country`, `profiles.location` |
| Artist GPS coordinates (live) | ✅ | `LocationUpdateService` — throttled GPS tracking → stores state + country |
| Artist availability radius | ✅ | `user_availability.max_radius_km` — but only for urgent gig matching, not music discovery |
| Event lat/lng | ✅ | `events.latitude`, `events.longitude` |
| Urgent gig lat/lng + radius | ✅ | `opportunity_posts.location_lat/lng`, `location_radius_km` |
| Fan location | ⚠️ Partial | `CreatorRevenueService.getFanDemographics()` returns `{ city, country, fanCount, totalSpent, engagementScore }` per creator — but not aggregated platform-wide |
| Discovery radius on artist profile | ❌ | Does not exist — radius concept only exists for urgent gig providers |

**Key inference:** The location infrastructure is solid for the *provider side* (urgent gigs). For the *music discovery / career intelligence* side, the concept of a discovery radius on an artist's music profile does not exist yet.

---

### 2.2 Genre data — in place

| Data point | Exists? | Where |
|-----------|---------|-------|
| Artist genre (single) | ✅ | `profiles.genre` |
| Artist genres (array) | ✅ | `profiles.genres[]` |
| Track genre | ✅ | `tracks.genre` |
| User genre preferences | ✅ | Inferred from streaming/engagement behavior |
| Urgent gig genre matching | ✅ | `opportunity_posts.genre[]` used for provider matching |

**Key inference:** Genre is captured at both track and profile level. This is the raw material for a genre-location affinity matrix. The missing step is aggregating this across all users by geography.

---

### 2.3 Fan demographics — the most valuable existing data for this spec

This is the most directly relevant existing dataset. `CreatorRevenueService.getFanDemographics()` currently returns:

```typescript
FanDemographic {
  city: string
  country: string
  fanCount: number
  totalSpent: number       // ← financial engagement
  engagementScore: number  // ← behavioural engagement
}
```

This is essentially the seed data for Feature 2 (Economic Intelligence Dashboard) and Feature 3 (Event Location Optimizer) in the spec. **It already tells each artist where their fans are and how much they spend.**

**Key inference:** This data currently serves individual artists only (visible on their own analytics dashboard). The spec wants this aggregated anonymously across all artists, grouped by genre — creating a platform-level "audience density map" by genre and location. The data collection is done; the aggregation layer is missing.

---

### 2.4 Creator analytics — strong foundation

The app already has three layered analytics screens:

| Screen | What it tracks |
|--------|---------------|
| `AnalyticsDashboardScreen` | Plays, likes, shares, downloads, followers, engagement rate |
| `CreatorEarningsDashboardScreen` | Revenue by source (tips, tickets, services, downloads) with trend lines |
| `CreatorInsightsDashboardScreen` | Fan demographics by city/country, top fans by spend, track performance, monthly growth |

The `CreatorRevenueService` already provides:
- Revenue by source with percentage change
- Revenue trend over time by category
- Top earning items (tracks, events, services)
- Fan spend breakdown
- Monthly growth metrics

**Key inference:** The analytics infrastructure is mature. What's missing is the *comparison layer* — i.e., "your plays in Manchester are 4x your plays in Birmingham" — and the *benchmarking layer* — "the average artist in your genre in Manchester earns £X/event."

---

### 2.5 Event data — adequate for predictions

Events already store:
- `latitude`, `longitude`, `location`, `venue`, `country`
- `max_attendees`, `current_attendees` (actual vs capacity)
- `ticket_price`, `tickets_available`
- `category`, `event_date`
- Creator link (`creator_id`)

**Key inference:** This is the training data the spec's Model 2 (Event Attendance Prediction) needs. With enough historical events, a regression model can be trained. The data schema is already correct. The question is whether enough events have been held on the platform yet to have statistical significance.

---

### 2.6 Financial / wallet data — ready for economic inference

The wallet system captures:
- Tip amounts (with sender and recipient — indirectly their locations)
- Ticket sales (linked to event location)
- Paid content purchases (linked to buyer location)
- Platform fee calculations already separate creator net earnings

**Key inference:** Tipping behaviour by location — one of the spec's key monetization signals — is already tracked. The `LiveSessionTip` has `tipper_id` which links to a profile with `country`/`city`. This can produce a "tips per fan by location" metric without any new data collection.

---

### 2.7 Subscription tier data — already present

`subscription_tier: 'free' | 'premium' | 'unlimited'` is stored on profiles. The spec cites "premium subscription rates by region" as a monetization signal. This field, combined with `profiles.country`/`profiles.city`, already provides that.

---

## 3. What is completely absent and must be built

### 3.1 External data sources — none integrated yet

The spec's Phase 2 depends on:
- **ONS API** (`api.ons.gov.uk`) — regional income, employment, population
- **UK Census / NOMIS API** (`nomisweb.co.uk`) — population density by local authority
- **Companies House API** — entertainment business registrations

None of these are referenced anywhere in the codebase. There is no data pipeline, no caching layer for government data, and no background jobs that fetch external economic data.

**Gap severity:** High for the spec's full vision; Low for Phase 1 (which only uses internal data).

---

### 3.2 Location viability scoring — not implemented

The spec defines:

```
Viability = (Population × Income × Genre_Interest × Event_Attendance_Rate) / Artist_Competition
```

There is no equivalent calculation anywhere in the codebase. The closest thing is the `distance_km` computed for urgent gig matching — a straight-line distance, not a market viability score.

---

### 3.3 Discovery radius on music/creator profiles — missing

`user_availability.max_radius_km` exists for urgent gig providers. But artist profiles have no equivalent "discovery radius" that would affect which listeners or fans are included in their reach. The spec proposes defaulting this based on viability (rural artist → 100km radius; London artist → 25km).

No `discovery_radius` column exists on `profiles`. This concept does not exist in the current system.

---

### 3.4 Genre-location affinity matrix — no aggregation layer

Individual creators can see their own fan demographics. But there is no platform-level aggregation query that produces "in Manchester, gospel music has engagement score X based on all listener behaviour in that region."

Building this requires:
- A background job that aggregates fan engagement data by `(genre, city/region)` across all creators
- A cached result table (e.g. `genre_location_affinity`) that the recommendation engine reads from
- Privacy-safe aggregation (minimum cohort sizes, no individual-level data)

---

### 3.5 ML models — no infrastructure

The spec requires five ML models:
1. Location Viability Scoring (Gradient Boosting)
2. Event Attendance Prediction (Random Forest / Neural Net)
3. Genre-Location Affinity Matrix (Collaborative Filtering)
4. Market Trend Detection (ARIMA / Prophet / LSTM)
5. Diaspora Match Scoring (Classification / NLP)

There is zero ML infrastructure in the current codebase. No model training, serving, or inference endpoints exist. This is the single largest gap and the single largest investment required.

---

### 3.6 Alert engine — no proactive notification system for market intelligence

The notification system (`NotificationService`) exists and is mature (push tokens, preferences, DND, etc.). But it is entirely reactive — it fires in response to user actions (gig accepted, project completed, etc.).

The spec's Feature 5 requires a proactive alert system driven by background analysis:
- Weekly trend jobs that detect `>20% shifts` in any location/genre metric
- Alert classification (growing market, competition warning, economic shift)
- Personalised alert routing ("this alert is relevant to artists in your genre/location")

None of this background analysis infrastructure exists.

---

### 3.7 Diaspora matching — no concept of origin country vs diaspora country

Profiles have a `country` field. But there is no concept of "origin culture" vs "current country" that would power diaspora matching. The spec needs:
- An artist's "cultural origin" (e.g., Nigeria) separate from their current country
- Diaspora population data by region (external data source)
- A match score between artist origin culture and diaspora community size/engagement

---

### 3.8 "What-if" scenario modeling — no simulation capability

The spec shows relocation impact calculators and scenario tables comparing cities. This requires:
- The genre-location affinity matrix (above)
- Historical earnings benchmarks by `(genre, city)` from platform data
- A UI that lets artists specify a hypothetical location and returns projected outcomes

None of this exists.

---

## 4. Key inferences and observations

### 4.1 The fan demographics endpoint is the most underutilised asset

`CreatorRevenueService.getFanDemographics()` already produces `{ city, country, fanCount, totalSpent, engagementScore }` per creator. This is being shown only to individual creators about their own fans.

If this data were aggregated (anonymously, with cohort minimums for privacy) across all creators grouped by genre, it would produce a "genre audience density map by city" — which is the heart of the entire Location Intelligence spec — **without collecting any new data**.

This is the highest-leverage starting point for Phase 1.

---

### 4.2 The urgent gig radius system is a prototype for the broader spec

The `user_availability` table already implements:
- `max_radius_km` — user-configurable search radius
- `general_area` / `general_area_lat/lng` — approximate location without GPS
- `current_lat/lng` — precise GPS when available

The spec's Smart Discovery Radius (Feature 1) is conceptually identical to this — but applied to music/content discovery instead of gig matching. The data model and UX pattern are already proven. The new work is the **viability algorithm** that sets intelligent defaults, not the radius mechanism itself.

---

### 4.3 Event attendance data will be sparse initially

Model 2 (Event Attendance Prediction) trains on historical SoundBridge events with actual attendance numbers. Early in the platform's life, this data will be too sparse to produce confident predictions.

The spec correctly identifies this as a cold-start risk. The mitigation is to use genre-level benchmarks and bootstrap from external data (Eventbrite scraping — Phase 6) until internal data is sufficient.

---

### 4.4 The financial data structure already supports per-location revenue analysis

Every financial transaction in the system links to a `user_id`, which links to a `profiles.city/country`. This means, with appropriate queries, the platform already has the raw data to answer:
- "In which cities do fans spend the most on tips?"
- "In which cities do paid content conversion rates differ?"
- "What is the average ticket price paid by fans in Birmingham vs London?"

This analysis doesn't require new data collection — only new aggregation queries and a dashboard to display them.

---

### 4.5 The spec's Phase 1 is achievable with only internal data

Phase 1 (Foundation) explicitly requires no external APIs. Based on the codebase audit, the following are already available:
- Creator location (`profiles.city`, `profiles.country`)
- Genre per creator (`profiles.genres[]`)
- Fan demographics by city (`getFanDemographics()`)
- Event attendance data (`events.current_attendees`, `max_attendees`)
- Tip/revenue data with user links
- Subscription tier by user + location

A Phase 1 "location health score" using only this data is feasible without any new data collection infrastructure. The work is entirely in the aggregation queries and scoring algorithm.

---

### 4.6 The diaspora feature is the furthest from ready

Diaspora matching requires:
1. An "origin culture" field on profiles (doesn't exist)
2. Diaspora population data by region (no external data integration)
3. A match score algorithm (no ML infrastructure)
4. UI for diaspora settings and analytics (not started)

This is cleanly a Phase 5 item as specified. Nothing currently accelerates it.

---

## 5. What needs to be built, in order of readiness

| # | Component | Data ready? | Infrastructure ready? | Effort |
|---|-----------|------------|----------------------|--------|
| 1 | Fan demographics aggregation (genre × city) | ✅ | Needs query layer | Low |
| 2 | Location health score (internal data only) | ✅ | Needs algorithm + background job | Medium |
| 3 | Smart discovery radius UI + defaults | ✅ Partial | Needs profile column + viability formula | Medium |
| 4 | Alternative location suggestions (basic) | ✅ Partial | Needs comparison query | Medium |
| 5 | ONS / Census API integration | ❌ | Needs data pipeline + caching | Medium |
| 6 | Economic intelligence dashboard (with external data) | ❌ | Needs #5 first | Medium |
| 7 | Event attendance prediction model | ⚠️ Sparse | Needs ML infrastructure | High |
| 8 | Market trend detection + alerts | ✅ Partial | Needs time-series jobs + alert engine | High |
| 9 | Genre-location affinity matrix (full ML) | ⚠️ Partial | Needs ML infrastructure | High |
| 10 | Relocation / what-if scenario modeling | ❌ | Needs #7, #9 first | High |
| 11 | Diaspora matching | ❌ | Needs new profile fields + external data | Very High |
| 12 | Web scraping (Eventbrite, Ticketmaster) | ❌ | Needs scraping infrastructure + legal review | Very High |

---

## 6. New database columns/tables required (inference only, not implementing)

Based on the gap analysis, the following schema additions would be needed:

**New column on `profiles`:**
- `discovery_radius_km` integer — artist's music discovery reach
- `cultural_origin` text — for diaspora matching (e.g., "Nigeria")
- `diaspora_matching_enabled` boolean

**New table: `genre_location_index`** (aggregated, privacy-safe)
```
genre text
city text
country text
estimated_fan_count integer
avg_engagement_score decimal
avg_spend_per_fan decimal
avg_ticket_price decimal
competition_level integer  -- count of artists in this genre+city
last_calculated_at timestamptz
```

**New table: `location_viability_cache`**
```
location_key text  -- city:country composite
population integer
avg_income decimal
entertainment_spend_index decimal
calculated_at timestamptz
data_source text   -- 'internal' | 'ons' | 'census'
```

**New table: `market_intelligence_alerts`**
```
user_id uuid
alert_type text  -- 'growing_market' | 'competition_warning' | 'economic_shift'
location text
genre text
message text
metric_change decimal
dismissed boolean
created_at timestamptz
```

---

## 7. Summary verdict

The SoundBridge platform is **better positioned to build this spec than the spec assumes**. Several key data points the spec treats as requiring new collection (fan demographics by city, tip amounts by location, event attendance data, genre per creator) are already being captured and stored.

The real gaps are:
1. **Aggregation** — existing data is per-creator; needs to be aggregated platform-wide by genre+location
2. **External economic data** — ONS/Census not integrated
3. **ML infrastructure** — none exists; needed for predictive features
4. **New profile fields** — discovery radius and cultural origin
5. **Background jobs** — weekly market analysis + alert engine

Phase 1 of the spec (internal data only, viability scoring, smart radius) can be started with the existing data model and no new external dependencies. Phases 3–5 require ML infrastructure that is a significant engineering investment.

---

*This document is inference only. No code has been written or modified.*
