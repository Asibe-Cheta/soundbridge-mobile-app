# Pro Resources / SoundAcademy — Web Implementation Spec

This document gives the web team everything needed to replicate the Pro Resources feature exactly as it exists in the SoundBridge mobile app. All data, colours, copy, gradients, navigation behaviour, and component structure are specified below.

---

## 1. Overview

**Pro Resources** is a dedicated educational hub inside SoundBridge that surfaces partnerships with three external organisations:

| Tab | Partner | Status |
|-----|---------|--------|
| Sound Academy | Sound Academy UK (audio engineering courses) | Live |
| Talk 2 Dan | Talk 2 Dan (media industry mentorship & recruitment) | Live |
| Herts Uni | University of Hertfordshire | Coming Soon |

The feature has two surfaces:

1. **`/pro-resources`** — landing page with three tabs (mirrors `ProResourcesScreen`)
2. **`/pro-resources/course/:id`** — course detail page (mirrors `CourseDetailScreen`)

---

## 2. Entry Points (linking into Pro Resources)

### 2.1 Feed Page Banner

A tappable banner card appears **in the feed** below the Live Audio section. It navigates to `/pro-resources` (Sound Academy tab active by default).

#### Visual design

```
┌─────────────────────────────────────────────┐
│ [SA logo 52×52]        [• EDUCATION PARTNER] │  ← top row
│                                               │
│ Level Up Your Sound                           │  ← headline
│ World-class audio engineering & DJ courses.  │
│ Pro Tools certified · 5 countries.           │  ← subheadline
│                                               │
│ [🎓 Explore Courses]                          │  ← pill CTA
│ ─────────────────────────────────────────────│
│ Official SoundBridge Education Partner  [logo]│  ← footer strip
└─────────────────────────────────────────────┘
```

#### Styles

| Property | Value |
|----------|-------|
| Border radius | 20px |
| Border | 1px solid `rgba(139,92,246,0.25)` |
| Padding | 14px top, 16px horizontal, 0px bottom |
| Box shadow | `0 6px 16px rgba(124,58,237,0.3)` |
| Background (layer 1) | LinearGradient `['#1C1235', '#2A1650', '#1C1235']` (135° diagonal) |
| Background (layer 2) | LinearGradient `['rgba(139,92,246,0.18)', 'transparent', 'rgba(88,28,135,0.12)']` (135° diagonal) overlaid on layer 1 |
| Margin | 16px horizontal, 12px top, 4px bottom |

**Top row:**
- SA logo: 52×52px, border-radius 12px, image `sa-2.png`
- Partner badge: `background: rgba(139,92,246,0.2)`, `border: 1px solid rgba(139,92,246,0.4)`, border-radius 20px, padding 4px 10px
  - Dot: 6×6px, border-radius 3px, `background: #A78BFA`
  - Text: `"EDUCATION PARTNER"`, `font-size: 10px`, `font-weight: 700`, `color: #C4B5FD`, `letter-spacing: 0.8px`

**Headline:** `"Level Up Your Sound"`, `font-size: 20px`, `font-weight: 700`, `color: #FFFFFF`, `letter-spacing: 0.1px`, `margin-bottom: 6px`

**Subheadline:** `"World-class audio engineering & DJ courses.\nPro Tools certified · 5 countries."`, `font-size: 13px`, `color: rgba(255,255,255,0.55)`, `line-height: 19px`, `margin-bottom: 14px`

**Pill CTA:**
- Background: `rgba(0,0,0,0.35)`
- Border: `1px solid rgba(255,255,255,0.2)`
- Border-radius: 24px
- Padding: 9px 16px
- Icon: school/graduation cap (left), text `"Explore Courses"`, `font-size: 13px`, `font-weight: 600`, `color: #FFFFFF`
- Width: `fit-content` (align-self: flex-start)
- Margin-bottom: 14px

