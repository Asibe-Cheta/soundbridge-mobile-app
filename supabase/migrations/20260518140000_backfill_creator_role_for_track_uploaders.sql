-- Backfill creator role for users who have uploaded tracks but still have role = 'listener'
-- Root cause: some users completed onboarding with role = 'listener' despite having audio_tracks rows,
-- which caused POST /api/payments/create-tip to return 400 ("Tips can only be sent to creator accounts").
-- Web API fix deployed at b06534c2; this migration aligns the DB to match.

UPDATE public.profiles p
SET
  role = 'creator'::user_role,
  updated_at = now()
WHERE p.role IS DISTINCT FROM 'creator'::user_role
  AND EXISTS (
    SELECT 1
    FROM public.audio_tracks t
    WHERE t.creator_id = p.id
  );
