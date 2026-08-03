 **Item 6 — "Earn Money Live" Nudge System**.

**FULL CURSOR PROMPT — Earn Money Live Nudges**

---

**Important — check existing code first:** Before building anything, inspect the existing Tip Room / Live Request Room feature, the QR code generation and display system, and any existing in-app notification or nudge infrastructure. Reuse existing notification patterns, styling, and navigation conventions rather than introducing a new system. Match existing schema and naming conventions throughout.

**What to build:**

A periodic in-app nudge system encouraging creators to actively use the existing Tip Room / QR code feature for live, in-person earning, not just passive digital tipping.

**Nudge triggers and copy:**

Display a nudge to creators on a recurring basis (weekly and/or monthly cadence, configurable), using time-based framing. Example copy variants to implement (rotate or select one):
- "Earn money live this week"
- "Earn money live this month"
- "Happy new month! Earn money live this month"

The nudge should appear as an in-app notification or banner, following whatever existing notification/banner pattern is already used elsewhere in the app (e.g. how other prompts or reminders currently surface to users).

**Tap behaviour:**

Tapping the nudge navigates the creator directly to their Tip Room, showing their personal QR code and how to use it to start collecting live tips. Reuse the existing Tip Room screen, do not build a new screen for this.

**AI Career Advisor integration:**

For creators who don't know where to start earning live, the nudge flow should offer a path into the AI Career Advisor for guidance. If the creator taps a secondary option (e.g. "Not sure where to start?"), route them to the AI Career Advisor with a pre-seeded prompt/context asking about live earning opportunities, using the Advisor's existing chat/query functionality, not new logic. This should count against the creator's existing AI Advisor usage limits (per the existing tier system), not be treated as a free/unlimited interaction.

**Usage guidance content:**

Within the Tip Room screen (or a linked help/info panel), include practical guidance on how to use the QR code for live performances:
- The QR code can be displayed via the SoundBridge web version on a laptop
- It can be projected via a projector at a live event
- It can be printed out as a physical, reusable card or poster, since the QR code does not expire or change

If a printable version doesn't already exist, add a simple "Download printable QR code" option that exports the creator's QR code as a styled, print-ready image or PDF, reusing whatever export/download pattern already exists elsewhere in the app if one does.

**General rules:**

- Do not build new notification infrastructure if an existing in-app notification/banner system already exists, extend it
- Nudge frequency should be reasonable and non-intrusive, avoid daily prompts, weekly or monthly cadence only
- Follow existing code style, component structure, and naming conventions throughout
