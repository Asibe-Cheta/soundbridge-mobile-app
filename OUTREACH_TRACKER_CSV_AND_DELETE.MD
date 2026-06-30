# Outreach Tracker — Bulk Delete and CSV Import

## Before Writing Any Code
1. Find the existing outreach_contacts table and 
   Outreach Tracker screen built in the previous prompt
2. Find the existing contact_type enum values currently 
   in use
3. Find if any CSV parsing library is already used 
   anywhere in the codebase
4. Report findings before making any changes

---

## Overview
Add two capabilities to the existing Outreach Tracker, 
restricted to the same two internal accounts only, 
bulk deletion of contacts, and CSV import to populate 
contacts in bulk from a correctly formatted file.

---

## Part 1 — Update Contact Type Categories

Expand the existing contact_type allowed values to:
'institution' 'artist' 'choir' 'church' 'venue' 
'media' 'partner' 'other'

These map to the exact CSV values Institution, Artist, 
Choir, Church, Venue, Media, Partner, Other 
respectively, lowercased on import.

---

## Part 2 — Bulk Delete

### Select mode
Add a "Select" button to the top of the Outreach 
Tracker contact list. Tapping it enters select mode, 
showing a checkbox on the left of every contact card.

### Selecting and deleting
The user can tap any number of checkboxes. A bar 
appears at the bottom showing "[number] selected" 
and a "Delete Selected" button.

Tapping Delete Selected shows a confirmation dialog:

"Delete [number] contacts? This cannot be undone."

Options: "Cancel" or "Delete"

On confirming, all selected outreach_contacts records 
are permanently deleted, along with any associated 
outreach_meetings records for those contacts.

### Exiting select mode
A "Cancel" button at the top exits select mode without 
deleting anything.

---

## Part 3 — CSV Import

### Entry point
Add an "Import CSV" button near the existing "Add 
new contact" button on the Outreach Tracker screen.

### Required CSV format
The file must contain these exact column headers, 
case-sensitive, in any order as long as headers match:

Contact Name, Organisation Name, Contact Type, 
Meeting Held, On Platform, Profile Completed, 
Invited Others, Notes

Contact Type accepted values, exact match only, 
case-insensitive: Institution, Artist, Choir, Church, 
Venue, Media, Partner, Other

Meeting Held, On Platform, Profile Completed, Invited 
Others accepted values, exact match only, 
case-insensitive: Yes, No

### Import flow
1. User selects a CSV file from their device
2. Validate the header row matches required columns exactly
3. If headers do not match, show error: "This file 
   does not match the required format. Expected 
   columns: Contact Name, Organisation Name, Contact 
   Type, Meeting Held, On Platform, Profile Completed, 
   Invited Others, Notes"
4. If headers match, process each row:
   - Contact Name is required, skip and flag any row 
     where it is blank
   - Contact Type must exactly match one of the allowed 
     values, skip and flag any row where it does not
   - Meeting Held, On Platform, Profile Completed, 
     Invited Others must exactly be Yes or No, skip 
     and flag any row where it does not, do not guess 
     or default
5. Show an import summary before committing:
   "[number] contacts ready to import. [number] rows 
   skipped due to errors."
   List the specific skipped rows with the reason, 
   for example "Row 4: Contact Type 'choirs' does not 
   match an accepted value"
6. "Confirm Import" button creates outreach_contacts 
   records for all valid rows only
7. "Cancel" discards the import entirely

### No AI involved
This import must use exact string matching only, no 
fuzzy matching, no AI interpretation of ambiguous 
values. Invalid values are rejected and reported, 
never guessed.

---

## General Rules
- Both features restricted to is_internal_team flagged 
  accounts only, same access control as the rest of 
  the Outreach Tracker
- Bulk delete requires explicit confirmation, no 
  accidental mass deletion possible
- CSV import is strict and exact, never silently 
  corrects or assumes values
- Match existing design system throughout
- Test on iOS and Android

---

## Acceptance Criteria
- [ ] contact_type values expanded to include choir, 
      venue, media, partner
- [ ] Select mode works correctly with checkboxes 
      per contact
- [ ] Delete Selected shows correct count and 
      confirmation dialog
- [ ] Confirmed deletion removes contacts and 
      associated meetings correctly
- [ ] Cancel exits select mode without changes
- [ ] Import CSV button visible and functional
- [ ] Header validation correctly rejects mismatched files
- [ ] Row validation correctly flags missing names, 
      invalid contact types, invalid Yes/No values
- [ ] Import summary correctly shows valid and skipped 
      row counts with specific reasons
- [ ] Confirm Import creates only valid records
- [ ] Cancel discards import correctly
- [ ] No AI or fuzzy matching used anywhere in import logic
- [ ] No existing functionality broken
- [ ] Tested on iOS and Android
