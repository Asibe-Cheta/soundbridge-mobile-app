# Play Count Fraud Detection System

## Before Writing Any Code
1. Find the existing play tracking 
  system and play_sessions table
2. Find how monthly payouts are 
  currently calculated for creators
3. Find the existing track_quality_signals 
  table built in a previous prompt
4. Find how IP addresses are currently 
  captured during API requests
5. Find the existing admin dashboard
6. Report findings before making 
  any changes

---

## Overview
Build a fraud detection system that 
identifies suspicious play activity 
and flags accounts for review before 
any payout is processed.

Three components:

1. Real time play validation that 
  rejects suspicious plays as they 
  happen
2. A daily fraud analysis job that 
  identifies anomalous patterns 
  across all play data
3. An admin dashboard fraud review 
  section where Justice can review 
  flagged accounts and approve or 
  withhold payouts

---

## Part 1 — Real Time Play Validation

### Rules applied on every play event
When a play is recorded apply 
the following validation rules 
before counting it as a valid play:

**Rule 1 — Minimum play duration**
A play only counts if the listener 
played at least 30 seconds or 50% 
of the track duration whichever 
is less. Plays shorter than this 
are recorded but marked as invalid.

**Rule 2 — Same user same track 
cooldown**
If the same user_id plays the same 
track_id more than 3 times within 
a 24 hour window mark plays 4 and 
beyond as suspicious. They are 
recorded but flagged and not counted 
toward payout eligibility.

**Rule 3 — Same IP address rate limit**
If more than 10 plays of any track 
come from the same IP address within 
a 1 hour window flag all plays from 
that IP for that track in that window 
as suspicious.

**Rule 4 — Identical play duration**
If 5 or more consecutive plays of 
the same track from the same user 
or IP have identical play durations 
to the second flag them as suspicious. 
Genuine human listening produces 
varied play durations.

**Rule 5 — Impossible play velocity**
If plays are recorded faster than 
the track duration allows — for 
example a 3 minute track showing 
2 plays within 1 minute from the 
same user or IP — mark as impossible 
and reject entirely. Do not count 
these at all.

### Database additions to play_sessions
Add the following fields to the 
existing play_sessions table:



is_valid: boolean default true
is_suspicious: boolean default false
is_rejected: boolean default false
fraud_reason: text | null
ip_address: text | null


---

## Part 2 — Daily Fraud Analysis Job

### When it runs
Run daily at 4AM UK time alongside 
the existing scoring jobs.

### What it analyses
For each creator with plays in 
the last 30 days calculate the 
following fraud signals:

**Signal 1 — Play to unique listener ratio**
Calculate: total plays divided by 
unique user IDs.

If ratio exceeds 10 — meaning on 
average each unique listener played 
that track more than 10 times — 
flag as suspicious.

Normal ratio: 1 to 3
Elevated: 3 to 7 (monitor)
Suspicious: 7 to 10 (flag)
Highly suspicious: above 10 (flag and hold payout)

**Signal 2 — Platform ratio check**
Calculate: plays for this track 
divided by total platform users.

If a single track has plays 
exceeding 30% of total platform 
user count flag for review.

On a platform with 1,500 users 
a track with more than 450 plays 
is flagged. On a platform with 
10,000 users the threshold becomes 
3,000 plays.

This threshold scales automatically 
with platform growth.

**Signal 3 — IP concentration**
If more than 20% of plays for 
a track come from fewer than 
5 unique IP addresses flag 
as suspicious.

**Signal 4 — Time pattern analysis**
If the majority of plays for a 
track occurred within a narrow 
time window — for example 80% 
of all plays within a single 
6 hour period — flag as suspicious.

Genuine organic listening spreads 
across days and time zones. 
Artificial inflation tends to 
cluster in time.

### Fraud score per creator
Calculate a fraud_score between 
0 and 100 for each creator based 
on how many signals are triggered:

0 to 25: Clean
26 to 50: Monitor
51 to 75: Flagged — review before payout
76 to 100: Hold payout — investigation required

### Database table



creator_fraud_analysis (
id: UUID primary key
creator_id: UUID FK to profiles
track_id: UUID FK to audio_tracks | null
analysis_date: date
total_plays: integer
unique_listeners: integer
play_to_listener_ratio: decimal
platform_ratio: decimal
ip_concentration_score: decimal
time_clustering_score: decimal
suspicious_plays_count: integer
rejected_plays_count: integer
fraud_score: decimal
fraud_status: text
– ‘clean’ ‘monitor’ ‘flagged’ ‘hold’
fraud_signals: JSON
payout_held: boolean default false
reviewed_by_admin: boolean default false
admin_decision: text | null
– ‘approved’ ‘withheld’ ‘banned’
reviewed_at: timestamptz | null
)


