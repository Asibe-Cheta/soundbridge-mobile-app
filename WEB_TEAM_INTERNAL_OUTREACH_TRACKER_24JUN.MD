# Web Team — Internal Outreach Tracker
Date: 24 Jun 2026

## Overview

This is a restricted internal CRM feature visible only to two specific accounts, controlled entirely by a DB flag. Mobile reads `is_internal_team` from `profiles` and gates the screen — no email addresses are in the mobile client code.

---

## Step 1 — Add `is_internal_team` to profiles

```sql
alter table public.profiles
  add column if not exists is_internal_team boolean not null default false;

-- Set the flag for the two internal accounts only
update public.profiles
set is_internal_team = true
where id in (
  select id from auth.users
  where email in ('asibechetachukwu@gmail.com', 'merituche2003@gmail.com')
);
```

---

## Step 2 — Create outreach tables

```sql
create table if not exists public.outreach_contacts (
  id                    uuid        primary key default gen_random_uuid(),
  contact_name          text        not null,
  organisation_name     text,
  contact_type          text        not null check (contact_type in ('institution','artist','choir','church','venue','media','partner','other')),
  notes                 text,
  meeting_held          boolean     not null default false,
  meeting_held_at       timestamptz,
  on_platform           boolean     not null default false,
  on_platform_at        timestamptz,
  profile_completed     boolean     not null default false,
  profile_completed_at  timestamptz,
  has_invited_others    boolean     not null default false,
  has_invited_others_at timestamptz,
  created_by            uuid        not null references public.profiles(id) on delete cascade,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.outreach_meetings (
  id                      uuid        primary key default gen_random_uuid(),
  contact_id              uuid        not null references public.outreach_contacts(id) on delete cascade,
  scheduled_at            timestamptz not null,
  meeting_link_or_location text,
  reminder_sent           boolean     not null default false,
  created_by              uuid        not null references public.profiles(id) on delete cascade,
  created_at              timestamptz not null default now()
);
```

---

## Step 3 — Row Level Security

Both tables: only `is_internal_team = true` accounts have any access.

```sql
alter table public.outreach_contacts enable row level security;

create policy "outreach_contacts_internal_only" on public.outreach_contacts
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_internal_team = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_internal_team = true
    )
  );

alter table public.outreach_meetings enable row level security;

create policy "outreach_meetings_internal_only" on public.outreach_meetings
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_internal_team = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_internal_team = true
    )
  );
```

---

## Step 4 — Edge function cron (90-minute meeting reminder)

Mobile has created the edge function at:
`supabase/functions/outreach-meeting-reminders/index.ts`

It queries meetings where `scheduled_at BETWEEN now() + 85min AND now() + 95min AND reminder_sent = false`, sends Expo push notifications to all `is_internal_team = true` users' `expo_push_token`s, then sets `reminder_sent = true`.

**Please register this as a cron job running every 5 minutes:**

```sql
select cron.schedule(
  'outreach-meeting-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/outreach-meeting-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

The function needs `EXPO_ACCESS_TOKEN` in its Supabase secrets (same token already used by `send-event-notifications`).

---

## Constraint Update — 25 Jun 2026 (CSV Import)

The `contact_type` check constraint has been expanded to include `choir`, `media`, and `partner`. If the migration from Step 2 has already been applied, please run:

```sql
-- Drop and recreate the check constraint with the expanded values
alter table public.outreach_contacts
  drop constraint if exists outreach_contacts_contact_type_check;

alter table public.outreach_contacts
  add constraint outreach_contacts_contact_type_check
    check (contact_type in ('institution','artist','choir','church','venue','media','partner','other'));
```

---

## Indexes (recommended)

```sql
create index if not exists idx_oc_created_by   on public.outreach_contacts (created_by);
create index if not exists idx_oc_updated_at   on public.outreach_contacts (updated_at desc);
create index if not exists idx_om_contact_id   on public.outreach_meetings (contact_id);
create index if not exists idx_om_scheduled_at on public.outreach_meetings (scheduled_at);
create index if not exists idx_om_reminder     on public.outreach_meetings (reminder_sent) where reminder_sent = false;
```

---

## Notes

- Mobile never references the email addresses `asibechetachukwu@gmail.com` or `merituche2003@gmail.com` in client code. Access is controlled purely via `profiles.is_internal_team`.
- If a non-internal user somehow navigates to the `OutreachTracker` route, the screen silently redirects to `TestFeed` with no error.
- Both internal users receive every meeting reminder, regardless of who scheduled the meeting.
- `reminder_sent` is set to `true` immediately after the push is sent to prevent duplicate notifications.
