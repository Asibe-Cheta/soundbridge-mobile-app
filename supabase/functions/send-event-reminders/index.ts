// Event reminders + announcement catch-up. Runs on a schedule (pg_cron, see
// migration 20261116020000_event_reminders_cron.sql), not tied to any single
// event like send-event-notifications is. Three things happen on every run:
//
// 1. Announcement catch-up: for every active, non-cancelled event in the next
//    30 days, re-runs find_nearby_users_for_event and sends the announcement
//    (type 'event_announcement') to anyone newly eligible who never got it —
//    new signups, newly granted push permission, a preference change that
//    now matches. Capped at 1 per user per REAL CALENDAR DAY (checked
//    against notification_history, not just this run), always the
//    nearest-by-date qualifying event — so a brand new user with many
//    nearby upcoming events gets one a day, not a pile at once, and
//    announcements can never consume enough of the daily quota to crowd out
//    a reminder. Anything past the day's one just waits for a later run,
//    dedupe never loses it. Processed AFTER both reminder passes below in
//    every run, so a reminder always gets first claim on the shared daily
//    quota.
// 2. 48-hour reminder (type 'event_reminder_48h') for events roughly 44-52
//    hours out — a window wide enough that a 6-hourly cron can't miss it.
// 3. Day-of reminder (type 'event_reminder_day_of') for events whose LOCAL
//    calendar day (approximated from events.country, see
//    COUNTRY_UTC_OFFSET_HOURS) is the same as today's local calendar day at
//    that same approximate offset, and which have not started yet.
//
// Dedupe for all three is per (event_id, type) via notification_history,
// not per event_id alone — see the migration for why that matters once an
// event has more than one notification type in its history.
//
// Every send reuses find_nearby_users_for_event exactly as-is, so the
// location fix, category preference check and is_internal_team exclusion
// all apply automatically, no duplicated logic.
//
// POST body (all optional):
// - dryRun: true => reports what would be sent without sending or recording
//   anything.
// - testIncludeInternalTeam: true => passes p_include_internal_team=true to
//   find_nearby_users_for_event for this run only, so a manual test against
//   a throwaway event can verify against internal/test accounts without
//   touching real users or re-flagging anyone. The scheduled cron invocation
//   never sends this, so production runs are never affected by it.
// - eventId: restricts this run to a single event, for manual testing. All
//   selection logic (date windows, country restriction) is bypassed for
//   that one event, only hasNotStarted and testIncludeInternalTeam still
//   apply. Ignored outside manual testing.
// - type: only meaningful alongside eventId. One of 'event_announcement',
//   'event_reminder_48h', 'event_reminder_day_of' — restricts the manual
//   test to that one pass instead of all three. Omitted or invalid => all
//   three, same as before this existed.
// - testOnlyUserIds: string[], only meaningful alongside eventId. Skips
//   find_nearby_users_for_event (and its creator exclusion) entirely and
//   sends only to exactly these user IDs, through the real copy, the real
//   push send, and the real notification_history write. Every ID is
//   checked server-side against EXPLICITLY_ALLOWED_TEST_USER_IDS (a
//   constant in THIS file, never read from the request) or
//   profiles.is_internal_team = true — if even one ID fails both checks,
//   the whole request is refused and nothing is sent to anyone. This is
//   deliberately not enforceable from the request body alone, since the
//   anon key calling this endpoint is public; the safety has to live in
//   code that only a deploy can change.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendPushNotifications } from './_lib/expo.ts'
import { isWithinTimeWindow } from './_lib/time-window.ts'

// Only IDs that may ever be used with testOnlyUserIds without also being
// is_internal_team = true. Justice's own account (asibe_cheta), confirmed
// live this session. Add the device-owner ID here, in a real code change
// and redeploy, before using it — it is not accepted from the request body.
const EXPLICITLY_ALLOWED_TEST_USER_IDS: string[] = [
  'bd8a455d-a54d-45c5-968d-e4cf5e8d928e', // asibe_cheta
];

const DAILY_NOTIFICATION_LIMIT = 3;
const ANNOUNCEMENT_WINDOW_DAYS = 30;
const MAX_ANNOUNCEMENTS_PER_USER_PER_DAY = 1;
const REMINDER_48H_MIN_HOURS = 44;
const REMINDER_48H_MAX_HOURS = 52;

