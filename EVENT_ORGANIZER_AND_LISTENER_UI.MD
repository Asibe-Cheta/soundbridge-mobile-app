Rename "Music Lover" Onboarding Category
Important — check existing code first: Locate the existing onboarding role selection screen where a user currently selects a category such as "music lover" (or whatever the exact current label is). This is a naming/copy change only.
What to build:
Rename the existing "music lover" (or equivalent current label) onboarding category to better reflect that it covers music listeners, podcast listeners, and mixtape listeners collectively, not music alone.
New label: "Music Lover / Podcast Listeners" (or, if character space is constrained in the existing UI component, "Audio Fan" or "Audio Lover" as a shorter alternative, use judgement based on existing label length conventions elsewhere in the onboarding flow).
Scope boundaries: This is a label/copy change only. Do not change the underlying role value, data model, or any logic tied to this category, only the user-facing display text. Confirm whether the underlying stored value (e.g. in the database or role enum) needs to stay the same for backward compatibility, only the displayed label should change unless explicitly told otherwise.
PROMPT 2 — Item 14: Event Organiser Onboarding Flow + Feed Banners
Important — check existing code first: Before building anything, inspect the existing onboarding role selection flow, the existing event creation screen, and the existing test feed screen's banner section (including the current Live Audio banner and the horizontal slider banners for Sound Academy and Abbey Road Institute beneath it). Reuse existing banner component styling, slider behaviour, and navigation patterns exactly.
What to build:
Part A, onboarding routing: When a user selects "Event Organiser" as their role during onboarding, route them directly to the existing event creation screen immediately after onboarding completes, rather than to the standard test feed screen.
Part B, feed screen banners for event organisers: For users whose role is identified as Event Organiser, when they do visit the test feed screen (e.g. on subsequent visits after their first event creation), adjust the banner section as follows:
Add a new banner, styled consistently with the existing horizontal slider banner design (matching the Sound Academy / Abbey Road Institute banner pattern), positioned before the existing Live Audio banner.
This new banner's copy: "Create My First Event" or "Create an Event" (use "Create My First Event" if the user has no existing events yet, "Create an Event" if they've already created at least one, if this distinction is feasible with existing data, otherwise use a single consistent label).
Tapping this banner navigates to the existing event creation screen.
Add a further banner, either in the same slider or as an additional slide, with copy along the lines of "Discover Artists" or "Discover Talent," linking to the existing creator/artist discovery experience, framed for an event organiser looking to book performers.
The existing Live Audio banner should remain in place, positioned after these new banners, not removed.
Scope boundaries: Only users identified as Event Organiser should see these additional/modified banners, other user roles should continue seeing the existing banner arrangement unchanged. Reuse the existing event creation screen and existing artist discovery screen, do not build new screens for either destination.
General rules for all three prompts:
Follow existing code style, component structure, and naming conventions throughout
Do not modify unrelated parts of the onboarding flow or feed screen beyond what's specified
Test that existing user roles (music listener, standard creator) remain unaffected by these changes