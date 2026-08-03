FULL CURSOR PROMPT — Talent Discovery Screen for Event Organisers and Industry Professionals

Important — check existing code first: Before building anything, inspect the existing "Discover Talent" banner and its current destination (the generic Discover/Explore screen), the existing Discover screen's card and row components, and the existing role/permission system distinguishing event organisers, industry professionals, creators, and Audio Lovers. Reuse existing card, row, and navigation patterns exactly.

What to build:
A new, dedicated Talent Discovery screen, replacing the current behaviour where "Discover Talent" routes to the generic Discover/Explore screen. This screen should be accessible to both event organisers and industry professionals, not event organisers alone.
Part A, category selection screen:
Build a screen organised as horizontal-scrolling rows, matching the existing Discover screen's row pattern. Rows organised by professional role first, genre second:
Musicians & Singers (horizontal scroll of genre sub-categories: R&B, Soul, Gospel, Afrobeats, etc., pull actual genre values from existing genre/category data rather than hardcoding a fixed list)
Audio Engineers & Producers
DJs
Podcasters
Session Musicians / Instrumentalists (if this exists as a distinct category in the current data model, if not, omit this row rather than inventing a new category as part of this prompt)
Part B, category results screen:
After tapping a specific category or genre, show matching creators in a 2-column card grid, reusing the existing Discover screen's creator card component (photo, name, bio snippet, one metric). Include a sort/filter bar at the top (e.g. "Nearest," "Most Followed," "Recently Active"), reusing existing filter logic where available. Each card must have a clear call to action (tappable card or icon) leading to the creator's full profile.
Role-based entry point:
For event organisers, this screen remains accessible via the existing "Discover Talent" banner on their feed screen (per Item 14).
For industry professionals, add an equivalent entry point on their feed screen. Since industry professionals don't currently have a distinct feed screen experience, add a simple banner (reusing the same banner component and styling as the event organiser banners) labelled "Discover Talent" or "Find Collaborators," positioned on their feed screen, routing to this same Talent Discovery screen.
Scope boundaries:
This is one shared screen serving two user roles, do not build two separate versions of this screen
Do not add the ethnic/cultural categorisation extension discussed elsewhere, that remains separate, future work
If industry professionals currently have no distinct banner section on their feed screen at all, add only the single "Discover Talent" banner described above as part of this prompt, do not build a full industry-professional feed redesign here, that remains open and undecided beyond this specific entry point
General rules:
Follow existing code style, card/row component structure, and navigation patterns throughout
Ensure both entry points (event organiser and industry professional) lead to the identical shared screen, not duplicated logic