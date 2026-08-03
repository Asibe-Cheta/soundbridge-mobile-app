# Web Team Question — "We've hit X users" Milestone Notification

**From:** Justice (mobile)
**Re:** Outdated user milestone notification

---

## The problem

There is a notification somewhere in the app (likely surfaced to users on the web and/or mobile web) that reads something like:

> "We've just hit 1000 users"

The platform now has **over 2,000 registered accounts** (visible in the admin dashboard → "Total Accounts (Platform): 2113"). This copy is stale and needs to update dynamically as the platform crosses each new thousand-user milestone.

---

## Question for the web team

**Where is this notification rendered?**

We need to know:
1. Which component / file renders the "we've just hit X users" copy?
2. What data source does it read from — is it hardcoded, pulled from a config value, or queried live from the DB?
3. Is the trigger for showing this notification based on a static string, a threshold check, or something else?

---

## What we want it to do instead

Replace the hardcoded "1000 users" copy with a **dynamic milestone message** that:

1. Reads the current total user count from whatever source already powers the "Total Accounts (Platform)" stat in the admin dashboard (so there's no new data source to wire up)
2. Rounds down to the nearest completed thousand milestone
3. Uses **"over X,000"** phrasing — never the exact number

### Copy formula

```
currentUsers = total registered accounts (auth.users count)
milestone    = floor(currentUsers / 1000) * 1000

if milestone < 1000 → don't show the notification (or suppress it)
if milestone >= 1000 → show: "We've just hit over {milestone.toLocaleString()} users"
```

### Examples

| Total accounts | Milestone shown |
|---|---|
| 1,050 | "We've just hit over 1,000 users" |
| 2,113 | "We've just hit over 2,000 users" ← current state |
| 3,400 | "We've just hit over 3,000 users" |
| 10,200 | "We've just hit over 10,000 users" |

### Suggested full copy

> "We've just hit **over 2,000 users** — thank you for being part of SoundBridge."

(Swap 2,000 for whatever the current milestone is.)

---

## Ideal behaviour

- The milestone copy should re-evaluate on each render / page load — no manual update needed as we keep growing
- If the notification has a "dismiss" mechanic, the dismissal should reset when the milestone number increases (so crossing 3,000 shows the banner again even if the user dismissed the 2,000 one)
- No new DB table or endpoint needed — use whatever query already backs the "Total Accounts (Platform)" admin stat

---

## Summary

Please let Justice know:
1. Where the notification is rendered (file / component name)
2. Whether the copy is hardcoded or config-driven
3. Once identified, apply the dynamic milestone formula above so it never goes stale again
