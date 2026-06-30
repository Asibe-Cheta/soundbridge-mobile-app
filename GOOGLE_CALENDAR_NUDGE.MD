Both are good additions. Let me address both quickly before writing them into a short prompt.

On the Google Calendar nudge:
A subtle in-app prompt that appears once after a few app opens is smart. Not a popup that interrupts. A dismissible banner or card that appears naturally in the feed or settings. Show it once, maybe twice. After the user dismisses it twice never show it again.

On notification timing preferences:
This is genuinely valuable and you are right that it belongs in the event preferences screen. Currently you know what genre and location people want. Adding when they want to receive notifications and which months or seasons they are likely to attend events makes the intelligence significantly more accurate. Someone who only attends events in summer, or only on weekends, or only receives notifications in the evening — that data makes every notification more relevant and less likely to be ignored or turned off entirely.

Both additions are simple and can go into one short prompt:

# Google Calendar Nudge and 
# Notification Timing Preferences

## Before Writing Any Code
1. Find the existing event preferences 
   screen in the mobile app
2. Find the existing feed or home 
   screen where a nudge banner 
   could appear
3. Find how in-app banners or 
   dismissible cards are currently 
   implemented
4. Find the existing notification 
   preferences system
5. Report findings before making 
   any changes

---

## Part 1 — Google Calendar Connect Nudge

### What to build
A subtle dismissible banner that 
appears in the app to encourage 
users to connect their Google Calendar.

### When to show it
Show the banner on the third app 
open after the Google Calendar 
integration feature goes live, 
if the user has not yet connected 
their calendar.

Show it a maximum of two times total. 
After the user dismisses it twice 
never show it again.

Do not show it on the first or 
second app open — give the user 
time to settle in first.

### Banner design
A subtle card or banner that appears 
at the top of the feed or home screen. 
Not a full screen modal. Not a popup. 
A soft non-intrusive card only.

Content:

Small icon: Google Calendar logo
Headline: "Get events that fit 
your schedule"
Body: "Connect Google Calendar 
and we will only suggest events 
when you are actually free."
Button: "Connect Calendar"
Dismiss: A small X icon in the 
top right corner

Tapping Connect Calendar opens 
the Google Calendar connection 
flow built in the previous prompt.

Tapping X dismisses the banner 
and increments the dismiss counter.

### Database additions
Add to profiles:



calendar_nudge_shown_count:
integer default 0
calendar_nudge_last_shown_at:
timestamptz | null


Increment calendar_nudge_shown_count 
each time the banner is shown.
Never show again once count reaches 2.

---

## Part 2 — Notification Timing 
## Preferences

### Where to add it
Add two new preference sections 
to the existing event preferences 
screen in the mobile app.

Do not create a new screen. 
Add these sections to the 
existing one.

---

### Section 1 — Preferred notification time

Label: "When would you like to 
hear about events?"

Show four options as selectable 
pills — user can select one or more:

- Morning (before 12PM)
- Afternoon (12PM to 5PM)
- Evening (5PM to 9PM)
- Any time

Default: Any time

Store on user preferences:
preferred_notification_times: text[]

SoundBridge sends event notifications 
at the user's preferred time of day 
rather than immediately when the 
event is created.

---

### Section 2 — Event attendance window

Label: "How far ahead do you plan 
for events?"

Show four options as selectable 
pills — user selects one:

- Last minute (within 1 week)
- A few weeks ahead
- 1 to 3 months ahead
- Any time

Default: Any time

Store on user preferences:
event_planning_window: text

SoundBridge uses this to time 
event notifications appropriately. 
A user who plans last minute should 
not receive notifications 3 months 
in advance. A user who plans ahead 
should receive early notifications 
as soon as events are listed.

---

### Section 3 — Active months 
### (optional)

Label: "Which months are you most 
likely to attend events?"
Subtext: "Optional — skip if you 
attend events year round"

Show all 12 months as selectable 
pills. User can select any combination 
or leave all unselected to indicate 
year-round availability.

Store on user preferences:
active_event_months: integer[] 
-- e.g. [6, 7, 8, 12] for June 
-- July August December

When active_event_months is set 
only send event notifications 
during those months.

---

## General Rules
- Calendar nudge banner is subtle 
  and non-intrusive
- Never show nudge more than twice
- Notification timing preferences 
  added to existing screen only
- All new preference fields are 
  optional with sensible defaults
- Existing event preferences 
  unchanged
- Match existing design system 
  throughout
- Test on iOS and Android

---

## Acceptance Criteria

### Calendar Nudge
- [ ] Banner appears on third app 
      open if calendar not connected
- [ ] Banner shows maximum twice
- [ ] Never shows after two dismissals
- [ ] Connect Calendar opens OAuth flow
- [ ] X button dismisses correctly
- [ ] Dismiss counter increments correctly
- [ ] Banner never intrusive or 
      full screen

### Notification Timing
- [ ] Preferred notification time 
      selector added to event 
      preferences screen
- [ ] Event planning window selector 
      added to event preferences screen
- [ ] Active months selector added 
      to event preferences screen
- [ ] All three sections save correctly
- [ ] Notification timing used when 
      dispatching event notifications
- [ ] Planning window used to time 
      notifications correctly
- [ ] Active months filters 
      notifications correctly
- [ ] Defaults work correctly 
      when fields left empty
- [ ] No existing preferences broken
- [ ] Tested on iOS and Android