// A fixed hours-before-event window (what this used to be, in two different
// versions) cannot make "Today's the day" true for every event: for an
// event starting at 02:00 local, any fixed window of several hours-before
// falls entirely on the PRECEDING local calendar day, every time, not
// occasionally. The actual claim the copy makes is "today, in the event's
// own local day", so the check has to be a calendar-day comparison in the
// event's own approximate local time, not an absolute hours-before band.
//
// events.country gives us a rough offset without needing a real timezone
// lookup — deliberately restricted to only the two country codes actually
// confirmed present in this data (NG, and GB including the stray "UK"
// spelling also seen live). A country we're not confident about (Ghana, the
// US, anything else, or null) does NOT fall back to a guessed offset —
// guessing UTC for an unmapped country is exactly the same class of wrong
// "today" claim this whole fix exists to remove, just quieter about it.
// Returns null for "we don't have a trustworthy offset for this event",
// which the caller treats as "skip the day-of reminder entirely for this
// event" rather than ever guessing. The 48h reminder is untouched by any of
// this — it's a pure hours-before-now window with no "today" claim and no
// country dependency, so it fires for these events regardless.
//
// GB's offset is pinned at 0 year-round — no British Summer Time (BST,
// UTC+1 roughly late March to late October). During BST this is wrong by
// one hour for GB events, same approximate-not-precise tradeoff as
// everywhere else in this function, now written down explicitly rather than
// left implicit.
const COUNTRY_UTC_OFFSET_HOURS: Record<string, number> = {
  NG: 1,
  GB: 0,
  UK: 0, // stray spelling of GB, confirmed present in live data
};

function eventUtcOffsetHours(event: Pick<EventRow, 'country'>): number | null {
  const code = event.country?.trim().toUpperCase();
  if (!code || !(code in COUNTRY_UTC_OFFSET_HOURS)) return null;
  return COUNTRY_UTC_OFFSET_HOURS[code];
}

