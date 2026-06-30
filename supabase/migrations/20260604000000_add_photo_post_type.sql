-- Add 'photo' to the allowed post_type values.
-- The posts table post_type column is TEXT. If a CHECK constraint exists on it,
-- this migration drops and recreates it with 'photo' included.
-- Safe to run even if the constraint doesn't exist.

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  WHERE tc.table_name = 'posts'
    AND tc.constraint_type = 'CHECK'
    AND tc.constraint_name ILIKE '%post_type%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE posts DROP CONSTRAINT ' || quote_ident(constraint_name);
    ALTER TABLE posts
      ADD CONSTRAINT posts_post_type_check
      CHECK (post_type IN ('update', 'opportunity', 'achievement', 'collaboration', 'event', 'headline', 'photo'));
  END IF;
END $$;
