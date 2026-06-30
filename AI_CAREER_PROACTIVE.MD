
# AI Career Adviser — Proactive Monitoring System
# Cheap Filtering, Expensive Generation Only When Warranted

## Before Writing Any Code
1. Find the existing AI Career Adviser screen, 
   data access function, and Gemini integration 
   already built
2. Find the existing Notification Preferences 
   screen and Venue Preferences screen
3. Find the existing track_quality_signals, 
   user_behaviour_profiles, and service 
   marketplace tables
4. Find the existing event matching and quality 
   scoring background jobs for reference on 
   the daily job pattern already in use
5. Report findings before making any changes

---

## Overview
Build a proactive monitoring layer for the AI 
Career Adviser. A cheap daily job checks every 
active subscriber's data using simple database 
queries only, no AI cost involved. Only when a 
genuine signal crosses a threshold does the 
system spend money generating an actual AI 
insight using Gemini Flash.

This system never gives financial product advice, 
never recommends specific loans, credit actions, 
or lending decisions. It may ask general budget 
questions only.

---

## Part 1 — Opportunity Scouting Opt-In

### Where it lives
Add a new toggle to the existing Venue Preferences 
screen, since performance opportunities are 
inherently location and venue related.

Label: "Notify me about performance opportunities"
Subtext: "We will occasionally search for open 
mic nights and venue opportunities matching your 
genre and location, and let you know."
Default: OFF

Store on user preferences:
```
opportunity_scouting_enabled: boolean default false
last_opportunity_search_at: timestamptz | null
```

---

## Part 2 — Daily Cheap Filter Job

Run once daily, low cost, database queries only, 
no AI calls in this step.

For every active Premium and Unlimited subscriber, 
check the following signals:

**Signal 1 — Quality score threshold crossed**
Compare today's quality_score against yesterday's 
for each track. Flag if it crossed a meaningful 
threshold, for example moving from below 60 to 
above 60.

**Signal 2 — Live interest threshold reached**
Reuse the existing live interest threshold check 
already built for the event poll system.

**Signal 3 — Curated external opportunity match**
Check the new curated_opportunities table, 
described in Part 3, for any entries matching 
this creator's genre and location that have not 
yet been surfaced to them.

**Signal 4 — Service marketplace match**
If the creator has indicated needing a 
collaborator, check for new or existing service 
listings matching their genre, location and 
stated budget that have not yet been surfaced.

If any signal fires, create a record:
```
ai_proactive_signals (
  id: UUID primary key
  creator_id: UUID FK to profiles
  signal_type: text 
    -- 'quality_threshold' 'live_interest' 
    -- 'curated_opportunity' 'service_match'
  signal_data: JSON
  generated_insight: text | null
  shown_to_user: boolean default false
  created_at: timestamptz
)
```

---

## Part 3 — Curated External Opportunities

Rather than having the AI autonomously scan the 
entire internet for every user, which would be 
both expensive and unreliable for accuracy, build 
a simple admin-curated table instead.

```
curated_opportunities (
  id: UUID primary key
  title: text
  description: text
  opportunity_type: text 
    -- 'open_mic' 'venue' 'policy_change' 
    -- 'brand_partnership' 'industry_news'
  genre_tags: text[]
  location_city: text | null
  source_url: text | null
  expires_at: date | null
  created_at: timestamptz
)
```

### Admin dashboard addition
Add a simple form to the admin dashboard where 
Justice or his team can manually add curated 
opportunities as they come across them, news, 
law changes, open mic listings, brand 
opportunities. This keeps the system accurate 
and cheap, since it relies on human curation 
rather than constant automated web scanning.

### Rate-limited automated search, opt-in only
For users with opportunity_scouting_enabled set 
to true, run a search once per week maximum, 
checking last_opportunity_search_at to enforce 
the limit, searching specifically for open mic 
nights and venue opportunities in their city 
and genre. Add any genuine results to 
curated_opportunities for matching in Part 2.

---

## Part 4 — Expensive Generation, Only When a 
## Signal Fires

When ai_proactive_signals has a new unshown 
record for a creator, generate the actual insight 
using Gemini Flash, following the same tone 
rules already established for the AI Career 
Adviser, direct address as you, warm and specific, 
never generic.

### System prompt addition
"You are a music career adviser inside SoundBridge. 
You may discuss general budgeting and financial 
planning questions in broad terms only. Never 
recommend specific loans, credit products, lending 
decisions, or tell a creator to check their credit 
score for a specific financial purpose. If finances 
come up, ask general questions about their budget 
and planning, and if it goes further, suggest they 
speak to their own bank or financial adviser."

Generate one short, specific insight referencing 
the actual signal data. Store it in 
generated_insight on the same record.

---

## Part 5 — Surfacing to the User

### Alerts section
Add an Alerts section to the AI Career Adviser 
screen, above the existing analysis and chat options.

If any unshown ai_proactive_signals exist for the 
creator, show a small badge or indicator, similar 
to the existing pulsating indicator pattern used 
for event matching.

Tapping it shows the generated insights as a 
simple list, most recent first. Each one, once 
viewed, sets shown_to_user to true.

### Meetings with real people
When a signal type is service_match, the insight 
should include a direct action:

"[Producer Name] on SoundBridge matches your 
genre and budget. Want to set up a call?"

Button: "Connect with [Name]"

Tapping this opens the existing service 
marketplace booking flow already built, simply 
pre-filling the relevant provider.

---

## Part 6 — Notification Throttle

A creator should never receive more than one 
proactive AI Career Adviser notification per day, 
regardless of how many signals fired that day. 
If multiple signals exist, surface the highest 
priority one as a notification, the rest remain 
visible in the Alerts list without a separate 
push notification.

---

## General Rules
- Daily filter job uses database queries only, 
  no AI cost
- AI generation only happens when a signal 
  genuinely fires
- Never give specific financial product advice
- Opportunity scouting is opt-in only, rate 
  limited to once per week when enabled
- Curated opportunities are admin managed, not 
  autonomously scraped
- Maximum one proactive notification per day 
  per creator
- Match existing design system throughout
- Test on iOS Android and web

---

## Acceptance Criteria
- [ ] Opportunity scouting toggle added to Venue 
      Preferences screen, default off
- [ ] Daily filter job runs correctly checking 
      all four signal types
- [ ] No AI cost incurred when no signal fires
- [ ] curated_opportunities table created with 
      admin form to add entries
- [ ] Opt-in weekly search respects rate limit 
      correctly
- [ ] AI generation only triggers on a genuine 
      signal, using correct tone rules
- [ ] Financial advice restriction correctly 
      enforced in system prompt
- [ ] Alerts section displays correctly on AI 
      Career Adviser screen
- [ ] Service match insights link correctly to 
      booking flow
- [ ] Maximum one notification per day enforced
- [ ] No existing functionality broken
- [ ] Tested on iOS Android and web