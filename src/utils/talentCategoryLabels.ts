/**
 * Talent Category Labels Utility
 *
 * Single source of truth for the talent_categories taxonomy (see
 * TALENT_DISCOVERY_ADDITIONS.MD), mirroring the pattern in
 * serviceCategoryLabels.ts / creatorTypeLabels.ts. Used by the self-identification
 * modal, the backend inference (supabase/migrations/20260803000000_talent_categories.sql),
 * and the Talent Discovery screens' queries — all three must agree on these ids.
 */

export type TalentCategory =
  | 'musician'
  | 'instrumentalist'
  | 'songwriter'
  | 'session_musician'
  | 'backup_vocalist'
  | 'vocal_coach'
  | 'dj'
  | 'podcaster'
  | 'audio_engineer'
  | 'producer';

export const TALENT_CATEGORY_LABELS: Record<TalentCategory, string> = {
  musician: 'Musician/Singer',
  instrumentalist: 'Instrumentalist',
  songwriter: 'Songwriter',
  session_musician: 'Session Musician',
  backup_vocalist: 'Backup Vocalist',
  vocal_coach: 'Vocal Coach',
  dj: 'DJ',
  podcaster: 'Podcaster',
  audio_engineer: 'Audio Engineer',
  producer: 'Producer',
};

export const ALL_TALENT_CATEGORIES = Object.keys(TALENT_CATEGORY_LABELS) as TalentCategory[];

export function getTalentCategoryLabel(category: string): string {
  if (category in TALENT_CATEGORY_LABELS) {
    return TALENT_CATEGORY_LABELS[category as TalentCategory];
  }
  return category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
