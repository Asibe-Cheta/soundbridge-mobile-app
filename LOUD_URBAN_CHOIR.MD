**FULL CURSOR PROMPT — Loud Urban Choir Profile Preview (in-app, admin-only)**

---

**Important — check existing code first:** Before building anything, locate the existing creator profile screen component (the one with cover photo, circular avatar, stats row, tagline, and Drops/Tracks/Albums/Portfolio/About tabs). Reuse that exact component and its existing styling. Do not rebuild the UI from scratch or introduce new styling.

**What to build:**

A new screen, accessible only via a button on the profile screen, visible only when the logged-in user's email matches `asibechetachukwu@gmail.com`. Do not show this button to any other user.

Button label: "Preview: Loud Urban Choir"

Tapping it navigates to the existing creator profile screen component, rendered with the hardcoded mock data below instead of the logged-in user's real data. This is a preview/demo render only, not saved to the database, not accessible via any public URL or username.

**Mock data to pass into the existing profile component:**

- Profile photo: `loud-profile-pic.jpg`
- Cover photo: `loud-cover-photo.jpg`
- Name: Loud Urban Choir
- Verified badge: true
- Handle: @loudurbanchoir
- Location: Lagos, Nigeria
- Followers: 193K (Instagram)
- Following: 12
- Tracks: 2
- Events: 3
- Rating: New (no reviews yet)

**Bio/tagline text (the line directly under the name, matching the "Founder and CEO of SoundBridge Live" position in the reference profile):**
"Official page of Loud Urban Choir"

**Role/category line (matching the "Singer | Vocal Coach | United Kingdom" position, below the stats row):**
"Contemporary Choir | Afro-Fusion | Lagos, Nigeria"

**About tab content:**
"An alliance of individually talented and uniquely gifted, established artists with the mutual aim of creating contemporary choral music experiences that highlight and celebrate our rich, diverse roots. Our mission is to transcend musical boundaries, creating immersive experiences for audiences. The vision is to be a global force in genre-blending music, driven by creativity and innovation. Core values such as authenticity, collaboration, and artistic expression form the foundation of LUC's identity."

**Tracks tab content:**
1. "RISE" — cover art `loud-rise-cover.jpg` — Released Oct 2025
2. "Somewhere" — cover art `loud-somewhere-cover.jpg` — debut single

**Portfolio tab content:**
Grid of member spotlight images: `loud-member-1.jpg`, `loud-member-2.jpg`, `loud-member-3.jpg`, each labelled with the member's stage name as an overlay (e.g. "Shimmer", "Angelika Belle", "SpiritVibes").

**Drops tab content:**
One drop entry: profile thumbnail, "Loud Urban Choir · You", text "Official page of Loud Urban Choir", timestamp "5d ago".

**General rules:**
- Do not create a real user account, database row, or public profile for Loud Urban Choir
- This screen must not appear anywhere in navigation for any other user
- No backend calls needed, all data is hardcoded for this preview screen only
- Reuse existing profile component styling exactly, no new CSS or design tokens