**Footer strip:**
- Border-top: `1px solid rgba(255,255,255,0.07)`
- Padding: 10px 0
- Two items space-between: text left, SoundBridge logo right
- Footer text: `"Official SoundBridge Education Partner"`, `font-size: 10px`, `color: rgba(255,255,255,0.3)`, `font-weight: 500`
- Footer logo: SoundBridge lock-up logo, height 14px, width 72px, opacity 0.35

---

### 2.2 Discover Page — School Icon (Header)

In the Discover page header (top-right icon cluster), place a graduation-cap icon (`school-outline`) before the notification bell. Tapping navigates to `/pro-resources`.

- Icon size: 24px
- Colour: white (dark mode) / primary text colour (light mode)
- Margin-right: 12px from notification bell

---

## 3. Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/pro-resources` | `ProResourcesPage` | Landing with three tabs |
| `/pro-resources/course/:id` | `CourseDetailPage` | Course detail (id = `sa-m1` or `sa-m2`) |

---

## 4. Pro Resources Page (`/pro-resources`)

### 4.1 Page Header (fixed / sticky)

- Back chevron (top-left) → navigates back
- No explicit page title in the nav bar

### 4.2 Main Header

```
Pro
Resources
Courses, coaching & career tools from our partners
```

| Element | Style |
|---------|-------|
| Title `"Pro\nResources"` | `font-size: 52px`, `font-weight: 300`, `letter-spacing: -1px`, `margin-bottom: 8px` |
| Subtitle | `font-size: 15px`, `letter-spacing: 0.5px`, colour: `textSecondary` |
| Padding | 24px horizontal, 8px top, 24px bottom |

### 4.3 Tab Bar

Three tabs displayed horizontally (overflow scrollable on mobile):

| Tab ID | Label |
|--------|-------|
| `sound-academy` | `Sound Academy` |
| `talk2dan` | `Talk 2 Dan` |
| `herts` | `Herts Uni` |

**Tab styles:**

| State | font-size | font-weight | colour |
|-------|-----------|-------------|--------|
| Active | 28px | 600 | Primary text |
| Inactive | 28px | 400 | `rgba(255,255,255,0.35)` dark / textSecondary light |

- Spacing between tabs: 48px right margin
- Letter-spacing: -0.5px
- Padding: 24px horizontal, 32px bottom, 8px bottom content padding
- Active indicator: animated underline or bold weight change

Default active tab: `sound-academy`

---

## 5. Sound Academy Tab

### 5.1 Partner Badge Row

```
[SA logo]  [• EDUCATION PARTNER · UK]
```

- SA logo: `sa-2.png`, 40×40px, border-radius 10px
- Badge: `background: rgba(139,92,246,0.15)`, `border: 1px solid rgba(139,92,246,0.35)`, border-radius 20px, padding 5px 10px
  - Dot: 6×6, `#A78BFA`
  - Text: `"EDUCATION PARTNER · UK"`, `font-size: 10px`, `font-weight: 700`, `color: #C4B5FD`, `letter-spacing: 0.8px`
- Row padding: 24px horizontal, gap: 12px

### 5.2 Section Header

- Title: `"Sound Engineering"`, `font-size: 18px`, `font-weight: 700`
- Meta text below: `"2-month programme · Weekends · Official Avid Learning Partner"`, `font-size: 13px`, colour: textSecondary, padding 24px horizontal, margin-bottom 16px

### 5.3 Module Cards (horizontal scroll)

Cards are **280×380px**, border-radius 24px, overflow hidden, margin-right 16px.

Each card is tappable and navigates to `/pro-resources/course/:id`.

**Card structure (layers, bottom to top):**
1. Background photo (covers full card, `object-fit: cover`)
2. Colour overlay gradient (diagonal, from `mod.overlayColors`)
3. Bottom vignette: `linear-gradient(transparent, rgba(0,0,0,0.35), rgba(0,0,0,0.82))` covering bottom 60% of card
4. Top-left badge (absolute)
5. Bottom content area (absolute, bottom: 0, padding: 20px)

