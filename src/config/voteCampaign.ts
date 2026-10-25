// "Vote for SoundBridge" campaign — single source of truth for copy and timing
// (VOTE_FOR_SOUNDBRIDGE.MD). Edit values here only; screens/services read from this
// file and should not have the countdown date, URL, or copy hardcoded anywhere else.

export const VOTE_URL = 'https://www.theeasies.com/vote?n=justice-asibe';

// 30 October 2026, 00:00 UTC — voting actually closes Thursday 29 October; this is
// the safe/early side (end of day on the 29th) since the exact closing hour on the
// real page isn't confirmed. Corrected 2026-10-21 — was wrongly set to 5 November.
export const VOTE_CLOSES_AT = new Date('2026-10-30T00:00:00Z');

// One optional line in "Why your vote matters" — off by default, flip to true once
// event rewards are something we actually want to promise publicly.
export const SHOW_EVENT_REWARDS_LINE = false;

export type VotePushId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface VotePushDefinition {
  id: VotePushId;
  /** Local reference only — actual send date is decided manually per the doc's "nothing sends automatically" rule. */
  targetDate: string;
  title: string;
  body: string;
}

export const PUSH_SCHEDULE: VotePushDefinition[] = [
  {
    id: 1,
    targetDate: 'Launch (on confirmation)',
    title: 'We just got shortlisted 🎉',
    body: "This one's for you too. A free vote takes a minute and helps us build more for creators. Tap in 👉",
  },
  {
    id: 2,
    targetDate: '2026-10-22',
    title: 'One week left ⏳',
    body: 'Free vote, one minute, big difference for creators on SoundBridge. Got a minute?',
  },
  {
    id: 3,
    targetDate: '2026-10-28',
    title: 'Last call to vote 🔔',
    body: "Closes 29 Oct. It's free, it's quick, and when SoundBridge wins, creators and fans win with it 🙏🏾",
  },
  // Pushes 4-9 added 2026-10-24 per the campaign update — one per day through the
  // 29th (which gets two: a morning and a final-hours push). targetDate is the exact
  // planned UTC send time; sends are still fully manual, nothing auto-fires at this time.
  {
    id: 4,
    targetDate: '2026-10-25T17:00:00Z',
    title: 'Your vote counts more than you think',
    body: "The public vote carries 80% of the weighting. It's free and takes a minute.",
  },
  {
    id: 5,
    targetDate: '2026-10-26T17:00:00Z',
    title: 'Our win is your win',
    body: 'If SoundBridge wins, every creator here wins. Vote and tell one friend.',
  },
  {
    id: 6,
    targetDate: '2026-10-27T17:00:00Z',
    title: '2 days to go',
    body: 'Voting closes Thursday night. Have you voted yet?',
  },
  {
    id: 7,
    targetDate: '2026-10-28T17:00:00Z',
    title: 'Closing tomorrow',
    body: "Last full day to vote. It's free, and it's quick.",
  },
  {
    id: 8,
    targetDate: '2026-10-29T08:00:00Z',
    title: 'Closes tonight',
    body: 'The ESEY vote ends at 11:59pm GMT. Vote now.',
  },
  {
    id: 9,
    targetDate: '2026-10-29T20:00:00Z',
    title: 'Final hours',
    body: 'A few hours left. One vote from you helps.',
  },
];

export const VOTE_COPY = {
  headline: "This one's for you 🙌🏾",
  subhead: "We're shortlisted for a big award. Free vote, one minute.",
  whyItMattersTitle: 'Why it matters',
  whyItMattersIntro: 'Votes decide the final 10 — and a shot at investment to build more for creators:',
  whatsNext: [
    'Direct fan support for artists',
    'Events shown to people near you',
    'Career guidance for creators',
    // Rendered only when SHOW_EVENT_REWARDS_LINE is true.
    'Rewards for fans who show up to events',
    'Industry professionals finding you on the platform',
  ],
  voteButton: "Vote now (it's free)",
  copyLinkButton: 'Copy link',
  shareButton: 'Share',
  markVotedButton: "I've already voted",
  votedTitle: "You're in! 🙏🏾",
  votedBody: "Thanks for voting. We won't bug you about this again.",
  thankYouTitle: 'Thank you! 🙏🏾',
  thankYouBody: "Know one person who'd vote too? Send them the link.",
  closedTitle: 'Voting has closed.',
  closedBody: "Thank you for backing SoundBridge. We'll share the news as soon as we have it.",
  bannerTextDays: (days: number) => `🏆 SoundBridge is shortlisted. Vote free in one minute. ${days} day${days === 1 ? '' : 's'} left`,
  bannerTextHours: (hours: number) => `🏆 SoundBridge is shortlisted. Vote free in one minute. ${hours} hour${hours === 1 ? '' : 's'} left`,
};
