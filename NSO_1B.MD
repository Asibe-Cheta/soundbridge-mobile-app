FULL CURSOR PROMPT — Self-Service Sound Division Tagging UI
Important — check existing code first: Inspect the existing sound_movements, sound_divisions, and track_sound_divisions data model built for Item 40, the existing SoundDivisionService.ts, and the existing track/profile management screens where a creator manages their own uploaded content.
What to build:
A simple, creator-facing interface allowing an artist recognised as belonging to a sound movement (currently just NSO/Dan RicHee, but built generally, not hardcoded to one artist) to assign Sound Division tags to their own tracks directly, without requiring backend or database access from the SoundBridge team.
Access gating: This interface should only be visible to artists whose account is associated with a movement that has Sound Divisions defined (query sound_movements and check if the current artist is the founding artist or a recognised member, however that association is currently modelled). Most creators, who aren't part of any movement structure, should never see this UI at all.
Functionality:
For each of the artist's own uploaded tracks, show the available Sound Divisions for their associated movement (e.g. Pulse Culture, Rhythm Forge, Soul Motion, Fierce Fusion for NSO)
Allow the artist to select one or more divisions per track (matching the existing many-to-many track_sound_divisions model, no one-division-per-track or one-division-per-artist restriction)
Saving writes directly to track_sound_divisions, the same table already used by the manual insert process, so this UI simply provides a front-end for the same underlying data operation, not a new data model
Important distinction to preserve in the UI copy: Make clear this is separate from the track's genre, which remains a standard, unrelated field. Label this clearly as "Sound Division" or similar, not conflated with genre in the interface.
Scope boundaries:
Do not modify the existing genre field or its selection flow
Do not build movement/division creation or management in this UI, that remains an admin/backend function, this UI only lets an already-recognised artist assign divisions to their own tracks from the existing, already-defined set
Do not change how the badge displays on profile/track pages, only how the underlying tagging data gets created
General rules:
Follow existing code style and reuse the existing SoundDivisionService.ts and data model exactly as built
Ensure this works consistently on both mobile and web, matching how Item 40's badge display was built consistently across both platforms
