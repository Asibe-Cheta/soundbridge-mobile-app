# SoundBridge AI Career Adviser — Full Feature Specification
## Version 2.0 — Updated April 2026

---

## Overview

The AI Career Adviser is SoundBridge's intelligent career guidance system built specifically for independent audio creators: musicians, vocalists, sound engineers, producers, DJs, and podcasters. It is not a chatbot. It is a persistent, data-driven advisory layer embedded throughout the platform that proactively surfaces insights, recommendations, and actionable next steps based on each creator's unique profile, behaviour, performance data, and external market intelligence.

The system answers three questions that no competitor currently addresses together:

1. **WHERE** should I focus my career geographically?
2. **WHAT** should I create next?
3. **HOW** should I present myself to maximise opportunities?

The AI Career Adviser is the thread that connects SoundBridge's five core moats — it takes data from Location Intelligence, Performance Intelligence, Profile Optimisation, Next Release Recommendations, and Collaboration Matching and presents it as a unified career direction for each creator.

---

## Usage Limits & Token Cost Model

### Why limits exist

AI analysis uses tokens. Token costs are real and variable. To keep AI Career Adviser financially sustainable as SoundBridge scales to millions of users, usage is capped per subscription tier with a credit top-up system for heavy users.

### Allowances per tier

| Action | Free | Premium (£6.99/mo) | Unlimited (£12.99/mo) |
|---|---|---|---|
| Full career analyses per month | 1 (demo only) | 10 | 20 |
| Ask Me Anything chat sessions per month | 0 | 5 | 15 |
| Audio track analysis (per request) | ❌ | ✅ included in analysis allowance | ✅ included |
| Image/screenshot uploads per session | ❌ | 3 per session | 5 per session |
| Additional credits (top-up) | ❌ | Via credit wallet | Via credit wallet |

### Session limits

Each Ask Me Anything chat session has a maximum of **20 exchanges** (20 user messages + 20 AI responses). This is one session, counted against the monthly chat session allowance.

- When approaching the limit, the AI gives a natural heads-up: *"We're near the end of this session — is there anything else you want to cover before we wrap up?"*
- After 20 exchanges the session closes
- A new session can be started, which opens a fresh context window and counts as the next session use

### Credit top-up

Users who exhaust their monthly allowance can purchase additional AI credits from the existing SoundBridge credit wallet (the same wallet used for AI production tools). Credits are shared across all AI features on the platform.

### Token cost reference (internal)

- A full career analysis (profile context + 5 insight cards): ~3,000–5,000 tokens ≈ $0.05–0.10
- At 10 analyses per Premium user per month: maximum AI cost ≈ $1 per user
- This sits well within the £6.99/month margin, especially as most users will not hit the cap

---

## Context Guardrails — Scope Enforcement

The AI Career Adviser **only responds to questions within the following scope:**

- Music careers and artist development
- Audio creation, recording, production, mixing, mastering
- Podcasting and audio content
- Event promotion and live performance
- Fan monetisation and platform growth
- SoundBridge platform features and strategy
- Professional collaboration and networking in the audio industry
- Genre trends, release strategy, audience building

**Out-of-scope questions are declined, warmly and firmly.**

Example off-topic response:
> *"I'm specialised in music and audio career advice — that one's a bit outside my lane. But if you have any questions about your music, your audience, or your career on SoundBridge, I'm right here."*

This is enforced via the system prompt. No exceptions. The AI will not answer questions about cooking, general life advice, technology unrelated to music, or any topic that falls outside the audio creator context regardless of how the question is framed.

---

## Image Upload — Screenshots from External Platforms

Users can upload **images only** (no documents, no PDFs) within the Ask Me Anything section.

### Why images, not documents

PDF and document uploads carry a genuine security risk — PDFs can contain embedded scripts and malicious code. Since the AI Career Adviser does not require documents (everything useful comes from images and platform data), document upload is excluded entirely. This removes the security surface without reducing functionality.

### Supported image uploads

- Screenshots from Spotify for Artists dashboard
- Screenshots from TuneCore, DistroKid, or other distribution platforms
- Screenshots from YouTube Studio, Instagram Insights, TikTok analytics
- Any other platform dashboard showing performance data relevant to the creator's career

### How it works

1. User taps the image/attachment icon in the Ask Me Anything input bar
2. Selects an image from their camera roll
3. Adds an optional message: *"This is my Spotify data from last month — what does it tell you?"*
4. The AI reads the image, extracts the data, and responds with personalised analysis

### Powered by

Anthropic Claude API with vision capability — the same vision model that powers this conversation. No additional infrastructure required beyond enabling image input in the API call.

---

## Audio Analysis — AI Listens to Your Music

### Principle: Per request only, never constant

The AI does not listen to music on a continuous or background basis. Audio analysis only runs when:

1. **On upload** — a lightweight automatic analysis runs once in the background when a track is uploaded (genre detection, basic frequency profile, loudness level). This is cheap, fast, and requires no user action.

2. **On explicit request** — a deeper production quality analysis runs when the user taps "Analyse this track" inside the Career Adviser. This uses more tokens but is intentional and user-initiated.

All analysis results are stored so they do not need to be rerun every time the AI references that track in a conversation.

### What audio analysis can surface (Phase 2 feature)

Using audio analysis APIs (Essentia open-source or ACRCloud which is already integrated):

- Frequency balance issues: *"The low-end frequencies in this track are competing with the vocals around 200–300Hz — this is reducing clarity"*
- Dynamic range: *"Your track's dynamic range is compressed at -6 LUFS, which is below the gospel genre average on streaming platforms"*
- Structural observations: *"Your hook arrives at 1:04. On SoundBridge, tracks that reach their first hook within 30 seconds retain 40% more listeners"*
- Backing vocal levels: *"The backing vocals peak louder than the lead in the second verse — this may be causing listener drop-off at 1:42"*
- Tempo and energy: *"Your BPM (108) is slightly below the gospel genre average (116–124). Tracks closer to 120 BPM show higher tip rates in your genre"*

### Tier access

- **Free:** No audio analysis
- **Premium:** Basic structural analysis (hook timing, loudness, duration)
- **Unlimited:** Full production quality analysis including frequency balance, vocal clarity, and mixing notes

### This is a premium feature — trial nudge

Because audio analysis is premium, users who have not yet upgraded see a contextual nudge when they upload a track:

> *"We think your music can go further. SoundBridge's AI Career Adviser can listen to your track and tell you exactly what to improve — from production quality to release timing. Try it free with your first analysis."*

---

## Ask Me Anything — In-App Conversational AI

### What it is

After the 5 insight cards are generated from a full career analysis, an inline section appears below them — not a modal, not a separate screen. It lives in the same scroll as the results.

The creator can ask follow-up questions and the AI responds with full context of their profile, their tracks, and their platform data already loaded.

### Design

- A subtle section divider and header: **"Want to go deeper?"**
- Subtext: *"Ask me anything about your career, your audience, or your next move — I have full context about your profile, your music, and your data."*
- Animated AI indicator showing the adviser is present and active
- A text input field with placeholder: *"e.g. Where are my fans most likely to be? or What should I release next?"*
- A send/submit button
- Image attachment icon (for uploading screenshots from external platforms)

### Suggested prompt chips

Displayed above the input field — tappable, pre-fill the input:

- *"Why is my top track doing better than the others?"*
- *"How do I get more tips?"*
- *"Should I focus on events or streaming right now?"*
- *"Who should I collaborate with first?"*
- *"Analyse my latest track"* (triggers audio analysis if Premium/Unlimited)

### Typing indicator

When the user submits a question, a 3-dot animated typing indicator appears for 1.5–2 seconds before the response displays. This makes the interaction feel natural rather than instantaneous.

### Session memory

Within a single session (up to 20 exchanges), the AI retains full context of the conversation — earlier questions and answers inform later responses. When a new session starts, the conversation context resets but the AI still has access to the creator's profile and platform data.

---

## Proactive Nudges — "Try the AI Career Adviser"

Nudges are event-triggered, not scheduled. They fire at specific moments based on real platform data. Each nudge fires **once per user only** and is permanently dismissed after the user taps "Got It" or "Maybe Later." They never repeat.

No more than one nudge per session.

### Nudge 1 — First track uploaded

> *"SoundBridge paid out £4,200 to creators this month. Want to know what the top earners did differently? Your AI Career Adviser has the answer."*

Buttons: **"Show Me"** | **"Maybe Later"**

### Nudge 2 — User has been on the platform 7 days with no Career Adviser use

> *"You've uploaded [X] tracks. Based on similar artists, there are 3 things you could do right now to increase your earnings. Your AI Career Adviser is ready when you are."*

Buttons: **"Analyse My Career"** | **"Not Now"**

### Nudge 3 — First tip received

> *"You just earned your first tip 🎉 At this rate, your AI Career Adviser can tell you exactly how to keep the momentum going."*

Buttons: **"See What's Next"** | **"Maybe Later"**

### Nudge 4 — User's track has been played 50+ times

> *"Your track has been played [X] times. We think we can see a pattern in who's listening and where. Your AI Career Adviser can tell you what it means."*

Buttons: **"Analyse This"** | **"Got It"**

### Nudge 5 — User has not logged in for 7 days (re-engagement)

> *"We noticed you've been away. [Track name] got [X] new plays while you were gone. Someone out there is listening — your AI Career Adviser has an update for you."*