function localDateKey(iso: string, offsetHours: number): string {
  return new Date(new Date(iso).getTime() + offsetHours * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Hard safety net, independent of the selection logic above: never attempt
// ANY send (reminder or announcement) for an event that has already
// started by the time the actual send is attempted. The event-level
// selection above decides what's "worth considering" this run, but real
// time passes between that query and this check — a user's own quiet hours
// can delay an individual send well past when the event was first
// selected, and without this guard a day-of reminder for a 02:00 event
// could otherwise fire at 08:00 once someone's quiet hours end, six hours
// after it already happened. This is what actually guarantees a reminder
// can never arrive after the event started, not the window shape above.
function hasNotStarted(event: Pick<EventRow, 'event_date'>): boolean {
  return new Date(event.event_date).getTime() > Date.now();
}

const CATEGORY_LABELS: Record<string, string> = {
  Secular: 'Music Concert',
  Other: 'Other',
  Carnival: 'Carnival',
  Gospel: 'Gospel Concert',
  Classical: 'Instrumental',
  Jazz: 'Jazz Room',
  Conference: 'Conference',
  Christian: 'Other',
  'Hip-Hop': 'Other',
  Afrobeat: 'Other',
  Rock: 'Other',
  Pop: 'Other',
};
function getCategoryLabel(category: string | null): string {
  if (!category) return 'event';
  return CATEGORY_LABELS[category] || category;
}

interface EventRow {
  id: string;
  title: string;
  category: string | null;
  city: string | null;
  location: string | null;
  country: string | null;
  event_date: string;
  creator_id: string;
  creator?: { username: string; display_name: string | null };
}

interface EligibleUser {
  user_id: string;
  expo_push_token: string;
  username: string;
  start_hour: number;
  end_hour: number;
  timezone: string;
}

type ReminderType = 'event_announcement' | 'event_reminder_48h' | 'event_reminder_day_of';

function buildCopy(type: ReminderType, event: EventRow, creatorName: string, city: string): { title: string; body: string } {
  const categoryLabel = getCategoryLabel(event.category);
  if (type === 'event_reminder_48h') {
    return {
      title: `2 days to go`,
      body: `${creatorName}'s ${categoryLabel} is in 2 days. ${event.title} in ${city}.`,
    };
  }
  if (type === 'event_reminder_day_of') {
    return {
      title: `Today's the day`,
      body: `${event.title} in ${city} is happening today. See you there.`,
    };
  }
  // event_announcement — same style as send-event-notifications' own copy.
  return {
    title: `${creatorName} is hosting a ${categoryLabel}`,
    body: `${event.title} in ${city}. Join in.`,
  };
}

function getEventCity(event: EventRow): string {
  if (event.city) return event.city;
  if (event.location) {
    const parts = event.location.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) return parts[1];
    if (parts.length > 0) return parts[0];
  }
  return 'your area';
}

serve(async (req) => {
  try {
    let dryRun = false;
    let testIncludeInternalTeam = false;
    let onlyEventId: string | null = null;
    let onlyType: ReminderType | null = null;
    let testOnlyUserIds: string[] | null = null;
    try {
      const body = await req.json();
      dryRun = body?.dryRun === true;
      testIncludeInternalTeam = body?.testIncludeInternalTeam === true;
      onlyEventId = body?.eventId ?? null;
      // Only meaningful alongside eventId — restricts a manual test to one
      // named pass instead of all three. Omitted or invalid => all three,
      // today's default behaviour, nothing changes unless this is explicitly
      // passed.
      const requestedType = body?.type;
      if (requestedType === 'event_announcement' || requestedType === 'event_reminder_48h' || requestedType === 'event_reminder_day_of') {
        onlyType = requestedType;
      }
      if (Array.isArray(body?.testOnlyUserIds) && body.testOnlyUserIds.every((id: unknown) => typeof id === 'string')) {
        testOnlyUserIds = body.testOnlyUserIds;
      }
    } catch {
      // Plain cron POST, no body — real run, no test flags.
    }

    // Hard refusal, checked before anything else happens: every ID in
    // testOnlyUserIds must be either in the hardcoded allow-list above or
    // is_internal_team = true right now. One failing ID refuses the whole
    // request — never a partial send to "the ones that passed".
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    if (testOnlyUserIds && testOnlyUserIds.length > 0) {
      if (!onlyEventId) {
        return new Response(
          JSON.stringify({ success: false, error: 'testOnlyUserIds requires eventId.' }),
          { headers: { 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      const { data: checkedProfiles, error: checkError } = await supabase
        .from('profiles')
        .select('id, is_internal_team')
        .in('id', testOnlyUserIds);
      if (checkError) {
        return new Response(
          JSON.stringify({ success: false, error: `Could not verify testOnlyUserIds: ${checkError.message}` }),
          { headers: { 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      const verifiedIds = new Set((checkedProfiles ?? []).map((p: { id: string }) => p.id));
      const disallowed = testOnlyUserIds.filter((id) => {
        if (!verifiedIds.has(id)) return true; // doesn't even exist as a profile
        const profile = (checkedProfiles ?? []).find((p: { id: string }) => p.id === id);
        const isInternal = profile?.is_internal_team === true;
        const isExplicitlyAllowed = EXPLICITLY_ALLOWED_TEST_USER_IDS.includes(id);
        return !isInternal && !isExplicitlyAllowed;
      });
      if (disallowed.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Refused: testOnlyUserIds contains IDs that are neither is_internal_team nor explicitly allowed.',
            disallowedIds: disallowed,
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 403 }
        );
      }
    }

    // Kill switch for the broad, unscoped sweep (what the cron actually
    // calls). A manual call that targets one specific event (eventId set)
    // always runs regardless of this, since that's an intentional, scoped
    // test, not the thing this switch is meant to gate. A broad dryRun call
    // (no eventId) also always runs regardless, since dryRun never sends a
    // push or writes notification_history (see sendOne) — it's read-only by
    // construction, so there's nothing for this switch to protect against.
    // Unset or anything other than the literal string 'true' means disabled
    // for a REAL broad run — so simply never setting this secret is the
    // same as explicitly disabling real sending.
    if (!onlyEventId && !dryRun && Deno.env.get('REMINDERS_ENABLED') !== 'true') {
      return new Response(
        JSON.stringify({ success: true, disabled: true, message: 'REMINDERS_ENABLED is not set to true — no-op.' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const summary = {
      announcement: { eventsChecked: 0, sent: 0, failed: 0, cappedForUser: 0 },
      reminder48h: { eventsChecked: 0, sent: 0, failed: 0 },
      reminderDayOf: { eventsChecked: 0, sent: 0, failed: 0 },
      dryRun,
    };

    async function fetchEvent(id: string): Promise<EventRow | null> {
      const { data } = await supabase
        .from('events')
        .select('id, title, category, city, location, country, event_date, creator_id, creator:profiles!creator_id(username, display_name)')
        .eq('id', id)
        .eq('status', 'active')
        .is('cancelled_at', null)
        .maybeSingle();
      return data as EventRow | null;
    }

    // Used only when testOnlyUserIds is set (already safety-checked above).
    // Builds the same EligibleUser shape find_nearby_users_for_event would,
    // for exactly these IDs, with the same defaults (8/22/UTC) that function
    // uses when no preference row exists — so the real send path downstream
    // (time window, quota, copy, history write) behaves identically either
    // way, only the matching step itself is skipped.
    async function fetchExplicitUsers(userIds: string[]): Promise<EligibleUser[]> {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, expo_push_token')
        .in('id', userIds);
      const { data: npRows } = await supabase
        .from('notification_preferences')
        .select('user_id, start_hour, end_hour, timezone')
        .in('user_id', userIds);
      const npByUser = new Map((npRows ?? []).map((r: any) => [r.user_id, r]));

      return (profiles ?? [])
        .filter((p: any) => !!p.expo_push_token)
        .map((p: any) => {
          const np = npByUser.get(p.id);
          return {
            user_id: p.id,
            expo_push_token: p.expo_push_token,
            username: p.username,
            start_hour: np?.start_hour ?? 8,
            end_hour: np?.end_hour ?? 22,
            timezone: np?.timezone ?? 'UTC',
          };
        });
    }

    async function sendOne(event: EventRow, type: ReminderType, eligible: EligibleUser[]): Promise<{ sent: number; failed: number }> {
      if (eligible.length === 0) return { sent: 0, failed: 0 };
      // Re-checked here, not just at selection time — real time passes
      // between the selection query above and this actual send attempt
      // (quiet hours, quota retries across runs), and this is what actually
      // guarantees nothing fires after the event has started.
      if (!hasNotStarted(event)) return { sent: 0, failed: 0 };

      // testOnlyUserIds sends are deliberate, scoped, allow-listed test
      // traffic (see the safety check above) — they must not consume a real
      // user's real daily quota, nor get recorded under the real type (which
      // would make them count against the real per-event/per-day dedupe and
      // cap too). The quota check is skipped entirely for them, and the
      // history row is written with a `_test`-suffixed type further down.
      const isTest = !!testOnlyUserIds;

      const creatorName = event.creator?.display_name || event.creator?.username || 'A creator';
      const city = getEventCity(event);
      const { title, body } = buildCopy(type, event, creatorName, city);
      const deepLink = `soundbridge://event/${event.id}`;

      const toSend: EligibleUser[] = [];
      for (const user of eligible) {
        if (!isWithinTimeWindow(user.start_hour, user.end_hour, user.timezone)) continue;
        if (!isTest) {
          const { data: canSend } = await supabase.rpc('check_notification_quota', {
            p_user_id: user.user_id,
            p_daily_limit: DAILY_NOTIFICATION_LIMIT,
          });
          if (!canSend) continue;
        }
        toSend.push(user);
      }

      if (dryRun || toSend.length === 0) return { sent: toSend.length, failed: 0 };

      // Claim-before-send: the INSERT itself is the atomic decision, via
      // upsert + ignoreDuplicates against the (user_id, event_id, type)
      // unique constraint (notification_history_user_event_type_unique). A
      // second overlapping run racing on the exact same triple gets zero
      // rows back and skips — no prior SELECT to race against. Mirrors
      // record_notification_sent's own column set exactly (notification_type
      // = type, sent_at/created_at = now, read = false), since this replaces
      // that RPC call for this write.
      const writeType = isTest ? `${type}_test` : type;
      const claims: { user: EligibleUser; claimId: string }[] = [];
      for (const user of toSend) {
        const claimedAt = new Date().toISOString();
        const { data: claimedRows } = await supabase
          .from('notification_history')
          .upsert(
            {
              user_id: user.user_id,
              event_id: event.id,
              type: writeType,
              notification_type: writeType,
              title,
              body,
              data: { type, eventId: event.id },
              sent_at: claimedAt,
              created_at: claimedAt,
              read: false,
            },
            { onConflict: 'user_id,event_id,type', ignoreDuplicates: true }
          )
          .select('id');
        if (claimedRows && claimedRows.length > 0) {
          claims.push({ user, claimId: claimedRows[0].id });
        }
        // No row back => another run already claimed this exact
        // (user, event, type) first. Skip — never send twice.
      }

      if (claims.length === 0) return { sent: 0, failed: 0 };

      const messages = claims.map(({ user }) => ({
        to: user.expo_push_token,
        sound: 'default',
        title,
        body,
        data: { type, eventId: event.id, eventTitle: event.title, city, deepLink, url: deepLink },
        url: deepLink,
        channelId: 'events',
      }));
      const receipts = await sendPushNotifications(messages);

      let sent = 0;
      let failed = 0;
      for (let i = 0; i < claims.length; i++) {
        if (receipts[i]?.status === 'ok') {
          sent++;
        } else {
          failed++;
          // Release by this run's own claim id, never by (user, event,
          // type) — another run's legitimate claim for the same triple
          // must never be touched by this cleanup.
          await supabase.from('notification_history').delete().eq('id', claims[i].claimId);
        }
      }
      return { sent, failed };
    }

    // 'event' is the legacy type value send-event-notifications wrote for
    // every announcement before this session renamed it to
    // 'event_announcement' (see the migration doc comment). Real historical
    // rows still carry the old value, so any dedupe for 'event_announcement'
    // has to recognise both, or it will treat everyone already announced
    // under the old type as brand new and re-announce them. The two reminder
    // types never existed before this session, so they have no legacy
    // equivalent and match on their own value only.
    const ANNOUNCEMENT_TYPE_ALIASES = ['event_announcement', 'event'];

    async function alreadyNotified(eventId: string, type: ReminderType): Promise<Set<string>> {
      const types = type === 'event_announcement' ? ANNOUNCEMENT_TYPE_ALIASES : [type];
      const { data } = await supabase
        .from('notification_history')
        .select('user_id')
        .eq('event_id', eventId)
        .in('type', types);
      return new Set((data ?? []).map((r: { user_id: string }) => r.user_id));
    }

    // ---- 48h and day-of reminders ----
    const reminderWindows: { type: ReminderType; events: EventRow[] }[] = [];

    if (onlyEventId) {
      // Test mode: checks both reminder types against this one event
      // regardless of its actual event_date or country, purely so templates
      // can be verified in a single manual run instead of waiting on the
      // event's real date/location to qualify naturally. The scheduled cron
      // run (no eventId) never does this, it always respects the real
      // selection logic below. `onlyType`, when set, narrows this to just
      // one of the two reminder types instead of both.
      const single = await fetchEvent(onlyEventId);
      if (single) {
        if (!onlyType || onlyType === 'event_reminder_48h') {
          reminderWindows.push({ type: 'event_reminder_48h', events: [single] });
        }
        if (!onlyType || onlyType === 'event_reminder_day_of') {
          reminderWindows.push({ type: 'event_reminder_day_of', events: [single] });
        }
      }
    } else {
      const h44 = new Date(now.getTime() + REMINDER_48H_MIN_HOURS * 60 * 60 * 1000).toISOString();
      const h52 = new Date(now.getTime() + REMINDER_48H_MAX_HOURS * 60 * 60 * 1000).toISOString();
      const { data: events48h } = await supabase
        .from('events')
        .select('id, title, category, city, location, country, event_date, creator_id, creator:profiles!creator_id(username, display_name)')
        .eq('status', 'active')
        .is('cancelled_at', null)
        .gte('event_date', h44)
        .lte('event_date', h52);
      reminderWindows.push({ type: 'event_reminder_48h', events: (events48h ?? []) as EventRow[] });

      // Broad candidate fetch (36h covers every real-world offset with
      // margin), then filtered per-event below using that event's own
      // approximate local calendar day — different events can have
      // different offsets, so this can't be a single SQL range the way the
      // 48h window is.
      const candidateMax = new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString();
      const { data: dayOfCandidates } = await supabase
        .from('events')
        .select('id, title, category, city, location, country, event_date, creator_id, creator:profiles!creator_id(username, display_name)')
        .eq('status', 'active')
        .is('cancelled_at', null)
        .gt('event_date', nowIso)
        .lte('event_date', candidateMax);

      const eventsToday = ((dayOfCandidates ?? []) as EventRow[]).filter((event) => {
        const offset = eventUtcOffsetHours(event);
        if (offset === null) return false; // unmapped/null country — no day-of reminder, never a guess
        return localDateKey(event.event_date, offset) === localDateKey(nowIso, offset);
      });
      reminderWindows.push({ type: 'event_reminder_day_of', events: eventsToday });
    }

    for (const window of reminderWindows) {
      const key = window.type === 'event_reminder_48h' ? 'reminder48h' : 'reminderDayOf';
      for (const event of window.events) {
        summary[key].eventsChecked++;
        const nearby = testOnlyUserIds
          ? await fetchExplicitUsers(testOnlyUserIds)
          : (await supabase.rpc('find_nearby_users_for_event', {
              p_event_id: event.id,
              p_max_distance_km: 20,
              p_include_internal_team: testIncludeInternalTeam,
            })).data;
        const already = await alreadyNotified(event.id, window.type);
        const eligible = ((nearby ?? []) as EligibleUser[]).filter((u) => !already.has(u.user_id));
        const result = await sendOne(event, window.type, eligible);
        summary[key].sent += result.sent;
        summary[key].failed += result.failed;
      }
    }

    // ---- Announcement catch-up ----
    let announcementEvents: EventRow[];
    if (onlyEventId) {
      const includeAnnouncement = !onlyType || onlyType === 'event_announcement';
      const targetEvent = includeAnnouncement ? await fetchEvent(onlyEventId) : null;
      announcementEvents = targetEvent ? [targetEvent] : [];
    } else {
      const windowEnd = new Date(now.getTime() + ANNOUNCEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('events')
        .select('id, title, category, city, location, country, event_date, creator_id, creator:profiles!creator_id(username, display_name)')
        .eq('status', 'active')
        .is('cancelled_at', null)
        .gt('event_date', nowIso)
        .lte('event_date', windowEnd);
      announcementEvents = (data ?? []) as EventRow[];
    }

    // Per-user cap: gather every (event, user) pair that is newly eligible
    // across ALL qualifying events first, then cap per user, rather than
    // sending event-by-event, so the cap actually limits total volume per
    // user per run, not just per event.
    const perUserCandidates = new Map<string, { event: EventRow; user: EligibleUser }[]>();

    for (const event of announcementEvents) {
      summary.announcement.eventsChecked++;
      const nearby = testOnlyUserIds
        ? await fetchExplicitUsers(testOnlyUserIds)
        : (await supabase.rpc('find_nearby_users_for_event', {
            p_event_id: event.id,
            p_max_distance_km: 20,
            p_include_internal_team: testIncludeInternalTeam,
          })).data;
      const already = await alreadyNotified(event.id, 'event_announcement');
      for (const user of (nearby ?? []) as EligibleUser[]) {
        if (already.has(user.user_id)) continue;
        const list = perUserCandidates.get(user.user_id) ?? [];
        list.push({ event, user });
        perUserCandidates.set(user.user_id, list);
      }
    }

    // Announcements must never be able to use up a user's daily quota and
    // block a reminder — reminders are already processed first in this run
    // (see above), but a user could still get re-queued for a NEW
    // announcement on a LATER run the same day (a different event they just
    // became eligible for). This checks real history, not just this run, so
    // "at most 1 announcement per user per day" holds across every run of
    // the day, not just within a single one. Deliberately a plain UTC
    // calendar day — this is an internal volume cap, never shown to a user
    // as a "today" claim, so it doesn't need the local-day precision the
    // day-of reminder's copy does.
    const todayStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const candidateUserIds = [...perUserCandidates.keys()];
    const alreadyAnnouncedToday = new Set<string>();
    if (candidateUserIds.length > 0) {
      const { data: announcedRows } = await supabase
        .from('notification_history')
        .select('user_id')
        .in('type', ANNOUNCEMENT_TYPE_ALIASES)
        .gte('sent_at', todayStartUtc)
        .in('user_id', candidateUserIds);
      for (const row of (announcedRows ?? []) as { user_id: string }[]) alreadyAnnouncedToday.add(row.user_id);
    }

    for (const [userId, candidates] of perUserCandidates) {
      if (alreadyAnnouncedToday.has(userId)) {
        summary.announcement.cappedForUser += candidates.length;
        continue;
      }
      candidates.sort((a, b) => new Date(a.event.event_date).getTime() - new Date(b.event.event_date).getTime());
      const capped = candidates.slice(0, MAX_ANNOUNCEMENTS_PER_USER_PER_DAY);
      summary.announcement.cappedForUser += Math.max(0, candidates.length - capped.length);

      for (const { event, user } of capped) {
        const result = await sendOne(event, 'event_announcement', [user]);
        summary.announcement.sent += result.sent;
        summary.announcement.failed += result.failed;
      }
    }

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('send-event-reminders error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
