FULL CURSOR PROMPT — Institutional Partner Badges

Important — check existing code first: Before building anything, inspect the existing creator profile card component, artist card component (Discover screen), and any existing verification/badge system (e.g. the verified checkmark badge shown on profiles). Reuse existing badge display patterns, positioning, and styling conventions rather than introducing a new visual system. Match existing schema and naming conventions for how creator attributes are currently stored and displayed.
What to build:
Add support for displaying an institutional partner badge on a creator's profile and on their artist card wherever it appears (Discover screen, search results, or any other card-based listing of creators).
Schema:
Add a field to the existing creator/user profile table to store institutional affiliation, following existing naming conventions (e.g. something like institution_badge or partner_institution, matched to whatever pattern already exists for similar fields). This should support at minimum two initial values:

Abbey Road Institute
Sound Academy

Store this as an identifier/enum rather than free text, so badge assets can be reliably matched to the correct institution.
Badge assets:
Two badge image files will be provided:

abb-badge — Abbey Road Institute badge
sa-2.png — Sound Academy badge

Store these in the existing image/asset storage pattern used for other platform badges or icons (e.g. alongside the existing verified badge asset), and reference them by the institution identifier stored on the creator's profile.
Display logic:

If a creator has an institution value set, display the corresponding badge icon on:

Their full profile screen, positioned near the existing verified badge/name area
Their artist card / creator card wherever it appears on the Discover screen or in search/listing results


If no institution is set, display nothing extra, no placeholder or empty badge slot
A creator should only be able to have one institutional badge at a time for this initial version (not multiple simultaneous badges)

Admin assignment:
For this initial version, institutional badge assignment should be admin-controlled, not self-declared by the creator, to prevent false claims of institutional affiliation. If an existing admin/internal tool exists for managing creator profiles, add the institution field there. If no such admin tool exists, flag this back rather than building a new admin interface from scratch, and default to a database-level assignment process for now (i.e. admin sets the value directly, no UI required for this first version).
General rules:

Do not modify the existing verified badge system, this is a separate, additional badge type
Follow existing code style, component structure, and naming conventions throughout
Badge icons should render cleanly at the existing card/profile image sizes already used in the app, don't introduce new sizing conventions