Buttons: **"See My Update"** | **"Dismiss"**

---

## Occasional Motivational Prompts

Separate from nudges, the AI Career Adviser sends occasional personalised motivational messages based on real platform events. These are brief, warm, and data-grounded — not generic affirmations.

These are delivered as dashboard cards (not push notifications unless the user has push enabled).

### Trigger examples

| Trigger | Message |
|---|---|
| User reached a new follower milestone | *"You just passed [X] followers. That's [X] more people who chose to follow your journey. Keep going."* |
| A track hit a new personal best in plays | *"[Track name] just had its best week yet — [X] plays. Something about this one is landing. Your Career Adviser has noticed."* |
| Genre trending in user's city | *"Gospel is trending up [X]% in [City] this week. Your audience is primed. Your Career Adviser has a suggestion."* |
| User completed their profile to 100% | *"Your profile is complete. You're now discoverable to everyone looking for your sound. Well done."* |
| First collaboration request sent | *"You reached out to someone today. That one message could be the start of something. Your Career Adviser is keeping track."* |

### Tone principles

- Personal, not generic
- Data-grounded, not hollow praise
- Brief — never more than 2 sentences
- Always tied to a real platform event
- Never fabricated or speculative

---

## Core Components (Unchanged from v1.0, reproduced for completeness)

### Component 1: Location Intelligence
*Available at launch*

Tells creators precisely which UK cities (and international markets) offer the highest career return for their specific genre. Full specification unchanged from v1.0 — see Location Intelligence System Technical Specification for complete detail.

**Tier access:**
- Free: Basic city overview
- Premium: Full city comparison + diaspora matching
- Unlimited: Full + priority refresh

---

### Component 2: Performance Intelligence
*Year 1, Month 6–8 post-launch*

Analyses track and content performance data and surfaces non-obvious, actionable insights with financial impact framing.

**Tier access:**
- Free: Top track identification only
- Premium: Peer benchmarks, time-based analysis, financial projections
- Unlimited: All of the above + advanced pattern detection + priority data refresh

---

### Component 3: Next Release Recommendations
*Year 1, Month 11–12 post-launch*

Recommends what the creator should release next — combining historical performance data with live genre trend data. Includes multi-release strategy and direct handoff to collaboration marketplace.

**Tier access:**
- Free: ❌
- Premium: Full recommendations
- Unlimited: Full + multi-release strategy

---

### Component 4: Profile Optimisation
*Year 1, Month 9–10 post-launch*

Reviews each creator's profile and surfaces opportunity-framed improvements. Never framed as criticism — always as "top performers do X, here is the measurable benefit."

**Tier access:**
- Free: Basic completeness score
- Premium: Full suggestions
- Unlimited: Full + priority visibility impact

---

### Component 5: Daily Career Direction
*Available from Month 6–8 with Performance Intelligence*

A single weekly (Premium) or daily (Unlimited) personalised action card — the single highest-impact action available to that creator at that moment, drawn from all components above.

**Tier access:**
- Free: ❌
- Premium: Weekly direction
- Unlimited: Daily direction

---

## What the AI Career Adviser Does NOT Do

- It does not listen to or analyse audio files continuously or in the background — analysis runs per request only
- It does not answer questions outside the scope of music, audio creation, podcasting, events, or SoundBridge-related topics
- It does not accept document or PDF uploads — images only
- It does not replace the creator's creative decisions — it informs and suggests, never mandates
- It does not share one creator's data with another creator in identifiable form — all peer benchmarks use anonymised aggregate data
- It does not make earnings guarantees — all projections are clearly labelled as estimates based on historical patterns
- It does not store conversation history beyond the current session for use in future sessions (profile and platform data is always available, but chat transcripts are not persisted)

---

## Technical Architecture Summary

| Component | Data Input | Processing | Output |
|---|---|---|---|
| Location Intelligence | ONS API, Census data, platform geo data | Claude API synthesis | City comparison cards, ranked recommendations |
| Performance Intelligence | Platform play/tip/engagement data, peer benchmarks | Scheduled analytics job + Claude API | Insight cards, financial projections |
| Audio Analysis | Track audio file | Essentia or ACRCloud + Claude API synthesis | Production quality notes, structural observations |
| Next Release Recommendations | Performance data, genre trends, collaboration data | Weekly background job + Claude API | Release strategy cards, collaborator suggestions |
| Profile Optimisation | Profile data, engagement correlation data, peer benchmarks | Triggered on profile update + Claude API | Actionable improvement list, completeness score |
| Daily Direction | All of the above | Priority logic engine + Claude API | Single action card + notification |
| Ask Me Anything | User message + profile context + session history | Claude API (with vision for images, web search optional) | Conversational response |
| Proactive Nudges | Platform event triggers | Rule-based trigger engine + Claude API for personalisation | In-app notification or dashboard card |

