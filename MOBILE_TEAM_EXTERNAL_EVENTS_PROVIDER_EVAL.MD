# Mobile Team — External Events Provider Evaluation

**Status:** Songkick partnership pending (~30 working days). Backend infra is ready
(table, claim API, RPC, Edge Function shape). Blocked only on a licensed key.

**Evaluation goal:** Shortlist 1–3 providers that can back the same Discover
"external events" UX while we wait.

---

## Shortlist

### 1. Ticketmaster Discovery API ⭐ Best data quality

**Docs:** https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/  
**Pricing:** Free API key on registration. No per-call cost on standard tier.  
**Rate limits:** 5 req/s, 5,000 req/day (standard). Increase available on request.  
**UK coverage:** Excellent. 230 k+ events globally, dedicated UK/IE catalogue,
covers Ticketmaster, Universe, and affiliated resellers — the biggest venue-by-venue
footprint of any provider evaluated.

**Caching & redistribution (important):**  
Standard ToS says "cannot cache or store Event Content other than for reasonable
periods to provide the service." Our 6-hour sync → `external_events` table model
sits in a grey area. Showing events from `external_events` in our app is display
use, not API resale — defensible, but not risk-free at scale. For a fully
commercial launch, a **Partner API agreement** is recommended; Ticketmaster runs a
formal partner programme. Apply at:
https://developer.ticketmaster.com/support/partner/

**Field mapping to `external_events`:**

| `external_events` column | Ticketmaster field |
|--------------------------|-------------------|
| `event_external_id`      | `id` (string, stable) |
| `title`                  | `name` |
| `artist_name`            | `_embedded.attractions[0].name` |
| `venue_name`             | `_embedded.venues[0].name` |
| `venue_address`          | `_embedded.venues[0].address.line1` |
| `city`                   | `_embedded.venues[0].city.name` |
| `country`                | `_embedded.venues[0].country.countryCode` |
| `latitude`               | `_embedded.venues[0].location.latitude` |
| `longitude`              | `_embedded.venues[0].location.longitude` |
| `genre`                  | `classifications[0].genre.name` → map to SoundBridge category |
| `event_date`             | `dates.start.dateTime` (ISO 8601) |
| `ticket_url`             | `url` (Ticketmaster event page) |
| `image_url`              | `images[0].url` (16:9 ratio preferred) |
| `source`                 | `'ticketmaster'` |

**Genre mapping note:** Ticketmaster classifies events with `segment → genre →
subGenre`. Segment "Music" + genre "Rock", "Hip-Hop", "Gospel", etc. map
directly to SoundBridge categories using the same mapping table in
`WEB_TEAM_EXTERNAL_EVENTS.md` (just change key names).

**Sample API call (London music events, next 90 days):**
```
GET https://app.ticketmaster.com/discovery/v2/events.json
    ?apikey={TM_API_KEY}
    &classificationSegmentId=KZFzniwnSyZfZ7v7nJ   // Music segment
    &countryCode=GB
    &city=London
    &startDateTime={today}T00:00:00Z
    &endDateTime={today+90d}T23:59:59Z
    &size=50
    &page=0
```

**Verdict:** Best field completeness and largest catalogue. Use as primary if a
Partner agreement is granted quickly, or treat as standard-tier display use with
attribution and short cache TTL while awaiting partnership.

---

### 2. Skiddle ⭐ Best UK-only music fit

**Docs:** https://www.skiddle.com/api/ | https://github.com/Skiddle/web-api/wiki/Events-API  
**Apply for key:** https://www.skiddle.com/api/join.php (free)  
**Pricing:** Free API key. Higher rate limits on request / partner basis.  
**Rate limits:** Undocumented publicly; contact Skiddle. Free tier has daily
and hourly caps.  
**UK coverage:** Outstanding. UK-only platform. 41,000+ venues, 73,000+ event
organisers, 4M+ monthly visitors. Covers gigs, festivals, club nights — exactly
the SoundBridge audience.

**Caching & redistribution:**  
ToS is not publicly detailed. **Must contact Skiddle before using in production:**
https://www.skiddle.com/contact/  
Ask specifically: "Can we cache your API responses server-side (up to 6 hours)
and display events in our consumer mobile app with attribution and outbound
ticket links?" They are a commercial ticketing partner; partner agreements are
common and the business model aligns well (we drive ticket clicks).

**Field mapping to `external_events`:**

| `external_events` column | Skiddle field |
|--------------------------|--------------|
| `event_external_id`      | `id` |
| `title`                  | `eventname` |
| `artist_name`            | `artists[0].artistname` (with `description=1`) |
| `venue_name`             | `venue.name` |
| `venue_address`          | `venue.address` |
| `city`                   | `venue.town` |
| `country`                | `'GB'` (hardcoded — UK only) |
| `latitude`               | `venue.latitude` |
| `longitude`              | `venue.longitude` |
| `genre`                  | `EventCode` → map to SoundBridge category (see below) |
| `event_date`             | `startdate` (ISO date) + `starttime` |
| `ticket_url`             | `link` (Skiddle listing URL) |
| `image_url`              | `imageurl` |
| `source`                 | `'skiddle'` |

