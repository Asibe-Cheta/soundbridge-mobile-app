```markdown
# Content Category Duration Validation
# Podcast and Audiobook Filtering

## Before Writing Any Code
1. Find the existing upload screen, referred to 
   as the test upload screen
2. Find the existing audio_tracks table and how 
   category or content_type is currently stored
3. Find how track duration is currently captured 
   on upload
4. Find the existing Discover screen tabs for 
   Music, Podcasts, Audiobooks and Mixtapes
5. Report findings before making any changes

---

## Overview
Some users are uploading short music tracks but 
categorising them as Podcast or Audiobook, which 
causes them to incorrectly appear in those tabs 
on the Discover screen. This prompt adds duration 
validation at upload time going forward, and 
migrates existing miscategorised content already 
in the database.

Mixtapes are intentionally excluded from this 
validation for now, duration alone is not a 
reliable filter for that category.

---

## Part 1 — Duration Thresholds

Podcast minimum duration: 8 minutes (480 seconds)
Audiobook minimum duration: 15 minutes (900 seconds)

These thresholds safely exclude virtually all 
music tracks while still allowing legitimate 
shorter podcast episodes and audiobook chapter 
uploads.

---

## Part 2 — Upload Time Validation

### On the test upload screen
After a creator selects Podcast or Audiobook as 
the content category and the audio file has been 
processed, check the actual duration of the file 
before allowing the upload to proceed.

### If category is Podcast and duration is under 
### 8 minutes
Block the upload and show:

"This does not meet the typical length for a 
podcast. Podcasts on SoundBridge are usually at 
least 8 minutes long. If this is a music track, 
please select Music as the category instead, or 
upload a longer recording."

Do not allow the upload to complete in the Podcast 
category until either the category is changed or 
a longer file is provided.

### If category is Audiobook and duration is under 
### 15 minutes
Block the upload and show:

"This does not meet the typical length for an 
audiobook. Audiobooks on SoundBridge are usually 
at least 15 minutes long. If this is a music 
track, please select Music as the category 
instead, or upload a longer recording."

Same blocking behaviour as above.

### Music and Mixtape categories
No duration restriction applied, uploads proceed 
as normal.

---

## Part 3 — Migration of Existing Miscategorised Content

Write a one time migration script that runs 
against existing data:

```
UPDATE audio_tracks
SET category = 'music'
WHERE category = 'podcast'
AND duration_seconds < 480;

UPDATE audio_tracks
SET category = 'music'
WHERE category = 'audiobook'
AND duration_seconds < 900;
```

Adjust the exact column and table names to match 
what is found in step 3 of the investigation above.

### Reporting
After running the migration, output a summary:
- Total tracks moved from Podcast to Music
- Total tracks moved from Audiobook to Music

Display this summary in the admin dashboard or 
as a console log, whichever is more accessible, 
so the actual scale of the problem is visible.

---

## Part 4 — Optional Creator Notification

For each track migrated, optionally send the 
creator a brief notification:

"Your upload [Track Title] has been recategorised 
from [Podcast or Audiobook] to Music, based on 
its length. If you believe this was incorrect, 
please reach out to us."

This is optional, implement only if straightforward 
given the existing notification system, otherwise 
skip it.

---

## General Rules
- Mixtape category is not affected by this change
- Validation applies at upload time going forward
- Migration applies once to existing data, does 
  not need to run repeatedly
- Do not delete any content, only recategorise
- Match existing design system for any new error 
  messaging
- Test on iOS Android and web

---

## Acceptance Criteria
- [ ] Podcast uploads under 8 minutes blocked 
      with correct error message
- [ ] Audiobook uploads under 15 minutes blocked 
      with correct error message
- [ ] Music and Mixtape uploads unaffected
- [ ] Migration script correctly identifies and 
      moves existing miscategorised tracks
- [ ] Summary report shows accurate counts of 
      tracks moved
- [ ] Podcast and Audiobook tabs on Discover 
      screen no longer show music tracks after 
      migration runs
- [ ] No existing functionality broken
- [ ] Tested on iOS Android and web
```

🙏🏾