---

## Part 3 — Admin Fraud Review Dashboard

Add a Fraud Review section to 
the existing admin dashboard.

### Summary cards at the top
Show three summary cards:

Card 1: Accounts flagged this month
Card 2: Payouts currently on hold
Card 3: Suspicious plays detected 
this month

### Flagged accounts table
A table showing all creators with 
fraud_status of flagged or hold:

Columns:
- Creator name and username
- Track name
- Total plays
- Unique listeners
- Play to listener ratio
- Platform ratio
- Fraud score
- Status (Flagged or Hold)
- Flagged date
- Action buttons

### Action buttons per row
Three actions available per flagged account:

**Approve Payout**
Mark as reviewed. Release any held 
payout. Set admin_decision to approved.
Update fraud_status to clean.

**Withhold Payout**
Keep payout on hold for this period.
Set admin_decision to withheld.
Send automated email to creator:
"Your payout for this period is 
under review. We will be in touch 
within 5 working days."

**Ban Account**
Suspend the creator account.
Permanently withhold payout.
Set admin_decision to banned.
Send automated email to creator:
"Your account has been suspended 
due to a violation of our platform 
terms regarding play count integrity."

### Play detail view
Clicking any flagged creator row 
opens a detail panel showing:

- Full play history for the flagged track
- Breakdown of plays by user ID
- Breakdown of plays by IP address
- Timeline graph showing when plays occurred
- List of specific fraud signals triggered 
  with explanations

This gives Justice full context 
before making any decision.

### Monitor section
A secondary table showing creators 
with fraud_status of monitor.
Same columns but no action required yet.
Justice can manually escalate to 
flagged if something looks wrong.

---

## Part 4 — Payout Integration

### Before any payout is processed
Check creator_fraud_analysis for 
the current period.

If fraud_status is hold or flagged 
and reviewed_by_admin is false:
Block the payout automatically.
Notify Justice via admin dashboard 
notification:
"Payout blocked for [Creator Name] 
pending fraud review."

If fraud_status is clean or 
admin_decision is approved:
Allow payout to proceed normally.

If admin_decision is withheld or banned:
Block payout permanently for that period.

---

## Part 5 — Creator Notification

### When plays are flagged
Do not notify the creator in real time 
when individual plays are flagged. 
This would alert fraudulent actors 
to adjust their behaviour.

Only notify when a payout is withheld 
or an account is banned as described 
in Part 3.

---

## Immediate Action for Current 
## Suspicious Account

After building this system run 
a manual analysis on the account 
Justice has already identified 
with 10,000 plus plays.

Pull the following data from 
Supabase directly:

1. How many unique user IDs 
   generated those plays
2. How many unique IP addresses
3. The timeline of when plays occurred
4. Average play duration per session

Report findings in the admin 
dashboard before any payout 
decision is made.

---

## General Rules
- Never reject a play without 
  recording the reason
- Fraud detection runs silently 
  in the background
- Never notify creators that 
  their plays are being monitored
- All payout decisions require 
  admin review for flagged accounts
- Platform ratio threshold scales 
  automatically with user growth
- Match existing design system throughout
- No existing play tracking 
  functionality removed

---

## Acceptance Criteria

### Real Time Validation
- [ ] Minimum duration check works correctly
- [ ] Same user same track cooldown 
      flags correctly after 3 plays
- [ ] IP rate limit flags correctly
- [ ] Identical duration detection works
- [ ] Impossible velocity rejection works
- [ ] All flags recorded with reason

### Daily Fraud Job
- [ ] Job runs at 4AM daily
- [ ] Play to listener ratio calculated correctly
- [ ] Platform ratio threshold scales 
      with user count
- [ ] IP concentration score calculated
- [ ] Time clustering score calculated
- [ ] Fraud score calculated correctly
- [ ] Status assigned correctly by score range
- [ ] creator_fraud_analysis records created

### Admin Dashboard
- [ ] Summary cards display correctly
- [ ] Flagged accounts table displays correctly
- [ ] Monitor table displays correctly
- [ ] Play detail view opens correctly
- [ ] Approve payout works correctly
- [ ] Withhold payout works correctly
- [ ] Ban account works correctly
- [ ] Automated emails send correctly

### Payout Integration
- [ ] Payouts blocked for hold 
      and flagged accounts
- [ ] Admin notified when payout blocked
- [ ] Approved payouts release correctly
- [ ] Withheld and banned payouts 
      blocked permanently

### Immediate Analysis
- [ ] Manual analysis run on 
      identified suspicious account
- [ ] Results visible in admin dashboard
- [ ] No payout processed until 
      Justice reviews

### General
- [ ] No existing functionality broken
- [ ] Tested on web admin dashboard