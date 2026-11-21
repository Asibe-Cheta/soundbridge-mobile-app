// Usernames that can never be registered or changed to, because they'd
// collide with an app/website route (soundbridge.live/<this-word>) or let
// someone impersonate the platform itself. Keep this list in sync with the
// seed data in supabase/migrations/20261121010000_username_rules.sql — the
// database trigger is the real enforcement (covers every client, including
// the web app), this copy exists only so the mobile app can give instant
// feedback without a network round trip.
//
// Mobile-app route words below are this app's own tab/screen names. The web
// app's own top-level routes still need to be merged in from its repo —
// ask the web team for that list before this is considered complete.
export const RESERVED_USERNAMES: readonly string[] = [
  // Platform / brand
  'soundbridge', 'soundbridgeteam', 'soundbridgelive', 'official', 'admin',
  'administrator', 'support', 'help', 'helpdesk', 'contact', 'staff', 'team',
  'moderator', 'mod', 'system', 'root', 'security', 'abuse', 'legal',
  'privacy', 'terms',
  // API / infra
  'api', 'www', 'app', 'mail', 'email', 'ftp', 'cdn', 'static', 'assets',
  // Generic app routes (mobile tab names + known web/mobile screens)
  'home', 'feed', 'explore', 'discover', 'connect', 'upload', 'profile',
  'profiles', 'settings', 'setting', 'account', 'login', 'logout', 'signup',
  'signin', 'register', 'auth', 'onboarding', 'notifications', 'messages',
  'wallet', 'tip', 'tips', 'join', 'events', 'event', 'live', 'tracks',
  'track', 'album', 'albums', 'playlist', 'playlists', 'post', 'posts',
  'collaboration', 'collaborations', 'opportunity', 'opportunities',
  'creator', 'creators', 'artist', 'artists', 'venue', 'venues',
] as const;

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.includes(username.toLowerCase().trim());
}
