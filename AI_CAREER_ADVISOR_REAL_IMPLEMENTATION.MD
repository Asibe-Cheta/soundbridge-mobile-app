This is exactly what I needed, thank you for getting this. Now I can write an accurate prompt that builds only what is actually missing, without touching what already works well.

```markdown
# AI Career Adviser — Real Implementation
# Building on the Existing UI, Not Replacing It

## Context From Audit
The screen, chat interface, and all UI components 
already exist and work well in 
src/screens/AICareerAdvisorScreen.tsx. Do not 
rebuild or redesign any of this. The job here is 
entirely backend, data, and removing the fake 
mock layer underneath the existing interface.

What stays exactly as is:
- The three phase flow, Idle, Scanning, Results
- The 5 insight card layout
- The full chat UI, bubbles, typing indicator, 
  input, send button, auto scroll, preset chips
- All existing visual design

What gets removed:
- The "Coming Soon" blocking modal
- The setTimeout fake delay and hardcoded result string
- The MOCK_RESPONSES object and its 4 hardcoded 
  Q&A pairs
- Every hardcoded statistic currently shown, 
  847 plays, Manchester, £420 to £640, gospel 
  artists, all of it

---

## Part 1 — Remove the Coming Soon Block

Remove the full screen "Coming Soon" modal that 
currently overlays the feature. Replace it with 
the real subscription tier gating described in 
Part 4.

---

## Part 2 — Real Data Access Function

Build a single backend function, called whenever 
the user taps "Analyse My Career" or sends a chat 
message, that assembles real data about that 
specific creator:

- Genre and mood tags from onboarding
- Actual total plays and play count per track, 
  from the real plays data, not hardcoded
- Actual tip totals and tip rate per track
- Actual repeat listen rate per track if available
- Actual primary location and any city level 
  engagement data available
- community_memberships count if that exists yet, 
  otherwise skip this field for now
- Any existing event or service listing data 
  for this creator

Where real data does not exist yet, for example 
a brand new creator with zero uploads, the function 
must return that honestly, do not substitute 
placeholder numbers.

---

## Part 3 — Database Tables

```
ai_adviser_usage (
  id: UUID primary key
  creator_id: UUID FK to profiles
  billing_period_start: date
  billing_period_end: date
  analyses_used: integer default 0
  chats_used: integer default 0
  free_demo_used: boolean default false
)

ai_adviser_analyses (
  id: UUID primary key
  creator_id: UUID FK to profiles
  analysis_text: text
  generated_at: timestamptz
)

ai_adviser_conversations (
  id: UUID primary key
  creator_id: UUID FK to profiles
  messages: JSON
  started_at: timestamptz
  last_message_at: timestamptz
)
```

---

## Part 4 — Subscription Tier Enforcement

Add a real useAuth() subscription tier read to 
the screen, currently missing entirely.

Free tier:
- Allowed exactly 1 lifetime demo analysis, 
  tracked via free_demo_used
- Zero chats allowed
- After the 1 demo is used, show a locked state 
  instead of the Coming Soon modal:
  "You have used your free analysis. Upgrade to 
  Premium or Unlimited for ongoing access."
  Button: "Access Premium"

Premium tier:
- 10 analyses and 5 chats per billing period
- Show remaining usage clearly on screen, for 
  example "7 of 10 analyses remaining"

Unlimited tier:
- 20 analyses and 15 chats per billing period
- Same usage display pattern

Reset analyses_used and chats_used at the start 
of each billing period matching the existing 
renewal date logic already used elsewhere in 
the app.

If a user exceeds their limit mid period, offer:
"Buy 5 more analyses for £1.99" through the 
existing Stripe flow, incrementing their limit 
for that period only.

---

## Part 5 — Real Gemini Integration for Analysis

Add the Gemini API key to environment variables 
if not already present, go to aistudio.google.com 
to generate one if needed.

When "Analyse My Career" is tapped:
1. Run the data function from Part 2
2. Send that real data to Gemini Flash with a 
   system prompt instructing it to generate a 
   specific, personalised analysis referencing 
   actual numbers provided, never inventing data
3. If the creator has little or no real data yet, 
   the system prompt must instruct the model to 
   say so honestly and give general onboarding 
   style guidance instead of fabricating statistics
4. Display the real response in the existing 
   Results phase UI, replacing the current 
   hardcoded result
5. Store the response in ai_adviser_analyses
6. Increment analyses_used by 1

Keep the existing Scanning phase animation exactly 
as is, simply trigger the real API call during 
that phase instead of the fake setTimeout.

---

## Part 6 — Real Gemini Integration for Chat

Replace the MOCK_RESPONSES object entirely.

When any message is sent, whether typed freely 
or tapped from a preset chip:
1. Run the data function from Part 2
2. Send the real data, the full conversation 
   history so far, and the new message to Gemini 
   Flash
3. Display the real response in the existing 
   chat bubble UI
4. Save the updated conversation to 
   ai_adviser_conversations
5. Increment chats_used by 1

The 4 existing preset chips, Why this city, How 
do I grow faster, What should I post today, 
Explain my earnings, stay as the suggested prompts 
shown to the user, but each one now triggers a 
real API call using real data rather than 
returning the old hardcoded answer.

---

## Part 7 — Persist Conversations

Currently the conversation resets when the screen 
unmounts. Load the most recent conversation from 
ai_adviser_conversations when the screen opens, 
so a creator can return and continue where they 
left off, rather than starting fresh every time.

---

## General Rules
- Do not change any existing UI, layout, or 
  visual design
- Do not fabricate data under any circumstances, 
  if real data is missing say so honestly
- Tier limits enforced strictly
- Match existing Stripe flow for credit top ups
- Test on iOS Android and web

---

## Acceptance Criteria
- [ ] Coming Soon modal removed
- [ ] Real data function returns accurate data 
      or honest absence of data per creator
- [ ] All three database tables created
- [ ] Free tier allows exactly 1 lifetime demo, 
      then shows locked state with upgrade button
- [ ] Premium and Unlimited usage limits enforced 
      and displayed correctly
- [ ] Buy more credits flow works through Stripe
- [ ] Analyse My Career triggers real Gemini call 
      using real data, displays in existing UI
- [ ] Analysis result stored correctly
- [ ] Chat messages trigger real Gemini calls 
      using real data and conversation history
- [ ] Preset chips trigger real responses, not 
      old hardcoded ones
- [ ] Conversations persist and reload correctly 
      on screen reopen
- [ ] No fabricated statistics shown anywhere
- [ ] No existing UI or design changed
- [ ] No existing functionality broken
- [ ] Tested on iOS Android and web
```

This is the accurate version now, built precisely on what actually exists rather than what we assumed existed. 🙏🏾