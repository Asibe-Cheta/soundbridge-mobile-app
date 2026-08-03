FULL CURSOR PROMPT 2 — Populate Talent Categories: Backend Inference + User Self-Identification Modal
Important — check existing code first: Inspect the existing user/creator profile data model, existing content type flags (e.g. whether a user has uploaded podcast episodes, mixtapes, or standard tracks), and the existing institutional badge field (Item 11, e.g. Sound Academy badge). Also inspect the existing app launch/session flow to determine where a one-time modal can be inserted for existing users on their next app open.
The problem: The Talent Discovery screen categories (DJs, Podcasters, Audio Engineers, etc.) currently return no results, because no field in the data model tracks a creator's professional category. Existing creators who are genuinely DJs, podcasters, or audio engineers are not labelled as such anywhere in the system.
Part A: Backend inference, immediate quick-fix for existing users
Add a professional category field to the creator profile data model (e.g. talent_categories, supporting multiple values per user, since a creator may fit more than one). Run a one-time backfill process that infers and assigns categories to existing creators based on current signals:
If a creator has uploaded podcast-type content, assign the "Podcaster" category
If a creator has uploaded mixtape-type content, assign the "DJ" category
If a creator holds the Sound Academy institutional badge (from Item 11), assign the "Audio Engineer" category
Apply similar logic for any other existing content-type or badge signals that clearly map to a specific professional category, if additional clear signals exist in the current data beyond these three, infer from them too, only where the mapping is genuinely unambiguous
This inference should run once as a backfill for existing users, and should also apply automatically going forward whenever a new upload or badge assignment occurs, so newly qualifying users are captured without needing to wait for the next full backfill.
Part B: User self-identification modal, for accuracy and categories inference can't cover
Build a one-time modal, shown to users on their next app launch after this feature ships, prompting them to self-identify their professional category or categories. Example copy: "Help us improve your experience, are you a musician, podcaster, DJ, audio engineer, or something else? Select all that apply."
Present as a multi-select checkbox list, not single-choice, since a user may genuinely fit more than one category (e.g. session musician and backup vocalist)
Include a reasonably comprehensive set of options: Musician/Singer, Session Musician, Backup Vocalist, Vocal Coach, DJ, Podcaster, Audio Engineer, Producer, and any other categories relevant to the existing genre/role taxonomy already used elsewhere in the app
Include a clear "None of the above" or "Skip for now" option, do not force a selection if the user doesn't identify with any listed category
On submission, store the selected categories in the same talent_categories field used for backend inference in Part A, merging with (not overwriting) any categories already inferred automatically
This modal should only appear once per user, do not show it repeatedly on every launch, track a flag (e.g. talent_category_prompted) to ensure it only appears the first time
Scope boundaries:
Both inferred and self-identified categories should populate the same underlying field, so the Talent Discovery screen queries one consistent data source regardless of how a category was assigned
Do not remove or override a user's self-identified categories with future automatic inference, once a user has explicitly self-identified, treat that as authoritative for those categories, only use inference to fill gaps for users who haven't yet self-identified
General rules:
Follow existing code style, modal/prompt patterns, and data model conventions throughout
Ensure the backfill process is efficient and doesn't cause performance issues if run against the full existing user base at once, batch it if necessary