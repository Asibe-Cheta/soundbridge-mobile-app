# Platform Legal Protection & Terms Infrastructure

## Before Writing Any Code
1. Find the existing Terms of Service 
  page on the web app
2. Find the existing Privacy Policy page
3. Find the existing Copyright Policy 
  or DMCA page if any
4. Find the existing AML policy page 
  at soundbridge.live/aml-policy
5. Find how creator accounts are 
  currently created and what 
  agreements they accept at signup
6. Find any existing disclaimer or 
  liability language anywhere on 
  the platform
7. Report findings before making 
  any changes

---

## Overview
Strengthen SoundBridge's legal 
protection infrastructure by ensuring 
the following are clearly and 
explicitly stated across the platform:

1. Platform status as marketplace 
  not service provider
2. Creator independent contractor 
  status
3. Transaction liability limitations
4. Event promotion disclaimer
5. Content liability safe harbour
6. Service marketplace disclaimer
7. Dispute resolution process
8. Creator agreement at onboarding

---

## Part 1 — Terms of Service Updates

Review the existing Terms of Service 
and ensure the following sections 
are explicitly present. If any are 
missing or insufficiently clear 
add or strengthen them:

### Section — Platform Status

Add or strengthen the following 
language:

"SoundBridge Live Ltd operates as 
a technology platform and marketplace 
that connects audio creators with 
fans, clients and collaborators. 
SoundBridge is not a talent agency, 
record label, event promoter, 
booking agent, employer or service 
provider. SoundBridge does not 
create, endorse, verify the quality 
of, or take responsibility for any 
content, events, services or 
transactions facilitated through 
the platform."

### Section — Creator Independent 
### Contractor Status

"All creators, service providers 
and users on SoundBridge are 
independent third parties. They 
are not employees, agents, 
contractors or representatives 
of SoundBridge Live Ltd. 
SoundBridge bears no responsibility 
for the actions, content, services, 
events or conduct of any creator 
or user on the platform."

### Section — Transaction Liability

"SoundBridge facilitates payments 
between fans and creators as a 
payment intermediary only. 
SoundBridge does not guarantee 
the delivery of any content, 
service, experience or outcome 
in connection with any transaction 
processed through the platform. 
Disputes between fans and creators 
regarding transactions are the 
sole responsibility of the parties 
involved. SoundBridge's liability 
in connection with any transaction 
is limited to the platform fee 
collected on that transaction."

### Section — Event Promotion Disclaimer

"SoundBridge's intelligent event 
promotion service distributes event 
information to matched users on 
behalf of creators. SoundBridge 
does not organise, host, manage, 
supervise or take responsibility 
for any event listed or promoted 
on the platform. Creators who list 
events are solely responsible for 
the organisation, safety, legality 
and delivery of those events. 
SoundBridge bears no liability 
for any injury, loss, damage or 
disappointment arising from 
attendance at or participation 
in any event promoted through 
the platform."

### Section — Content Liability 
### and Safe Harbour

"SoundBridge complies with the 
Digital Millennium Copyright Act 
(DMCA) and the Copyright, Designs 
and Patents Act 1988. SoundBridge 
is registered as a DMCA Designated 
Agent (Registration No. DMCA-1070287). 
We respond promptly to valid 
takedown notices and operate 
under the safe harbour provisions 
available to platform operators 
under applicable law.

Creators are solely responsible 
for ensuring they have the right 
to upload all content they submit 
to the platform. SoundBridge does 
not pre-screen content for 
copyright compliance and is not 
liable for infringing content 
uploaded by creators before 
receiving a valid takedown notice."

### Section — Service Marketplace Disclaimer

"The SoundBridge service marketplace 
connects creators who offer 
professional audio services with 
clients seeking those services. 
SoundBridge does not vet, endorse, 
guarantee or take responsibility 
for the quality, accuracy, 
professionalism or delivery of 
any service listed or booked 
through the marketplace. Any 
contract for services is solely 
between the creator and the client. 
SoundBridge is not a party to 
any service agreement."

### Section — Dispute Resolution

"In the event of a dispute between 
users arising from a transaction, 
event or service on the platform, 
SoundBridge may at its sole 
discretion assist in facilitating 
a resolution but is under no 
obligation to do so. SoundBridge's 
decision in any dispute assistance 
process is not binding and does 
not constitute legal arbitration. 
Users agree to resolve disputes 
directly between themselves or 
through appropriate legal channels.