**Card badge (top-left, absolute):**
- `background: rgba(255,255,255,0.1)`, `border: 1px solid rgba(255,255,255,0.2)`, border-radius 12px, padding 4px 10px
- Text: `"MODULE {N}"`, `font-size: 10px`, `font-weight: 700`, `color: white`, `letter-spacing: 1.2px`
- Position: top 16px, left 16px

**Card content (bottom, absolute):**
- Title: `font-size: 24px`, `font-weight: 700`, `color: white`, `letter-spacing: -0.5px`, `margin-bottom: 4px`
- Subtitle (skill level): `font-size: 14px`, `color: rgba(255,255,255,0.7)`, `margin-bottom: 12px`
- Meta row: list icon + `"{N} units"`, dot separator, ribbon icon + `"{N} cert(s)"` — `font-size: 12px`, `color: rgba(255,255,255,0.4)`

---

#### Module 1 — Fundamentals of Recording & Mixing

| Field | Value |
|-------|-------|
| ID | `sa-m1` |
| Module number | 1 |
| Title | Fundamentals of Recording & Mixing |
| Subtitle | Beginner → Intermediate |
| Description | Master the foundations of professional audio production. Work hands-on with Pro Tools in a real studio — from initial setup through to your first premix. |
| Duration | 1 month |
| Format | Weekends · Sat & Sun · 10am–6pm |
| Background image | `fund.jpg` |
| Overlay gradient | `rgba(232,82,26,0.48)` → `rgba(201,32,117,0.48)` (diagonal) |
| Card gradient (detail hero) | `#E8521A` → `#C92075` |
| CTA label | Book an Appointment |
| CTA URL | `https://calendly.com/soundacademyen/meet-with-sound-academy?back=1&month=2026-05` |

**Certifications:** Avid Pro Tools PT101

**Units (8):**

| # | Title | Topics |
|---|-------|--------|
| 1 | Introduction to DAW & Pro Tools | Overview of DAWs and why Pro Tools; Basics of audio signal: frequency, amplitude, dynamics |
| 2 | Studio Setup & Installation | Connecting and optimising audio equipment; Software settings: latency, buffer, sample rate |
| 3 | Session Management & Project Organisation | Creating and managing Pro Tools sessions & templates; Input/output configuration, routing, and audio buses |
| 4 | Recording Techniques | Microphone selection and placement in the studio; Take management and overdubbing (QuickPunch, Loop Record) |
| 5 | Introduction to Audio Editing | Basic editing tools (cut, trim, fade, grab); Organisation and management of audio clips & playlists |
| 6 | First Steps in Mixing | Signal flow, pre-/post-fader management; Applying initial static balances |
| 7 | MIDI Integration in Pro Tools | Creating MIDI tracks and virtual instruments; Timing management: Ticks vs Samples |
| 8 | Review & Preparation for Premix | Independent work on complete sessions; Balancing & optimisation of the basic mix |

---

#### Module 2 — Advanced Mixing Techniques

| Field | Value |
|-------|-------|
| ID | `sa-m2` |
| Module number | 2 |
| Title | Advanced Mixing Techniques |
| Subtitle | Intermediate → Professional |
| Description | Push into professional mixing, mastering, and Dolby Atmos. Finish with a portfolio-ready final project and your Pro Tools certifications. |
| Duration | 1 month |
| Format | Weekends · Sat & Sun · 10am–6pm |
| Background image | `mix.jpg` |
| Overlay gradient | `rgba(91,33,182,0.52)` → `rgba(201,32,117,0.52)` (diagonal) |
| Card gradient (detail hero) | `#5B21B6` → `#C92075` |
| CTA label | Book an Appointment |
| CTA URL | `https://calendly.com/soundacademyen/meet-with-sound-academy?back=1&month=2026-05` |

**Certifications:** Avid Pro Tools PT101, Avid Pro Tools PT110, Dolby Atmos

**Units (8):**

