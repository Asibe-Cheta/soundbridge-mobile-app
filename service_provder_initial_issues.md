Here's the full picture. There are 23 issues across every section — some will crash the app, others will silently reject backend saves.

Critical Crashes (Will break the screen)
1. Earnings — Field Name Mismatch
The service returns snake_case fields but the UI expects camelCase:

UI expects	Service actually returns
totalEarnings	total_earnings
availableBalance	(doesn't exist)
pendingBalance	pending_earnings
Result: Even with the ?? 0 fix, all 3 cards always show 0.00. The "Request Payout" button is always enabled because undefined <= 0 is falsy.

Also — the service uses Math.random() mock data, so users see different numbers every page reload.

2. Badges — null.toFixed(1) crash
average_rating is typed as number | null. The && guard doesn't filter out null (only undefined/falsy), so .toFixed(1) is called on null → crash.

Backend Save Failures (API will reject silently)
3. Offerings — Wrong field names sent to API
Form sends	Database column expects
rate_amount	rate
rate_unit	unit
description	not in ServiceOfferingInput type at all
Every offering create/update will either fail or save wrong values.

4. Portfolio — Wrong field name
Form uses display_order but database column is sort_order. Portfolio ordering will never save.

5. Availability — Multiple field mismatches
Form sends	Database expects
start_time	start_at
end_time	end_at
recurrence: 'daily'	recurrence_rule (needs RRULE string format e.g. FREQ=DAILY)
(nothing)	timezone (never set)
Also, the recurring badge (slot.is_recurring) references a field that doesn't exist in the database type — the correct field is recurrence_rule. Badge never shows.

Missing Data (UI falls back to placeholders)
6. Bookings — Relations not joined
booking.booker → not populated from API (DB only has booker_id). Always shows "Client".
booking.offering → not populated from API (DB only has offering_id). Always shows "Custom service".
7. Verification — last_submission not mapped
fetchVerificationStatus transforms the API response but never populates last_submission, so the "Last submitted" date/notes section never renders.

8. Reviews — No reviewer name
Only reviewer_id is returned. The dashboard tries to show User ${reviewer_id.substring(0,8)} — no display name joined from profiles.

Summary by Severity
Severity	Count	Examples
Critical crash	2	Earnings field mismatch, average_rating.toFixed(null)
Silent save failure	4	Offerings, portfolio, availability field mismatches
Missing data/logic	7	Bookings not joined, mock earnings, missing timezone
Low / cosmetic	10	Date guards, reviewer name, category selector
Want me to fix all of these now? I'd suggest tackling them in this order:

Earnings field mapping + real data (or at minimum correct field names)
average_rating null guard
Offerings field names (rate_amount→rate, rate_unit→unit)
Portfolio display_order→sort_order
Availability field names + recurrence_rule mapping
Booking relations + is_recurring fix