---

## Phased Rollout Timeline

| Phase | Components | Timing |
|---|---|---|
| Launch | Location Intelligence only | April 2026 |
| Phase 1 | Performance Intelligence + Daily Direction + Ask Me Anything (basic) + Proactive Nudges | Month 6–8 post-launch |
| Phase 2 | Profile Optimisation + Image upload in Ask Me Anything | Month 9–10 post-launch |
| Phase 3 | Next Release Recommendations + Collaboration Matching handoff + Audio Analysis (basic) | Month 11–12 post-launch |
| Phase 4 | Full Audio Analysis (production quality) + Web browsing in Ask Me Anything | Year 2 |

---

## Tier Access Summary

| Feature | Free | Premium (£6.99/mo) | Unlimited (£12.99/mo) |
|---|---|---|---|
| Location Intelligence | Basic city overview | Full city comparison + diaspora matching | Full + priority refresh |
| Performance Intelligence | Top track identification | Peer benchmarks + financial projections | All + advanced pattern detection |
| Audio Analysis (basic) | ❌ | ✅ Per request | ✅ Per request |
| Audio Analysis (production quality) | ❌ | ❌ | ✅ Year 2 |
| Next Release Recommendations | ❌ | ✅ Full recommendations | ✅ + multi-release strategy |
| Profile Optimisation | Basic completeness score | ✅ Full suggestions | ✅ + priority visibility impact |
| Daily Direction | ❌ | Weekly direction | Daily direction |
| Ask Me Anything sessions/month | ❌ | 5 sessions | 15 sessions |
| Full career analyses/month | 1 (demo) | 10 | 20 |
| Image uploads per session | ❌ | 3 | 5 |
| Motivational prompts | ❌ | ✅ | ✅ |
| Proactive nudges | ✅ (limited) | ✅ | ✅ |
| Credit top-up available | ❌ | ✅ | ✅ |

---

## Data Privacy and Compliance

- All creator data used for AI recommendations is owned by the creator and governed by SoundBridge's Terms of Service and Privacy Policy
- Peer benchmarking uses fully anonymised, aggregated data — no individual creator's data is exposed in another creator's recommendations
- Uploaded images are processed by the Anthropic Claude API and are not retained beyond the request — no creator data or images are stored by Anthropic
- Creators can opt out of data use for AI recommendations in their account settings (this will reduce recommendation quality and is disclosed at the point of opt-out)
- All data processing complies with GDPR — data stored in AWS eu-north-1 (Stockholm) under Supabase infrastructure
- Document and PDF uploads are not permitted — image uploads only — to protect against embedded malware risk
- Audio analysis results are stored per creator profile and do not re-run unnecessarily — stored results are reused in subsequent AI conversations

---

## Key User-Facing Language

The AI Career Adviser should always be referred to in the product as:

- **"Your AI Career Adviser"** (dashboard header)
- **"Career Insights"** (section label for Performance Intelligence)
- **"What to do today"** (Daily Direction card)
- **"Release Strategy"** (Next Release Recommendations section)
- **"Profile Score"** (Profile Optimisation completeness indicator)
- **"Location Analysis"** (Location Intelligence section)
- **"Ask Me Anything"** (conversational section label)
- **"Track Analysis"** (Audio Analysis section)

Avoid in user-facing copy: "AI", "machine learning", "algorithm", "model", "tokens", "API". The tone should feel like a knowledgeable industry mentor, not a technical system.

---

## Why Competitors Cannot Replicate This

The technical implementation of AI recommendation systems is accessible to any developer with API access. The barrier is the **data**. Each component of the AI Career Adviser requires data that only exists inside SoundBridge:

- Tipping behaviour by genre, geography, and track style
- Collaboration success rates between creator types
- Event attendance correlation with track promotion patterns
- Professional service booking conversion by profile configuration
- Genre trend velocity across a creator-specific platform
- Audio analysis results correlated with financial performance data

Spotify has consumption data but no tipping, no collaboration outcomes, no service bookings, no event attendance. SoundCloud has engagement data but no financial transaction layer. Neither platform has any incentive to help creators earn more — their business models benefit from passive consumption, not empowered career optimisation.

Every month SoundBridge operates, the recommendation models improve through additional data. By Year 3, the platform will have multi-year behavioural data across tens of thousands of creators — a compounding accuracy advantage that any late entrant would need years to replicate even if they started building today.

---

*Document version: 2.0 — April 2026*
*Updated from v1.0 (March 2026) with: Ask Me Anything conversational layer, audio analysis spec, image upload, context guardrails, usage limits and token cost model, session caps, proactive nudge system, motivational prompts, per-request audio listening principle, and security policy on document uploads.*
*For internal development use. Prepared for Cursor AI-assisted development.*