| # | Title | Topics |
|---|-------|--------|
| 9 | Advanced Mixing | Stereo placement, level management & advanced automation; Advanced equalisation & compression |
| 10 | Advanced Processing & Effects | Mastery of reverb, delay, saturation & spatial effects; Effect automation for greater dynamics |
| 11 | Using VST Plugins | Native vs third-party plugins, CPU optimisation; Parameter automation for a smoother workflow |
| 12 | Professional Mix Organisation | Gain staging, routing & complex track management; CPU optimisation and final project preparation |
| 13 | Advanced Mastering | Normalisation, EQ & compression techniques; Introduction to mastering with iZotope Ozone |
| 14 | Case Studies & Real-World Projects | Applying techniques across different musical styles; Mix correction and refinement |
| 15 | Project Management & Final Export | Exporting for digital, vinyl, and streaming formats; Project documentation and archiving |
| 16 | Certification & Validation of Skills | Comprehensive review before the exam; Preparation for Pro Tools PT101 & PT110 certification |

---

### 5.4 Stats Grid ("By the Numbers")

2×2 grid of stat cards. Section title: `"By the Numbers"`, `font-size: 18px`, `font-weight: 700`, margin-top 32px.

| Value | Label |
|-------|-------|
| 2,000+ | Students Trained |
| 95% | Satisfaction |
| 75% | Employed in 3mo |
| 4.9/5 | 580+ Reviews |

**Stat card styles:**
- Width: `calc(50% - 5px)` (gap 10px between cards)
- Border-radius: 16px
- Border: 1px solid (`rgba(255,255,255,0.08)` dark / theme border light)
- Background: `rgba(255,255,255,0.05)` dark / card colour light
- Padding: 16px
- Align: center
- Value: `font-size: 22px`, `font-weight: 700`, colour: primary (pink `#EC4899`)
- Label: `font-size: 12px`, `font-weight: 500`, colour: textSecondary, text-align center

### 5.5 Sound Academy CTA Button

Gradient button, full width (24px horizontal margin), border-radius 32px, padding 15px.

- Gradient: `linear-gradient(to right, #DC2626, #EC4899)`
- Icon: calendar (left), 18px, white
- Label: `"Book a Free Appointment"`, `font-size: 16px`, `font-weight: 700`, `color: #FFFFFF`
- Link: `https://calendly.com/soundacademyen/meet-with-sound-academy?back=1&month=2026-05` (opens in new tab)

---

## 6. Talk 2 Dan Tab

### 6.1 Partner Badge Row

```
[T2D logo]  [• INDUSTRY PARTNER · UK]
```

- T2D logo: image `T2Dhome.png`, 40×40px, border-radius 10px
- Badge: `background: rgba(16,185,129,0.12)`, `border: 1px solid rgba(16,185,129,0.3)`, border-radius 20px
  - Dot: `#34D399`
  - Text: `"INDUSTRY PARTNER · UK"`, `color: #6EE7B7`

### 6.2 About Dan Section

Section title: `"About Dan"`, `font-size: 18px`, `font-weight: 700`

Bio text (`font-size: 15px`, `line-height: 23px`, colour: textSecondary):

> Dan founded Talk 2 Dan in 2017 from personal experience navigating the barriers of breaking into the creative industry. With a background spanning **Sky, ITV, Channel 4** and independent production companies, he bridges the gap between young talent and employers.

The bold names (Sky, ITV, Channel 4) use `font-weight: 600` and primary text colour.

### 6.3 Service Cards ("Services")

Section title: `"Services"`, margin-top 28px.

Same card dimensions as module cards (280×380px). Cards open `https://talk2dan.co.uk` directly (no internal page). Card structure: gradient background → bottom vignette overlay → badge (top-left, subtitle text) → large semi-transparent icon centred vertically → content at bottom.

**Icon position:** vertically centred (top: 30%), horizontally centred, size 40px, `color: rgba(255,255,255,0.25)`

