
# Services Tab — Budget Filter, Location Matching 
# & Service Notification Preferences

## Before Writing Any Code
1. Find the Services tab in the Discover screen 
   and all existing mock data locations
2. Find the existing venue preferences system 
   including how price range and location are 
   set and stored — replicate this pattern 
   exactly for services
3. Find the existing Service Provider Dashboard 
   and all fields currently stored per provider
4. Find the existing opportunities/gigs feature 
   and how gig posts are structured in the 
   database
5. Find the existing notification preferences 
   screen and how users currently set venue 
   notification preferences
6. Find the existing push notification system
7. Report all findings before making any changes

---

## Part 1 — Replace Mock Data with Real Data

Remove all mock data from the Services tab 
completely. Replace with real service provider 
data from the database.

Default display rules:
- Show service providers within 30km of the 
  user's location by default
- Within that radius filter by the user's 
  saved budget preference if set
- If no preferences are set show all providers 
  within 30km ordered by proximity
- If no providers exist within 30km expand 
  to 60km automatically
- If still empty show the empty state

Empty state:
"No services listed in your area yet. 
Be the first to offer your services on 
SoundBridge."
CTA button: "Offer My Services" 
Deep link: Service Provider Dashboard setup screen

---

## Part 2 — Service Discovery Preferences

Following the exact same pattern as the existing 
venue preferences system, add a service discovery 
preferences section.

This should live in the same place as or 
adjacent to the existing venue preferences — 
check the codebase for where venue preferences 
are stored and mirror that structure exactly.

### Fields to store per user:

service_discovery_preferences (
user_id: UUID FK
max_distance_km: integer default 30
min_budget: decimal | null
max_budget: decimal | null
service_categories: string[] | null
notifications_enabled: boolean default true
updated_at: timestamptz
)

### UI — Service Preferences Screen

Add a Service Preferences option accessible from:
- The Services tab (filter/settings icon)
- Notification preferences screen
- Service Provider Dashboard

The screen should contain:

**Location radius:**
Slider or input — default 30km
Options: 10km, 20km, 30km, 50km, 100km, Nationwide

**Budget range:**
Min and max budget inputs
Label: "Show me services within this budget range"
Leave blank to see all budgets

**Service categories:**
Multi-select list of all service categories 
that exist in the platform:
- Music Production
- Mixing and Mastering
- Session Musician
- Vocalist / Backing Vocals
- Vocal Coaching
- Sound Engineering
- DJ Services
- Music Lessons
- Podcast Production
- Photography / Videography
- Any others already defined in the codebase

User can select multiple. If none selected 
show all categories.

**Save button** — saves preferences and 
immediately refreshes the Services tab 
with the new filters applied

---

## Part 3 — Gig/Opportunity Match Notifications 
## for Service Providers

### Notification Setup in Service Provider Dashboard

Inside the existing Service Provider Dashboard 
add a new section called "Gig Alerts" or 
"Opportunity Notifications."

This section allows service providers to:

1. Toggle on/off notifications for new gig 
   opportunities that match their services

2. Select which service categories they want 
   to be notified about:
   Same multi-select list as above but from 
   the provider's perspective — what kind of 
   gigs do they want to receive alerts for

3. Set their availability status:
   - Available now
   - Available from [date]
   - Not available

Store these preferences per user in a new 
table or extend the existing service provider 
dashboard table — check what already exists 
before creating new tables.

### Notification Trigger Logic

When a new gig or opportunity is posted on 
the platform:

1. Check the gig's required service category
2. Check the gig's location
3. Find all service providers who:
   - Have that service category in their 
     gig alert preferences
   - Are within the gig's specified radius
   - Have notifications enabled
   - Are marked as available
4. Send push notification to those providers

Notification copy:
Title: "New gig match near you"
Body: "[Service category] needed in [City]. 
[Date]. Tap to see the details."
Deep link: Opens the specific gig/opportunity 
listing

### Onboarding Nudge for Service Providers

If a user has set up a Service Provider 
Dashboard but has NOT enabled gig notifications, 
fire this nudge once:

Title: "Never miss a gig opportunity"
Body: "Set your gig alerts and we will notify 
you when someone near you needs your services."
Deep link: Opens the Gig Alerts section inside 
Service Provider Dashboard

### General User Nudge

For all users who have not visited the 
Service Provider Dashboard:

Title: "Are you a creator?"
Body: "Set up your service profile and get 
notified when gigs matching your skills 
come up near you."
Deep link: Opens Service Provider Dashboard 
setup screen

This nudge fires once only and is permanently 
dismissed after interaction.

---

## Part 4 — Services Tab UI Updates

Once real data and preferences are wired up, 
update the Services tab UI:

- Add a filter icon in the top right of the 
  Services tab that opens the Service 
  Preferences Screen
- Show active filters as small pill badges 
  below the tab header so users can see 
  what filters are applied
  Example: "Within 30km" "£0 to £100" "Mixing"
- Each pill badge should be tappable to 
  remove that specific filter
- Show a "No results for your filters" state 
  when filters return nothing, with a 
  "Adjust Filters" button

---

## Default Behaviour Summary
- Default radius: 30km from user location
- Default budget: no filter applied
- Default categories: all categories shown
- All defaults apply until user saves preferences
- Saved preferences persist across sessions 
  and devices

---

## Acceptance Criteria
- [ ] Mock data completely removed from 
      Services tab
- [ ] Real service provider data displayed
- [ ] 30km default radius applied
- [ ] Service discovery preferences screen 
      built following venue preferences pattern
- [ ] Budget filter works correctly
- [ ] Category filter works correctly
- [ ] Preferences saved and persist across 
      sessions
- [ ] Services tab filter icon opens 
      preferences screen
- [ ] Active filters shown as pill badges
- [ ] Gig Alerts section added to Service 
      Provider Dashboard
- [ ] Gig notification trigger logic implemented
- [ ] Notifications sent to matching providers 
      when new gig posted
- [ ] Onboarding nudge for providers without 
      gig alerts enabled
- [ ] General user nudge implemented
- [ ] Empty state displays correctly
- [ ] No existing functionality broken
- [ ] Tested on iOS Android and web
