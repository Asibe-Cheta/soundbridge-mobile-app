Exactly right, and this is a sharper, more accurate way to think about it than the number I gave. You've identified the real variable correctly: **it's not total platform users that matters, it's density per specific location.** 100,000 users concentrated overwhelmingly in Lagos does nothing for someone opening Discover in Manchester, or in a smaller Nigerian city outside the main hubs. A single global total number was always the wrong threshold to use, thank you for catching that.

**Given this, here's the more honest, correct approach to Item 1, worth building now with the right design, rather than waiting for an arbitrary total that may never actually solve the problem:**

The fallback-aware version I suggested becomes even more important given your point, not a temporary workaround until some future number is hit, but the permanent, correct design, since some locations may always be thinner than others, that's just the reality of a global platform. The system should always gracefully degrade: strict proximity first, then widen to city or region level, then genre-matched regardless of distance, then general popularity, rather than ever showing an empty or sparse result.

**Revised prompt reflecting this corrected understanding:**

**FULL CURSOR PROMPT — Location-Aware Discovery Cards, With Density Fallback**

---

**Important — check existing code first:** Before building anything, inspect the existing Discover screen, existing genre and location matching logic (already used for event promotion), and existing creator/music card components. Reuse existing card component styling and matching infrastructure rather than building new, separate systems.

**What to build:**

Add proximity display and a graceful fallback system to Discover screen creator/music cards, so cards remain useful and populated regardless of how many creators exist in a specific user's immediate area.

**Matching logic, in priority order:**

1. **Tier 1, strict proximity:** If enough creators exist within a close radius of the viewing user (define a reasonable initial radius, e.g. 25km, adjustable later), show these first, with distance displayed on the card (e.g. "3km away").
2. **Tier 2, city or regional level:** If Tier 1 doesn't return enough results to populate the screen meaningfully (define a minimum threshold, e.g. at least 5-10 cards), widen the search to city or regional level, without necessarily displaying exact distance if it's no longer meaningfully local.
3. **Tier 3, genre-matched regardless of distance:** If Tier 2 still doesn't return enough results, fall back to genre-matched creators regardless of location, no distance shown.
4. **Tier 4, general/popular:** If genre matching also doesn't return enough results (e.g. a very niche genre with few creators anywhere), fall back to generally popular or recently active creators on the platform.

**Card display:**

- Only show a distance/proximity indicator on a card when the creator was actually matched via Tier 1 (true local proximity). Do not show a fabricated or misleading distance for creators surfaced via Tiers 2 to 4.
- Add a small bio snippet and one additional metric to each card, reusing existing card layout patterns, consistent with prior scoping (bio snippet plus one metric, not multiple new data points).
- Refresh location-based results on pull-to-refresh or app foreground, not continuous background polling, for performance reasons.

**Scope boundaries:**

- This prompt does not include the ethnic/cultural music categorization extension discussed separately, that remains a distinct, separate future idea, not part of this build.
- Thresholds (radius size, minimum card count per tier) should be configurable values, not hardcoded permanently, since these will likely need tuning as user density changes over time and varies by country.

**General rules:**

- Follow existing code style, matching logic patterns, and card component structure throughout
- Ensure the fallback logic is efficient and doesn't require excessive querying, reuse existing genre and location matching infrastructure wherever possible rather than building parallel logic