| ID | Icon | Title | Subtitle (badge) | Description | Gradient | CTA label |
|----|------|-------|-----------------|-------------|----------|-----------|
| t2d-1 | people | Young People | AGES 16–25 | Helping young people break into creative and media industries. Practical guidance from someone who has lived it. | `#064E3B` → `#065F46` | Get Started |
| t2d-2 | school/graduation | Universities & Colleges | ACADEMIC PARTNERSHIPS | Bridging institutions and media employers to create clear pathways for students entering the industry. | `#1E3A5F` → `#1D4ED8` | Partner With Us |
| t2d-3 | tv/monitor | Media Companies | INDUSTRY CONSULTANCY | Connecting companies with emerging talent. Dan has placed candidates at Sky, ITV, Channel 4 and more. | `#3B0764` → `#6D28D9` | Work With Us |
| t2d-4 | briefcase | Recruitment | END-TO-END PLACEMENT | Full recruitment support for creative and media roles — matching the right talent with the right opportunity. | `#422006` → `#B45309` | Find Talent |

Card bottom content for T2D cards:
- Title: same as Module cards
- Artist text (description): 3-line clamp
- Meta row: `"{CTA label} →"` in `rgba(255,255,255,0.55)`

### 6.4 Talk 2 Dan CTA Button

Solid colour button (not gradient), full width with 24px margin, border-radius 32px, padding 15px.

- Background: `#059669` (green)
- Icon: chat bubble / speech bubble (left), 18px, white
- Label: `"Talk 2 Dan"`, `font-size: 16px`, `font-weight: 700`, `color: #FFFFFF`
- Margin-top: 28px
- Link: `https://talk2dan.co.uk` (opens in new tab)

---

## 7. Herts Uni Tab (Coming Soon)

### 7.1 Partner Badge Row

```
[UH logo]  [• ACADEMIC PARTNER · UK]
```

- UH logo: square dark card (40×40px, border-radius 10px, `background: #111`, border 1px solid `rgba(255,255,255,0.1)`)
  - Text inside: `"UH"`, `font-size: 12px`, `font-weight: 800`, `color: #60A5FA`, `letter-spacing: 0.5px`
- Badge: `background: rgba(96,165,250,0.12)`, `border: 1px solid rgba(96,165,250,0.3)`, border-radius 20px
  - Dot: `#93C5FD`
  - Text: `"ACADEMIC PARTNER · UK"`, `color: #BFDBFE`

### 7.2 Coming Soon Copy

Section title: `"Coming Soon"`, `font-size: 18px`, `font-weight: 700`

Body text:

> We're finalising our partnership with the University of Hertfordshire. Course listings, degree details, and application pathways will appear here once the partnership is confirmed.

Margin-bottom: 32px

### 7.3 Placeholder Card

Same card container (280×380px). Non-clickable. Content centred:

- Icon: hourglass, 48px, primary colour
- Title: `"Content\nComing Soon"`, `font-size: 24px`, `font-weight: 700`, centred, margin-top 16px
- Subtitle: `"University of Hertfordshire"`, `font-size: 14px`, colour: textSecondary, centred, margin-top 8px
- Background: `rgba(255,255,255,0.04)` dark / `rgba(0,0,0,0.04)` light
- Border: `rgba(255,255,255,0.08)` dark / theme border light

### 7.4 Herts CTA Button

Outline button (transparent background), full width, border-radius 32px, padding 15px.

- Background: transparent
- Border: 1px solid primary colour
- Icon: external-link, 18px, primary colour
- Label: `"Visit herts.ac.uk"`, primary colour
- Margin-top: 28px
- Link: `https://www.herts.ac.uk` (opens in new tab)

---

## 8. Course Detail Page (`/pro-resources/course/:id`)

Receives the full module object (id = `sa-m1` or `sa-m2`).

### 8.1 Hero Section (full-bleed gradient)

Full-width gradient header using the module's `gradientColors`, applied diagonally (top-left to bottom-right).

Padding: 24px horizontal, 12px top, 28px bottom.

**Back button:** chevron-left icon, white, margin-bottom 20px

**Badge:**
- Text: `"MODULE {N} · SOUND ACADEMY UK"`, uppercase
- `font-size: 10px`, `font-weight: 700`, `color: white`, `letter-spacing: 1.2px`
- Container: `background: rgba(255,255,255,0.12)`, `border: 1px solid rgba(255,255,255,0.2)`, border-radius 12px, padding 4px 10px
- Align-self: flex-start, margin-bottom 12px

