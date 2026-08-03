**FULL CURSOR PROMPT — Legal Upload Confirmation Checkbox (Item 10, technical part)**

---

**Important — check existing code first:** Before building anything, inspect the existing music/track upload flow, including any existing confirmation steps, checkboxes, or terms acceptance already present. Reuse existing form component styling, checkbox patterns, and validation conventions rather than introducing a new UI pattern.

**What to build:**

Add a mandatory confirmation checkbox to the upload flow, requiring the uploading creator to affirmatively confirm they own or have the necessary rights to license the content they're uploading, both the recording (masters) and the underlying composition (publishing), before the upload can be submitted.

**Placement:**

Position this checkbox as a required step at the final stage of the upload flow, immediately before the submit/publish action, not buried earlier in the process where it could be skipped or forgotten.

**Checkbox copy:**

"I confirm that I own, or have the necessary rights and permissions, to distribute this recording and its underlying composition, including any samples, co-writes, or featured artists."

**Validation behaviour:**

- The upload cannot be submitted unless this checkbox is checked. If the user attempts to submit without checking it, show a clear inline validation message (e.g. "Please confirm you have the rights to upload this content before continuing") rather than a silent failure or generic error.
- This applies to every upload, single tracks, albums, and any other content type currently supported by the upload flow.

**Data requirements:**

Record the confirmation as part of the upload record in the database, timestamped, alongside the existing upload metadata (creator ID, track ID, upload date). Follow existing schema and naming conventions for how upload records are currently stored. This creates a durable, evidenced record that the creator affirmatively made this claim at the point of upload, useful if a rights dispute arises later.

**Scope boundaries:**

- This prompt covers only the confirmation checkbox and its validation/recording, it does not cover the separate Terms of Service legal drafting itself, which requires a solicitor, not code
- Do not modify or rebuild any other part of the existing upload flow beyond adding this checkbox and its validation
- Do not add this confirmation to already-existing, previously uploaded content retroactively, this applies going forward from implementation only, unless explicitly instructed otherwise

**General rules:**

- Follow existing code style, form validation patterns, and component structure throughout
- Ensure the checkbox and its copy render clearly and are not visually easy to miss or dismiss without reading

---

That's ready for Cursor. Once this is live, next up would be Item 8 Phase 1 or Item 1, whichever you'd like to tackle next.