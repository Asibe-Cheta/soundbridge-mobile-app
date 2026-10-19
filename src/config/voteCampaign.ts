// "Vote for SoundBridge" campaign — single source of truth for copy and timing
// (VOTE_FOR_SOUNDBRIDGE.MD). Edit values here only; screens/services read from this
// file and should not have the countdown date, URL, or copy hardcoded anywhere else.

export const VOTE_URL = 'https://www.theeasies.com/vote';

// 5 November 2026, 00:00 UTC — deliberately the safe/early side of "vote until 5th
// november 2026" since the exact closing hour on the real page isn't confirmed.
export const VOTE_CLOSES_AT = new Date('2026-11-05T00:00:00Z');

// One optional line in "Why your vote matters" — off by default, flip to true once
// event rewards are something we actually want to promise publicly.
export const SHOW_EVENT_REWARDS_LINE = false;

export type VotePushId = 1 | 2 | 3;

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
    targetDate: '2026-10-29',
    title: 'One week left ⏳',
    body: 'Free vote, one minute, big difference for creators on SoundBridge. Got a minute?',
  },
  {
    id: 3,
    targetDate: '2026-11-02',
    title: 'Last call to vote 🔔',
    body: "Closes 5 Nov. It's free, it's quick, and when SoundBridge wins, creators and fans win with it 🙏🏾",
  },
];

export const VOTE_COPY = {
  headline: "This one's for you 🙌🏾",
  subhead: 'SoundBridge is shortlisted for a big award. When we win, you win. Voting is free and takes about a minute.',
  whyItMattersTitle: 'Why your vote matters',
  whyItMattersIntro:
    "Votes help decide who makes the final 10. The final 10 get a shot at investment, and investment is how we keep building for you. Here's what we're working on next:",
  whatsNext: [
    'Ways for fans to support the artists they love, directly',
    'Your events shown to people near you',
    'Career guidance for creators',
    // Rendered only when SHOW_EVENT_REWARDS_LINE is true.
    'Rewards for fans who show up to events',
    'Industry professionals finding you on the platform',
  ],
  howToVoteTitle: 'How to vote',
  howToVoteSteps: [
    "Tap Vote now (it's free)",
    'Choose the category The Future of Creative',
    'Find Justice Asibe, Founder of SoundBridge',
    'Continue, enter your details and tap Submit',
  ],
  voteButton: "Vote now (it's free)",
  copyLinkButton: 'Copy link',
  shareButton: 'Share',
  thankYouTitle: 'Thank you! 🙏🏾',
  thankYouBody: "Know one person who'd vote too? Send them the link.",
  closedTitle: 'Voting has closed.',
  closedBody: "Thank you for backing SoundBridge. We'll share the news as soon as we have it.",
  bannerTextDays: (days: number) => `🏆 SoundBridge is shortlisted. Vote free in one minute. ${days} day${days === 1 ? '' : 's'} left`,
  bannerTextHours: (hours: number) => `🏆 SoundBridge is shortlisted. Vote free in one minute. ${hours} hour${hours === 1 ? '' : 's'} left`,
};
