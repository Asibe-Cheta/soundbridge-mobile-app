# Abbey Road Institute — Web Team Handoff

**Date:** 2026-07-06  
**Feature branch:** main (commit `94059e1b`)  
**Mobile status:** Complete and live on production OTA `dbc474f5`  
**Web work required:** Feed carousel · Pro Resources tab · Admin dashboard entry · Deep link route

---

## What the mobile app already did

The following is fully implemented on mobile and live in production. The web team must reach parity on every item below.

- Feed screen: Sound Academy banner converted to an auto-rotating swipeable carousel containing both the SA and ARI banners
- Pro Resources screen: new "Abbey Road" tab (second tab, between Sound Academy and Talk 2 Dan)
- Deep link `soundbridge://join/abbeyroad` routed to a signup screen that grants 1-year institutional Premium
- `ari_` analytics prefix wired into `partner_resource_clicks` and `pro_resource_events` tables
- Placeholder logo at `assets/ari.png` — swap one path when the real asset arrives

---

## 1. Feed Page Carousel

### Current state
The web feed page shows the Sound Academy banner as a static block below the Live Audio banner. This is the exact same pattern as mobile before this change.

### Required change
Convert that static SA block into a horizontally swipeable auto-rotating carousel containing two slides:

**Slide 0 — Sound Academy** (existing content, unchanged)  
**Slide 1 — Abbey Road Institute** (new slide, spec below)

### Carousel behaviour
- Auto-advances every **3 seconds**
- Manual swipe (touch) and click-drag (desktop) supported
- Pagination dots below the carousel — 2 dots, active dot is wider/brighter
- Manual interaction resets the 3-second auto-rotation timer
- Live Audio banner above is **not part of the carousel** and must remain completely unchanged

### ARI slide content
```
Background gradient:  #1C0A0A → #2A1010 → #1C0808  (dark red, same angle as SA)
Accent overlay:       rgba(220,38,38,0.18) → transparent → rgba(153,27,27,0.12)
Logo:                 assets/ari.png placeholder (see §5 for swap instructions)
Partner badge:        "EDUCATION PARTNER"  |  dot colour #FCA5A5  |  badge bg rgba(220,38,38,0.2)  |  border rgba(220,38,38,0.4)
Headline:             "Train at Abbey Road"
Subheadline:          "Pro audio engineering in a world-famous studio.  Avid certified · Weekend & intensive programmes."
CTA button:           "Explore Programmes"  →  navigates to Pro Resources, Abbey Road tab
Footer:               "Official SoundBridge Education Partner"  +  SoundBridge logo (same lockup used in SA footer)
```

### Error handling
If either slide's image fails to load, show the text content over the gradient background only — do not break or hide the carousel.

---

## 2. Pro Resources Page — Abbey Road Tab

### Current state
Pro Resources has tabs: Sound Academy · Talk 2 Dan · Herts Uni · MBG Sonics

### Required change
Insert **Abbey Road** as the second tab, between Sound Academy and Talk 2 Dan.

Final tab order: Sound Academy · **Abbey Road Inst.** · Talk 2 Dan · Herts Uni · MBG Sonics

### Tab structure
Replicate the Sound Academy tab structure exactly. Replace only the content that is specific to ARI.

#### Partner badge row
```
Logo:    assets/ari.png
Badge:   "EDUCATION PARTNER · UK"
Colour:  dot #FCA5A5 · badge bg rgba(220,38,38,0.15) · border rgba(220,38,38,0.35) · text #FCA5A5
```

#### Section header
```
Title:  "Courses & Programmes"
Meta:   "4 days to 1 year · Abbey Road & Angel Studios · Grammy-winning faculty"
```

#### Course cards (horizontal scroll, same 280×380 card layout as SA)

**Course 1 — Advanced Diploma in Music Production & Sound Engineering**
```
Subtitle:    Full-Time · 1 Year
Description: Train at one of London's most iconic institutions. Master every stage of professional
             production — from signal chain and tracking to mixing, mastering and client management.
Gradient:    #DC2626 → #7F1D1D
Units:       4
Award:       Advanced Diploma
CTA URL:     https://abbeyroadinstitute.co.uk/category/events/#apply-now
```

**Course 2 — Song Production Masterclass**
```
Subtitle:    Intensive · 4 Days
Description: Record and mix a full song at Abbey Road Studios and Angel Studios alongside
             Grammy-winning engineer Ben Baptie (Lady Gaga, Radiohead, U2).
Gradient:    #991B1B → #DC2626
Units:       4
Award:       Certificate of Completion
CTA URL:     https://abbeyroadinstitute.co.uk/category/events/#apply-now
```

**Course 3 — Dolby Atmos Mixing For Music**
```
Subtitle:    Part-Time · 12 Weeks
Description: Learn immersive spatial audio mixing in a dedicated Dolby Atmos studio at Angel Studios.
             Led by Grammy-winning engineer James Auwarter.
Gradient:    #7F1D1D → #B91C1C
Units:       3
Award:       Dolby Atmos Certificate
CTA URL:     https://abbeyroadinstitute.co.uk/category/events/#apply-now
```