**Title:** module title, `font-size: 32px`, `font-weight: 700`, `color: #fff`, `letter-spacing: -0.5px`, `line-height: 38px`, `margin-bottom: 6px`

**Subtitle:** skill level (e.g., "Beginner → Intermediate"), `font-size: 15px`, `color: rgba(255,255,255,0.7)`, `margin-bottom: 16px`

**Meta chips row (gap 10px, wrap):**

Two chips, each with icon + text:
- Chip: `background: rgba(0,0,0,0.2)`, border-radius 20px, padding 5px 10px
- Icon: 13px, `color: rgba(255,255,255,0.7)`
- Text: `font-size: 12px`, `color: rgba(255,255,255,0.75)`, `font-weight: 500`

| Chip | Icon | Text |
|------|------|------|
| Duration | clock | "1 month" |
| Format | calendar | "Weekends · Sat & Sun · 10am–6pm" |

### 8.2 Scrollable Content

All sections use 24px horizontal padding, 28px top padding.

#### About this module

Section title: `"About this module"`, `font-size: 18px`, `font-weight: 700`, `margin-bottom: 12px`

Body text: module description, `font-size: 15px`, `line-height: 23px`, colour: textSecondary.

#### Certifications Awarded

Section title: `"Certifications Awarded"`, `font-size: 18px`, `font-weight: 700`

Container box:
- Border-radius: 16px
- Border: 1px solid (`rgba(255,255,255,0.08)` dark / theme border light)
- Background: `rgba(255,255,255,0.05)` dark / card light
- Padding: 16px, gap: 12px between rows

Each cert row (flex row, gap 10px, align-center):
- Icon: ribbon (🎀), 16px, `color: #F59E0B` (amber)
- Text: cert name, `font-size: 14px`, `font-weight: 500`, primary text colour

| Module | Certifications |
|--------|---------------|
| M1 | Avid Pro Tools PT101 |
| M2 | Avid Pro Tools PT101, Avid Pro Tools PT110, Dolby Atmos |

#### Units (accordion)

Section title: `"{N} Units"`, `font-size: 18px`, `font-weight: 700`

Each unit is a row that expands/collapses on click:

**Collapsed row (flex, align-flex-start, gap 12px, padding 14px top/bottom, border-bottom 1px):**
- Number badge: 32×32px, border-radius 10px, `background: {primaryColor}20` (20% opacity), number text `font-size: 13px`, `font-weight: 700`, primary colour
- Unit title: `font-size: 15px`, `font-weight: 600`, `line-height: 22px`, primary text
- Chevron-down icon: 16px, textSecondary colour, right-aligned

**Expanded (chevron-up, topics revealed below title):**
- Topics list: margin-top 10px, gap 7px
- Each topic row: dot (5×5px, border-radius 2.5px, primary colour, margin-top 7px for vertical alignment) + text (`font-size: 13px`, `line-height: 19px`, textSecondary)

Only one unit can be expanded at a time.

#### CTA Button

Same gradient button as Sound Academy tab:
- Gradient: `linear-gradient(to right, #DC2626, #EC4899)`
- Icon: calendar, 18px, white
- Label: `mod.ctaLabel` (= `"Book an Appointment"`)
- Border-radius: 32px, padding 15px, full width minus 24px margin
- Margin-top: 32px, margin-bottom: 8px

Below button (centred):
- Note text: `"Free 30-min consultation · No obligation"`, `font-size: 12px`, colour: textSecondary

---

## 9. Design Tokens Reference

### Colours

| Token | Dark mode | Light mode |
|-------|-----------|------------|
| Primary | `#EC4899` (pink) | `#EC4899` |
| Background | `#000000` | `#FFFFFF` |
| Card background | `rgba(255,255,255,0.05)` | surface colour |
| Text primary | `#FFFFFF` | `#000000` |
| Text secondary | `rgba(255,255,255,0.55)` approx | mid grey |
| Border | `rgba(255,255,255,0.08)` | light grey |
| Error | `#EF4444` | `#EF4444` |