**Skiddle EventCode → SoundBridge category mapping:**

| Skiddle EventCode | SoundBridge category |
|-------------------|---------------------|
| `LIVE` | Music Concert |
| `CLUB` | Music Concert |
| `FEST` | Festival |
| `COMEDY` | Comedy Night |
| `JAZZ` | Jazz Room |
| `GOSPEL` | Gospel Concert |
| `CLASS` | Instrumental |
| `KARAOKE` | Music Karaoke |

**Sample API call (London live music, next 90 days):**
```
GET https://www.skiddle.com/api/v1/events/search/
    ?api_key={SKIDDLE_API_KEY}
    &latitude=51.5074
    &longitude=-0.1278
    &radius=20
    &eventcode=LIVE
    &minDate={today}
    &maxDate={today+90d}
    &limit=50
    &description=1
```

**Verdict:** Best UK music fit. Free key, geo-radius search built-in (saves
PostGIS work in the Edge Function), image URLs included. Blocked only on ToS
confirmation. **Recommended to contact Skiddle this week** — if they confirm
commercial mobile caching rights, this becomes the clear primary.

---

### 3. Bandsintown (for artist-anchored discovery)

**Docs:** https://help.artists.bandsintown.com/en/articles/9186477-api-documentation  
**ToS:** https://corp.bandsintown.com/data-applications-terms  
**Pricing:** Free tier with generous rate limits (exact limits not public).  
**Rate limits:** Undocumented; described as "generous" in docs.  
**UK coverage:** Global including UK. Stronger for touring artists than
venue-based local discovery.

**Caching & redistribution — most permissive of all evaluated:**  
ToS explicitly states:
- "You may employ **session-based caching** of Bandsintown API results, provided
  you notify Bandsintown and update cached results upon metadata changes."
- "Content may be **used, displayed and re-distributed to end users** of your
  website(s), software and mobile applications."

This is the cleanest legal position of any provider here.

**Limitation:** The API is **artist-lookup** not **event-discovery**. You query
`/artists/{artist_name}/events` — you need a list of artist names first, not a
location/date search. Not a drop-in replacement for Songkick-style metro
browsing. **Usable as a supplementary layer** (e.g. events for artists the user
follows on SoundBridge) but not as a general nearby-events feed.

**Field mapping to `external_events`:**

| `external_events` column | Bandsintown field |
|--------------------------|------------------|
| `event_external_id`      | `id` |
| `title`                  | `description` (or construct from artist + venue) |
| `artist_name`            | artist name (from query context) |
| `venue_name`             | `venue.name` |
| `venue_address`          | `venue.street_address` |
| `city`                   | `venue.city` |
| `country`                | `venue.country` |
| `latitude`               | `venue.latitude` |
| `longitude`              | `venue.longitude` |
| `genre`                  | derive from artist genre (separate artist lookup) |
| `event_date`             | `datetime` (ISO 8601) |
| `ticket_url`             | `offers[0].url` |
| `image_url`              | not returned in event object |
| `source`                 | `'bandsintown'` |

**Verdict:** Clearest ToS for caching/redistribution, free, good fields. Ruled
out as a **general metro feed** due to artist-first API design. Strong candidate
as a **supplementary layer** for SoundBridge creators' touring events.

---

## Providers Ruled Out

| Provider | Reason |
|----------|--------|
| **PredictHQ** | ToS explicitly prohibits caching on free/trial tier. Paid plans required for any commercial use. B2B analytics tool, not a consumer events feed. |
| **Eventbrite** | API pricing undocumented (requires sales contact), limited artist name fields, ToS requires all event links to be `nofollow`-free crawlable — awkward for mobile. Better for self-serve community events than live music discovery. |

---

## Recommendation

| Priority | Provider | Action |
|----------|----------|--------|
| **1 — Contact immediately** | **Skiddle** | Email partner enquiry this week. If they confirm commercial mobile caching rights, make this the primary sync source. UK-only is a feature, not a bug, for our initial London/Manchester/Birmingham launch. |
| **2 — Use now (display tier)** | **Ticketmaster** | Register for a free API key and wire up a second Edge Function (`sync-ticketmaster-events`) using the field map above. Display-use caching for 6 hours is defensible while a formal Partner application is processed. Provides the largest event catalogue and best image coverage. |
| **3 — Supplementary only** | **Bandsintown** | Integrate later as a layer for events by artists users already follow on SoundBridge. Not a geo-browse feed. |

**If Songkick responds within 30 days:** Songkick remains primary. The sync
function was built for Songkick's shape. Other providers run as `source =
'ticketmaster'` / `source = 'skiddle'` in `external_events` alongside
`source = 'songkick'` — no mobile changes required.

**Immediate next step for web team:** The sync Edge Function only needs
`event_external_id` stability and the field map above to add a second provider.
A new `sync-ticketmaster-events` function can run in parallel with
`sync-songkick-events` without any schema changes.

---

*Last updated: 2026-05-09*  
*Evaluated by: mobile/product team*
