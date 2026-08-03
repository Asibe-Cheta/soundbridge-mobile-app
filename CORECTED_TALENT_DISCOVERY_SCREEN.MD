FULL CURSOR PROMPT — Corrected Talent Discovery Screen (Categories, UI, and Data)
Important — this corrects a previous implementation. Read this fully before making changes. The previous version of this screen had three problems: it did not reuse the exact existing Discover screen card/row components, it used an incomplete and conceptually inconsistent category list, and it returned empty results because no data field exists to categorise creators. This prompt fixes all three together.
Part 1: Exact component reuse
Locate the exact card component and horizontal-scrolling row component currently used on the main Discover screen. Import and reuse these exact same components for the Talent Discovery screen, do not build new or similar components. Styling, dimensions, and scroll behaviour must be identical to the existing Discover screen.
Part 2: Explicit category structure
Build the category selection screen with exactly these 5 top-level categories, as horizontal-scrolling rows:
Musicians & Singers — tapping leads to a genre sub-screen (see list below)
DJs — flat category, no sub-screen
Podcasters — flat category, no sub-screen
Audio Engineers & Producers — flat category, no sub-screen
Session Musicians & Instrumentalists — flat category (or optionally with its own sub-screen for guitarist, bassist, drummer, keyboardist, backup vocalist, vocal coach, etc., only if existing data supports these distinctions, otherwise keep flat)
When "Musicians & Singers" is tapped, show a genre sub-screen with these options, reusing existing genre taxonomy values from elsewhere in the app rather than a new hardcoded list where existing values are available: Afrobeats, Hip Hop, R&B, Neo Soul, Gospel, Opera, Reggae/Dancehall, Amapiano, Highlife, Jazz, Pop, Alternative/Indie, Folk/Acoustic, Classical, plus any additional genres already present in existing data.
After any category or genre selection, show the results screen: a 2-column card grid using the exact existing Discover screen card component, with a sort/filter bar ("Nearest," "Most Followed," "Recently Active") at the top, and a clear call to action on each card leading to the creator's profile.
Part 3: Populate the categories with real data
Add a talent_categories field to the creator profile data model, supporting multiple values per creator.
Run a one-time backfill for existing creators, inferring categories from existing signals:
Podcast content uploaded → assign "Podcasters"
Mixtape content uploaded → assign "DJs"
Sound Academy institutional badge present → assign "Audio Engineers & Producers"
Apply this inference logic automatically going forward for new uploads and badge assignments too, not just as a one-time backfill
Build a one-time modal, shown once on next app launch, asking users to self-identify: "Help us improve your experience, are you a musician, podcaster, DJ, audio engineer, or something else? Select all that apply." Present as multi-select checkboxes covering all categories and sub-categories listed in Part 2, plus a "None of the above" option. Store selections in the same talent_categories field, merged with (not overwriting) inferred categories. Self-identified categories should be treated as authoritative for that user going forward. Track a flag so this modal only appears once per user.
Scope boundaries:
Genre and category values used must be sourced from existing taxonomy wherever it already exists in the codebase, do not create parallel, duplicate lists
Entry points remain as previously built: the "Discover Talent" banner for event organisers, and the equivalent banner for industry professionals
General rules:
Follow existing code style, component structure, and data model conventions throughout
Ensure the backfill process is efficient for the current user base size