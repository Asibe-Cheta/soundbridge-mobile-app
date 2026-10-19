import { VOTE_CLOSES_AT } from '../config/voteCampaign';

export interface VoteCountdown {
  closed: boolean;
  /** Whole days remaining, only meaningful when useHours is false. */
  days: number;
  /** Whole hours remaining, only meaningful when useHours is true. */
  hours: number;
  /** True once under 48 hours remain — display should switch to hours and tick every minute. */
  useHours: boolean;
}

// A sane upper bound on how long this campaign could possibly run — protects the
// display from a device clock set wildly in the past (which would otherwise show an
// absurd number of days) without needing server time.
const MAX_SANE_DAYS = 90;

export function getVoteCountdown(now: Date = new Date()): VoteCountdown {
  const msLeft = VOTE_CLOSES_AT.getTime() - now.getTime();

  if (!Number.isFinite(msLeft) || msLeft <= 0) {
    return { closed: true, days: 0, hours: 0, useHours: false };
  }

  const hoursLeftRaw = msLeft / (1000 * 60 * 60);
  const hoursLeft = Math.max(0, Math.min(hoursLeftRaw, MAX_SANE_DAYS * 24));
  const daysLeft = Math.max(0, Math.min(Math.ceil(hoursLeft / 24), MAX_SANE_DAYS));
  const useHours = hoursLeft < 48;

  return {
    closed: false,
    days: daysLeft,
    hours: Math.max(1, Math.ceil(hoursLeft)),
    useHours,
  };
}