**Course 4 — Advanced Diploma in Audio Post Production for Film & TV**
```
Subtitle:    Part-Time · 5½ Months
Description: Specialise in professional audio for film and television. Build the practical skills
             and industry contacts to work on screen productions at the highest level.
Gradient:    #B91C1C → #991B1B
Units:       3
Award:       Advanced Diploma
CTA URL:     https://abbeyroadinstitute.co.uk/category/events/#apply-now
```

#### Stats grid (2×2, same layout as SA "By the Numbers")
```
30+       Years of Excellence
Grammy    Award-Winning Faculty
Abbey Road  Iconic Studio Access
Dolby     Atmos Certified
```
Stat value colour: `#DC2626` (red, replaces the purple used for SA)

#### CTA button
```
Label:    "Apply Now"
Icon:     arrow-forward (outline)
Gradient: #DC2626 → #991B1B  (horizontal)
URL:      https://abbeyroadinstitute.co.uk/category/events/#apply-now
Analytics: track('resource_tap', 'ari_apply')
```

#### Analytics tracking
All interactions on this tab must call the analytics service with `ari_` prefixed resource strings. These already resolve to `'Abbey Road Institute'` in `partnerNameFromResource()` on both mobile and the shared service.

```
Screen view:          track('screen_view')         — fires when tab becomes active
Module card tap:      track('resource_tap', 'ari_module_1')  /  'ari_module_2'
CTA button tap:       track('resource_tap', 'ari_enquiry')
```

---

## 3. Admin Dashboard — Institutional Partnerships Tab

### Required change
Add Abbey Road Institute as a new entry in the institutional partnerships tab. Follow the exact same pattern used to add Sound Academy.

### Partner data
```
Partner name:    Abbey Road Institute
Website:         https://abbeyroadinstitute.co.uk
Logo/banner:     assets/ari.png  (placeholder — single path swap for real asset)
Description:     Abbey Road Institute delivers professional audio engineering and music production
                 training inside leading professional studios. Their programmes are taught in small
                 groups focused on real studio workflows and prepare students for Avid Pro Tools
                 certifications.
Instagram:       @abbeyroadinstitute  (Abbey Road Institute London account)
Registration/course link:  https://abbeyroadinstitute.co.uk/courses
Institution identifier:   abbey_road_institute  (must match the value used in grantInstitutionalAccess)
```

### Database
The `institutional_access` table has a free-text `institution` column. The value written when a student registers via the ARI signup flow is `'abbey_road_institute'`. Make sure the admin dashboard filter/view for this partner uses that exact string.

No schema migration is needed — the existing table already supports this value.

---

## 4. Deep Link / Registration Route

### Mobile (already live)
`soundbridge://join/abbeyroad` → `AbbeyRoadSignupScreen`

### Web equivalent required
`https://soundbridge.live/join/abbeyroad` must route to the web signup page with ARI branding (same pattern as `/join/soundacademy`).

The web signup page for ARI should:
- Show ARI branding (dark red theme, ARI logo)
- Call the same `signUp()` flow with `source: 'abbey_road_institute'`
- Call `referralService.grantInstitutionalAccess(userId, 'abbey_road_institute')` on success
- Redirect to dashboard/onboarding after successful registration

This is the **shareable link** for Abbey Road Institute to give to their students: `https://soundbridge.live/join/abbeyroad`

---

## 5. Asset — ARI Logo

**Current placeholder:** `assets/ari.png` — this is a copy of the SA logo used as a stand-in.

**When the real Abbey Road Institute asset arrives**, change the `src` in these locations only:

| Platform | File | Line / variable |
|----------|------|-----------------|
| Mobile   | `assets/ari.png` | Replace the file directly |
| Web feed carousel | wherever you define `ARI_LOGO` | Single `import` or `require` |
| Web Pro Resources | wherever you define `ARI_LOGO` | Same import |
| Web admin dashboard | wherever the partner logo is referenced | Same import |

The mobile code uses a module-level constant `ARI_LOGO = require('../../assets/ari.png')` in both feed screens and `ARI_LOGO = require('../../assets/ari.png')` in ProResourcesScreen. One file replacement propagates everywhere on mobile.

---

## 6. Error Handling Requirements

Both feed carousel and Pro Resources tab must handle failures gracefully:

- If the ARI logo image fails to load → show the gradient background with text content only, no broken image UI
- If the entire ARI tab content errors → catch in an error boundary, show a "Content unavailable" fallback, keep other tabs functional
- The Live Audio banner must remain fully functional regardless of partner content state

---

## 7. Summary Checklist

- [ ] Feed page: convert SA static banner to 2-slide carousel (SA + ARI) with auto-rotation, manual swipe, pagination dots
- [ ] Feed page: ARI slide content and dark red branding
- [ ] Feed page: carousel timer resets on manual interaction
- [ ] Pro Resources: insert Abbey Road tab as second tab
- [ ] Pro Resources: partner badge, section header, module cards, stats grid, red CTA button
- [ ] Pro Resources: `ari_` analytics tracking on all interactions
- [ ] Admin dashboard: ARI partner entry (name, website, logo, description, Instagram, course link)
- [ ] Deep link route: `/join/abbeyroad` → ARI-branded signup page → `abbey_road_institute` institutional grant
- [ ] Error handling: graceful fallbacks on both screens
- [ ] Asset: ARI logo imported from a single path that can be swapped with one change
