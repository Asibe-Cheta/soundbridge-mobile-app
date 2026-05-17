# Web Team Alignment: Profile "View All" Albums/Playlists

This note covers the mobile fix that ensures the profile "View All Albums/Playlists" buttons only show the current user's content. Please mirror the same behavior in the web app so both platforms are consistent.

## Why this change was needed

On mobile, the profile screen showed the user's albums/playlists in a preview list, but the "View All" buttons did not navigate to user-specific lists. This led to global lists instead of the user's own content.

We fixed this by passing `userId` into the "All Albums" and "All Playlists" screens and filtering by creator/owner in the query. The web app should do the same for the profile page.

## Expected behavior (web + mobile)

- When a user taps "View All Albums" from their profile, they should only see albums created by that user.
- When a user taps "View All Playlists" from their profile, they should only see playlists created by that user.
- Global browsing of albums/playlists should continue to show public items (no user filter).

## API/Query requirements

Please filter by creator ID when the screen is invoked from a profile context.

### Albums

Use `creator_id` filter for profile lists.

Example Supabase query:

```ts
supabase
  .from('albums')
  .select(`
    id,
    title,
    description,
    cover_image_url,
    tracks_count,
    total_plays,
    created_at,
    creator:profiles!albums_creator_id_fkey(
      id,
      username,
      display_name,
      avatar_url
    )
  `)
  .eq('creator_id', userId)
  .order('created_at', { ascending: false })
  .limit(50);
```

### Playlists

Use `creator_id` filter for profile lists. Only apply `.eq('is_public', true)` for global browsing (no `userId` passed).

Example Supabase query:

```ts
const baseQuery = supabase
  .from('playlists')
  .select(`
    id,
    name,
    description,
    cover_image_url,
    tracks_count,
    total_duration,
    followers_count,
    is_public,
    created_at,
    creator:profiles!playlists_creator_id_fkey(
      id,
      username,
      display_name,
      avatar_url
    )
  `)
  .order('created_at', { ascending: false })
  .limit(50);

const query = userId
  ? baseQuery.eq('creator_id', userId)
  : baseQuery.eq('is_public', true);
```

## Navigation contract

When navigating from profile -> All Albums / All Playlists:

```
{ title: 'My Albums', userId: <profileId> }
{ title: 'My Playlists', userId: <profileId> }
```

For global browsing, do not pass `userId` and use the public filter.

## Notes

- Mobile uses foreign keys `albums_creator_id_fkey` and `playlists_creator_id_fkey` when joining creator profiles.
- If the web app uses different FK names, please adjust accordingly but keep the same result shape.