This agreement is governed by 
the laws of England and Wales."

---

## Part 2 — Creator Agreement 
## at Onboarding

When a new user registers as a 
creator on SoundBridge show a 
specific creator agreement screen 
before they can upload any content 
or list any services.

This is separate from the general 
Terms of Service accepted at signup.

### Creator Agreement Screen

Title: "Creator Agreement"

Subheadline: "Before you start 
uploading and earning on SoundBridge 
please confirm the following."

Show the following as a checklist 
the creator must actively tick 
before proceeding:

Checkbox 1:
"I confirm that I own or have 
the rights to all content I will 
upload to SoundBridge. I understand 
that uploading content I do not 
have rights to may result in 
removal of that content and 
termination of my account."

Checkbox 2:
"I understand that SoundBridge 
is a platform and marketplace. 
SoundBridge does not endorse, 
guarantee or take responsibility 
for my content, services or events."

Checkbox 3:
"I confirm that any events I 
list on SoundBridge are my sole 
responsibility including their 
organisation, safety and delivery. 
SoundBridge is not liable for 
anything that occurs at my events."

Checkbox 4:
"I confirm that any services I 
offer through the SoundBridge 
marketplace are provided by me 
as an independent contractor. 
I am not an employee or agent 
of SoundBridge."

Checkbox 5:
"I have read and agree to the 
SoundBridge Terms of Service, 
Privacy Policy and Creator 
Rights Agreement."

All five checkboxes must be 
individually ticked before the 
creator can proceed. A single 
bulk accept is not sufficient — 
each must be ticked separately 
to demonstrate informed consent.

Button: "I Agree — Start Creating"

Store the following in the database 
when the creator agrees:



creator_agreement_accepted: boolean
creator_agreement_accepted_at: timestamptz
creator_agreement_version: text – e.g. ‘v1.0’


---

## Part 3 — Event Creation Disclaimer

When a creator creates a new event 
show a one-line disclaimer below 
the publish button:

"By publishing this event you 
confirm you are solely responsible 
for its organisation, safety and 
delivery. SoundBridge promotes 
events on your behalf but bears 
no liability for any aspect of 
the event itself."

A checkbox: "I understand and accept 
responsibility for this event."

This must be ticked before the 
event can be published.

Store per event:


creator_event_disclaimer_accepted:
boolean default false
creator_event_disclaimer_accepted_at:
timestamptz | null


---

## Part 4 — Service Listing Disclaimer

When a creator lists a new service 
in the marketplace show a one-line 
disclaimer:

"By listing this service you confirm 
you are offering it as an independent 
contractor. SoundBridge is not a 
party to any service agreement 
between you and your clients."

Checkbox: "I understand."

Must be ticked before the service 
listing can go live.

---

## Part 5 — Footer Links

Ensure the following legal pages 
are linked in the website and 
app footer:

- Terms of Service
- Privacy Policy
- Copyright Policy
- AML Policy (soundbridge.live/aml-policy)
- DMCA Notice and Takedown

If any of these pages do not exist 
flag them for creation before 
this prompt is considered complete.

---

## General Rules
- All legal language must be added 
  to existing pages not new ones 
  where possible
- Do not remove any existing 
  legal language
- The creator agreement checkboxes 
  must be individually ticked 
  — no bulk accept
- Store all agreement acceptances 
  in the database with timestamps
- Match existing design system 
  throughout
- All changes apply to both 
  web app and mobile app 
  where relevant

---

## Acceptance Criteria
- [ ] Terms of Service updated with 
      all six sections
- [ ] Platform status language 
      clearly stated
- [ ] Creator independent contractor 
      language clearly stated
- [ ] Transaction liability limitation 
      clearly stated
- [ ] Event promotion disclaimer 
      clearly stated
- [ ] Content safe harbour language 
      clearly stated
- [ ] Service marketplace disclaimer 
      clearly stated
- [ ] Dispute resolution section present
- [ ] Creator agreement screen added 
      to creator onboarding
- [ ] All five checkboxes individually 
      ticked before proceeding
- [ ] Creator agreement acceptance 
      stored in database with timestamp
- [ ] Event creation disclaimer 
      checkbox added
- [ ] Event disclaimer acceptance 
      stored per event
- [ ] Service listing disclaimer 
      checkbox added
- [ ] All legal pages linked in footer
- [ ] No existing legal content removed
- [ ] Tested on mobile and web


