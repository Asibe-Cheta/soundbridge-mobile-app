Implement ISRC assignment logic for track uploads with the following rules:

WHEN ACRCloud RETURNS MATCH:
- Use the detected ISRC from ACRCloud response
- Do NOT generate new ISRC
- If user claims track is original but ACRCloud found match: flag track for manual review with status "SUSPECTED_DUPLICATE"
- If user declares it's a cover: require original artist name and original title fields (mandatory), use detected ISRC

WHEN ACRCloud RETURNS NO MATCH:
- If user provided their own ISRC: use it
- If user did not provide ISRC: auto-generate new ISRC using format GB-SBR-26-XXXXX where XXXXX is sequential counter from database
- Store generated ISRC in track record with flag indicating "SOUNDBRIDGE_GENERATED"

FOR COVERS (regardless of ACRCloud match):
- Require mandatory fields: original_artist_name, original_song_title
- If ACRCloud matched: use detected ISRC
- If ACRCloud no match: generate new ISRC (their recording is new even if composition is not)
- Add metadata field is_cover = true

FOR ORIGINALS:
- If ACRCloud matched but user claims original: flag as "SUSPECTED_DUPLICATE", require manual review before going public
- If ACRCloud no match: generate ISRC automatically
- Add metadata field is_cover = false

SEQUENTIAL ISRC COUNTER:
- Maintain global counter in database starting at 1
- Increment atomically for each new ISRC generation
- Format: GB-SBR-26-00001, GB-SBR-26-00002, etc.
- Store counter value and last generated ISRC for audit trail

VALIDATION RULES:
- Never generate duplicate ISRCs
- Never assign new ISRC when ACRCloud already detected one
- Always validate cover uploads have original artist/title before accepting
- Flag any upload where user claims ownership but ACRCloud fingerprint matches existing recording

Update upload workflow to enforce these rules before track becomes publicly visible.