### Gradients used in this feature

| Use | Gradient |
|-----|----------|
| Module 1 card overlay | `rgba(232,82,26,0.48)` → `rgba(201,32,117,0.48)` |
| Module 1 detail hero | `#E8521A` → `#C92075` |
| Module 2 card overlay | `rgba(91,33,182,0.52)` → `rgba(201,32,117,0.52)` |
| Module 2 detail hero | `#5B21B6` → `#C92075` |
| Card bottom vignette | `transparent` → `rgba(0,0,0,0.35)` → `rgba(0,0,0,0.82)` |
| SA / Course CTA button | `#DC2626` → `#EC4899` (horizontal) |
| Feed banner background | `#1C1235` → `#2A1650` → `#1C1235` (diagonal) + purple overlay |
| T2D Young People card | `#064E3B` → `#065F46` |
| T2D Universities card | `#1E3A5F` → `#1D4ED8` |
| T2D Media Companies card | `#3B0764` → `#6D28D9` |
| T2D Recruitment card | `#422006` → `#B45309` |

### Typography scale (relevant to this feature)

| Use | Size | Weight | Letter-spacing |
|-----|------|--------|----------------|
| Page title "Pro Resources" | 52px | 300 | -1px |
| Tab labels | 28px | 400/600 | -0.5px |
| Section titles | 18px | 700 | – |
| Card title | 24px | 700 | -0.5px |
| Card subtitle | 14px | 400 | – |
| Course detail title | 32px | 700 | -0.5px |
| Stat value | 22px | 700 | – |
| CTA button | 16px | 700 | 0.2px |
| Body text | 15px | 400 | – |
| Badge text | 10px | 700 | 1.2px |

---

## 10. Assets Required

| File | Used in |
|------|---------|
| `sa-2.png` | SA partner row logo (40×40), feed banner logo (52×52) |
| `fund.jpg` | Module 1 card background |
| `mix.jpg` | Module 2 card background |
| `T2Dhome.png` | T2D partner row logo (40×40) |
| `logo-trans-lockup.png` | SoundBridge logo in feed banner footer (72×14px, opacity 0.35) |

---

## 11. Interaction Summary

| Interaction | Result |
|-------------|--------|
| Tap feed banner | Navigate to `/pro-resources` (Sound Academy tab) |
| Tap school icon in Discover header | Navigate to `/pro-resources` (Sound Academy tab) |
| Switch tab | Show tab content, no page navigation |
| Tap module card (SA tab) | Navigate to `/pro-resources/course/sa-m1` or `/pro-resources/course/sa-m2` |
| Tap "Book a Free Appointment" (SA tab) | Open Calendly URL in new tab |
| Tap unit row (course detail) | Toggle accordion expand/collapse (one at a time) |
| Tap "Book an Appointment" (course detail) | Open Calendly URL in new tab |
| Tap T2D service card | Open `https://talk2dan.co.uk` in new tab |
| Tap "Talk 2 Dan" CTA | Open `https://talk2dan.co.uk` in new tab |
| Tap "Visit herts.ac.uk" CTA | Open `https://www.herts.ac.uk` in new tab |
| Tap back / browser back | Navigate to previous page |

---

## 12. SEO / Head Tags (suggested)

```html
<!-- /pro-resources -->
<title>Pro Resources — SoundBridge</title>
<meta name="description" content="Courses, coaching & career tools from SoundBridge education partners. Sound Academy UK, Talk 2 Dan, and University of Hertfordshire.">

<!-- /pro-resources/course/sa-m1 -->
<title>Fundamentals of Recording & Mixing — Sound Academy UK | SoundBridge</title>

<!-- /pro-resources/course/sa-m2 -->
<title>Advanced Mixing Techniques — Sound Academy UK | SoundBridge</title>
```

---

*Document generated 2026-05-20. Reflects mobile app commit `b5cf077a` onwards. Contact Justice (mobile team) for assets or questions.*
