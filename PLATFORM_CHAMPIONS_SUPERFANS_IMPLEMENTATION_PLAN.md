# Platform Champions & Superfans Program - Implementation Plan

## Status: PLANNED - For Future Implementation

---

## Overview

The Platform Champions & Superfans program is a year-round engagement system that recognizes and rewards the most active creators and supporters on SoundBridge. This creates a flywheel effect where recognition drives more engagement, which drives more recognition.

---

## Program Structure

### Platform Champions (Top 50 Creators)

**Who qualifies:** Artists/Creators ranked in the top 50 based on platform activity metrics.

**Recognition:**
- Permanent "Platform Champion" badge on profile (gold star icon)
- Guaranteed performance slots at annual finals events
- Featured placement in discovery feeds
- Priority customer support
- Early access to new features

**Metrics tracked (weighted scoring):**
| Metric | Weight | Description |
|--------|--------|-------------|
| Tracks Uploaded | 15% | Number of tracks published this year |
| Tips Received | 25% | Total tip amount received from fans |
| Engagement Rate | 20% | (Plays + Likes + Comments) / Followers |
| Collaboration Response Rate | 15% | % of collaboration requests responded to within 48hrs |
| Events Hosted | 15% | Number of events created and completed |
| Community Participation | 10% | Attending other creators' events, commenting, supporting |

---

### Superfans (Top 50 Supporters)

**Who qualifies:** Fans/Users ranked in the top 50 based on support activity.

**Recognition:**
- Permanent "Superfan" badge on profile (heart icon)
- Prize money distribution at annual finals
- Exclusive access to creator meetups
- Early ticket access for major events
- Special mention in annual awards

**Metrics tracked (weighted scoring):**
| Metric | Weight | Description |
|--------|--------|-------------|
| Tips Given | 35% | Total amount tipped to creators |
| Artists Supported | 20% | Number of unique creators tipped/followed |
| Events Attended | 20% | Number of event tickets purchased |
| Content Purchased | 15% | Albums/tracks purchased |
| Engagement Breadth | 10% | Comments, shares, playlist additions |

---

## Database Schema

### New Tables Required

```sql
-- ============================================
-- TABLE 1: Leaderboard Scores (Updated Daily)
-- ============================================
CREATE TABLE leaderboard_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN ('champion', 'superfan')),

  -- Score Components (for Champions)
  tracks_uploaded_score DECIMAL DEFAULT 0,
  tips_received_score DECIMAL DEFAULT 0,
  engagement_rate_score DECIMAL DEFAULT 0,
  collab_response_score DECIMAL DEFAULT 0,
  events_hosted_score DECIMAL DEFAULT 0,
  community_participation_score DECIMAL DEFAULT 0,

  -- Score Components (for Superfans)
  tips_given_score DECIMAL DEFAULT 0,
  artists_supported_score DECIMAL DEFAULT 0,
  events_attended_score DECIMAL DEFAULT 0,
  content_purchased_score DECIMAL DEFAULT 0,
  engagement_breadth_score DECIMAL DEFAULT 0,

  -- Aggregates
  total_score DECIMAL NOT NULL DEFAULT 0,
  rank INT,
  previous_rank INT,
  rank_change INT DEFAULT 0,  -- positive = moved up, negative = moved down

  -- Time tracking
  period_start DATE NOT NULL,  -- Start of scoring period (Jan 1)
  period_end DATE NOT NULL,    -- End of scoring period (Dec 31)
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, leaderboard_type, period_start)
);

CREATE INDEX idx_leaderboard_scores_type_rank ON leaderboard_scores(leaderboard_type, rank);
CREATE INDEX idx_leaderboard_scores_user ON leaderboard_scores(user_id);
CREATE INDEX idx_leaderboard_scores_period ON leaderboard_scores(period_start, period_end);

-- ============================================
-- TABLE 2: User Badges
-- ============================================
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'platform_champion',
    'superfan',
    'rising_star',      -- Top 10 newcomers
    'top_tipper',       -- Highest single tip
    'community_builder', -- Most collaboration responses
    'event_king',       -- Most events hosted
    'loyal_supporter'   -- Supported same creator 12+ months
  )),
  year_awarded INT NOT NULL,
  rank_achieved INT,  -- 1-50 for champions/superfans

  -- Badge metadata
  is_active BOOLEAN DEFAULT true,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- NULL = permanent

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, badge_type, year_awarded)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_type ON user_badges(badge_type);
CREATE INDEX idx_user_badges_active ON user_badges(is_active);

-- ============================================
-- TABLE 3: Activity Tracking (Raw Events)
-- ============================================
CREATE TABLE user_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    -- Creator activities
    'track_uploaded',
    'tip_received',
    'event_created',
    'event_completed',
    'collab_request_received',
    'collab_request_responded',
    'content_sold',

    -- Fan activities
    'tip_sent',
    'event_ticket_purchased',
    'event_attended',
    'content_purchased',
    'follow_creator',
    'comment_posted',
    'track_liked',
    'playlist_track_added'
  )),

  -- Activity details
  related_user_id UUID REFERENCES profiles(id),  -- Who was involved
  related_content_id UUID,  -- Track, event, etc.
  amount DECIMAL,  -- For tips, purchases
  currency TEXT,
  metadata JSONB,  -- Additional context

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_events_user ON user_activity_events(user_id);
CREATE INDEX idx_activity_events_type ON user_activity_events(activity_type);
CREATE INDEX idx_activity_events_created ON user_activity_events(created_at);

-- ============================================
-- TABLE 4: Prize Pool Distribution
-- ============================================
CREATE TABLE prize_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  year INT NOT NULL,
  leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN ('champion', 'superfan')),
  final_rank INT NOT NULL,
  prize_amount DECIMAL NOT NULL,
  currency TEXT DEFAULT 'GBP',

  -- Distribution status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payment_method TEXT,  -- 'wallet', 'bank_transfer', 'wise'
  payment_reference TEXT,

  distributed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prize_distributions_user ON prize_distributions(user_id);
CREATE INDEX idx_prize_distributions_year ON prize_distributions(year);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE leaderboard_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_distributions ENABLE ROW LEVEL SECURITY;

-- Leaderboard scores: Anyone can view, only system can insert/update
CREATE POLICY "Anyone can view leaderboard scores" ON leaderboard_scores
  FOR SELECT USING (true);

-- User badges: Anyone can view, only system can manage
CREATE POLICY "Anyone can view badges" ON user_badges
  FOR SELECT USING (true);

-- Activity events: Users can view their own, system can insert
CREATE POLICY "Users can view own activities" ON user_activity_events
  FOR SELECT USING (auth.uid() = user_id);

-- Prize distributions: Users can view their own
CREATE POLICY "Users can view own prizes" ON prize_distributions
  FOR SELECT USING (auth.uid() = user_id);
```

---

## Scoring Algorithm

### Champion Score Calculation

```typescript
interface ChampionScoreInput {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
}

async function calculateChampionScore(input: ChampionScoreInput): Promise<number> {
  const { userId, periodStart, periodEnd } = input;

  // 1. Tracks Uploaded (15%) - Max 100 points
  const tracksUploaded = await countTracksUploaded(userId, periodStart, periodEnd);
  const tracksScore = Math.min(tracksUploaded * 2, 100) * 0.15;

  // 2. Tips Received (25%) - Logarithmic scale, Max 100 points
  const tipsReceived = await sumTipsReceived(userId, periodStart, periodEnd);
  const tipsScore = Math.min(Math.log10(tipsReceived + 1) * 25, 100) * 0.25;

  // 3. Engagement Rate (20%) - (Plays + Likes + Comments) / Followers
  const engagement = await calculateEngagementRate(userId, periodStart, periodEnd);
  const engagementScore = Math.min(engagement * 1000, 100) * 0.20;

  // 4. Collaboration Response Rate (15%) - % responded within 48hrs
  const collabResponseRate = await calculateCollabResponseRate(userId, periodStart, periodEnd);
  const collabScore = collabResponseRate * 0.15;

  // 5. Events Hosted (15%) - Max 100 points
  const eventsHosted = await countEventsCompleted(userId, periodStart, periodEnd);
  const eventsScore = Math.min(eventsHosted * 10, 100) * 0.15;

  // 6. Community Participation (10%) - Attending events, supporting others
  const communityScore = await calculateCommunityParticipation(userId, periodStart, periodEnd) * 0.10;

  return tracksScore + tipsScore + engagementScore + collabScore + eventsScore + communityScore;
}
```

### Superfan Score Calculation

```typescript
interface SuperfanScoreInput {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
}

async function calculateSuperfanScore(input: SuperfanScoreInput): Promise<number> {
  const { userId, periodStart, periodEnd } = input;

  // 1. Tips Given (35%) - Logarithmic scale, Max 100 points
  const tipsGiven = await sumTipsGiven(userId, periodStart, periodEnd);
  const tipsScore = Math.min(Math.log10(tipsGiven + 1) * 25, 100) * 0.35;

  // 2. Artists Supported (20%) - Unique creators tipped/followed
  const artistsSupported = await countUniqueArtistsSupported(userId, periodStart, periodEnd);
  const artistsScore = Math.min(artistsSupported * 5, 100) * 0.20;

  // 3. Events Attended (20%) - Tickets purchased
  const eventsAttended = await countEventsAttended(userId, periodStart, periodEnd);
  const eventsScore = Math.min(eventsAttended * 10, 100) * 0.20;

  // 4. Content Purchased (15%) - Albums/tracks bought
  const contentPurchased = await countContentPurchased(userId, periodStart, periodEnd);
  const contentScore = Math.min(contentPurchased * 5, 100) * 0.15;

  // 5. Engagement Breadth (10%) - Comments, shares, playlist additions
  const engagementBreadth = await calculateEngagementBreadth(userId, periodStart, periodEnd);
  const engagementScore = Math.min(engagementBreadth, 100) * 0.10;

  return tipsScore + artistsScore + eventsScore + contentScore + engagementScore;
}
```

---

## Mobile App Screens

### 1. Leaderboard Screen

**Location:** New tab in Explore or Profile section

**Features:**
- Toggle between "Champions" and "Superfans" leaderboards
- Current user's rank highlighted
- Rank change indicators (↑ ↓ -)
- Tap user to view profile
- Pull to refresh
- Period selector (This Year / All Time)

**UI Mockup:**
```
┌─────────────────────────────────────┐
│  ← Leaderboards                     │
├─────────────────────────────────────┤
│  [Champions]  [Superfans]           │
├─────────────────────────────────────┤
│  🏆 Platform Champions 2026         │
│  Updated daily · Ends Dec 31        │
├─────────────────────────────────────┤
│  1  👑 @travisgreene     98.5 pts   │
│     ↑2  Gospel Artist               │
├─────────────────────────────────────┤
│  2  ⭐ @sinach          95.2 pts   │
│     ↓1  Gospel Artist               │
├─────────────────────────────────────┤
│  3  ⭐ @burnaboy        92.1 pts   │
│     -   Afrobeats Artist            │
├─────────────────────────────────────┤
│  ...                                │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │  Your Rank: #127               ││
│  │  Score: 45.3 pts  ↑12 this week ││
│  │  [View My Stats]               ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### 2. My Stats Screen

**Location:** Accessible from Profile or Leaderboard

**Features:**
- Breakdown of score components
- Progress bars for each metric
- Tips to improve rank
- Historical rank chart

**UI Mockup:**
```
┌─────────────────────────────────────┐
│  ← My Champion Stats                │
├─────────────────────────────────────┤
│  Current Rank: #127 of 5,000        │
│  Total Score: 45.3 / 100            │
├─────────────────────────────────────┤
│  📊 Score Breakdown                 │
├─────────────────────────────────────┤
│  Tracks Uploaded (15%)              │
│  ████████░░░░░░░░  12/50 tracks     │
│  Score: 7.2 pts                     │
├─────────────────────────────────────┤
│  Tips Received (25%)                │
│  ██████░░░░░░░░░░  £234 total       │
│  Score: 14.5 pts                    │
├─────────────────────────────────────┤
│  Engagement Rate (20%)              │
│  ████░░░░░░░░░░░░  3.2%             │
│  Score: 6.4 pts                     │
├─────────────────────────────────────┤
│  ... (other metrics)               │
├─────────────────────────────────────┤
│  💡 Tips to Improve                 │
│  • Upload 3 more tracks (+1.2 pts)  │
│  • Respond to collab requests faster│
│  • Host an event (+1.5 pts)         │
└─────────────────────────────────────┘
```

### 3. Badge Display on Profile

**Location:** Profile header, next to username

**Features:**
- Gold badge for Champions
- Heart badge for Superfans
- Tap badge to see achievement details
- Year indicator

**UI Mockup:**
```
┌─────────────────────────────────────┐
│  [Avatar]                           │
│  @username 🏆'26 ❤️'25              │
│  Platform Champion 2026             │
│  Superfan 2025                      │
└─────────────────────────────────────┘
```

---

## Backend API Endpoints

### Required Endpoints

```typescript
// GET /api/leaderboard/:type
// Returns top 50 + current user's position
interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  currentUser: {
    rank: number;
    score: number;
    rankChange: number;
    scoreBreakdown: ScoreBreakdown;
  } | null;
  period: {
    start: string;
    end: string;
    daysRemaining: number;
  };
}

// GET /api/user/:userId/badges
// Returns all badges for a user
interface UserBadgesResponse {
  badges: Badge[];
  activeBadges: Badge[];  // Currently displayed
}

// GET /api/user/:userId/champion-stats
// Returns detailed score breakdown
interface ChampionStatsResponse {
  rank: number;
  totalScore: number;
  scoreBreakdown: {
    tracksUploaded: { value: number; score: number; max: number };
    tipsReceived: { value: number; score: number; max: number };
    engagementRate: { value: number; score: number; max: number };
    collabResponseRate: { value: number; score: number; max: number };
    eventsHosted: { value: number; score: number; max: number };
    communityParticipation: { value: number; score: number; max: number };
  };
  tips: string[];  // Improvement suggestions
  history: { date: string; rank: number; score: number }[];
}

// GET /api/user/:userId/superfan-stats
// Returns detailed score breakdown for superfans
interface SuperfanStatsResponse {
  rank: number;
  totalScore: number;
  scoreBreakdown: {
    tipsGiven: { value: number; score: number; max: number };
    artistsSupported: { value: number; score: number; max: number };
    eventsAttended: { value: number; score: number; max: number };
    contentPurchased: { value: number; score: number; max: number };
    engagementBreadth: { value: number; score: number; max: number };
  };
  tips: string[];
  history: { date: string; rank: number; score: number }[];
}
```

---

## Cron Jobs Required

### 1. Daily Score Calculation (2 AM UTC)

```typescript
// Runs every day at 2 AM UTC
// Recalculates all scores and updates ranks

async function dailyScoreCalculation() {
  const currentYear = new Date().getFullYear();
  const periodStart = new Date(currentYear, 0, 1);  // Jan 1
  const periodEnd = new Date(currentYear, 11, 31);  // Dec 31

  // 1. Calculate all Champion scores
  const creators = await getAllCreators();
  for (const creator of creators) {
    const score = await calculateChampionScore({
      userId: creator.id,
      periodStart,
      periodEnd,
    });
    await upsertLeaderboardScore(creator.id, 'champion', score, periodStart, periodEnd);
  }

  // 2. Calculate all Superfan scores
  const users = await getAllActiveUsers();
  for (const user of users) {
    const score = await calculateSuperfanScore({
      userId: user.id,
      periodStart,
      periodEnd,
    });
    await upsertLeaderboardScore(user.id, 'superfan', score, periodStart, periodEnd);
  }

  // 3. Update ranks
  await updateRanks('champion', periodStart);
  await updateRanks('superfan', periodStart);

  // 4. Send notifications for significant rank changes
  await notifyRankChanges();
}
```

### 2. Annual Badge Award (Jan 1, 12:01 AM UTC)

```typescript
// Runs on January 1st at 12:01 AM UTC
// Awards badges to top 50 in each category

async function annualBadgeAward() {
  const previousYear = new Date().getFullYear() - 1;
  const periodStart = new Date(previousYear, 0, 1);

  // 1. Get top 50 Champions
  const topChampions = await getTopRanked('champion', periodStart, 50);
  for (const champion of topChampions) {
    await awardBadge(champion.userId, 'platform_champion', previousYear, champion.rank);
  }

  // 2. Get top 50 Superfans
  const topSuperfans = await getTopRanked('superfan', periodStart, 50);
  for (const superfan of topSuperfans) {
    await awardBadge(superfan.userId, 'superfan', previousYear, superfan.rank);
  }

  // 3. Distribute prizes to Superfans
  await distributePrizes(topSuperfans, previousYear);

  // 4. Send congratulatory notifications
  await sendBadgeNotifications(topChampions, topSuperfans);

  // 5. Reset scores for new year
  await initializeNewYearScores();
}
```

---

## Prize Distribution (Superfans Only)

### Prize Pool Structure

Total annual prize pool: £4,000 (from competition budget per business plan)

| Rank | Prize Amount | Distribution |
|------|-------------|--------------|
| 1 | £500 | Top supporter |
| 2 | £300 | |
| 3 | £200 | |
| 4-10 | £100 each (£700 total) | |
| 11-20 | £50 each (£500 total) | |
| 21-50 | £30 each (£900 total) | |

### Distribution Method

1. **Wallet Credit (Preferred):** Prize added to SoundBridge wallet
2. **Bank Transfer:** Via Wise for international users
3. **Hold for Event:** Can be collected at annual finals event

---

## Mobile Implementation Files

### New Files to Create

```
src/
├── screens/
│   ├── LeaderboardScreen.tsx          # Main leaderboard view
│   ├── MyChampionStatsScreen.tsx      # Detailed creator stats
│   ├── MySuperfanStatsScreen.tsx      # Detailed fan stats
│   └── BadgeDetailScreen.tsx          # Badge achievement details
├── components/
│   ├── LeaderboardEntry.tsx           # Single leaderboard row
│   ├── ScoreBreakdownCard.tsx         # Score visualization
│   ├── BadgeDisplay.tsx               # Badges on profile
│   ├── RankChangeIndicator.tsx        # ↑ ↓ - arrows
│   └── ImprovementTips.tsx            # Tips to improve rank
├── services/
│   └── LeaderboardService.ts          # API calls
└── types/
    └── leaderboard.ts                 # TypeScript types
```

### Navigation Updates

```typescript
// Add to App.tsx Stack.Navigator
<Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
<Stack.Screen name="MyChampionStats" component={MyChampionStatsScreen} />
<Stack.Screen name="MySuperfanStats" component={MySuperfanStatsScreen} />
<Stack.Screen name="BadgeDetail" component={BadgeDetailScreen} />

// Add leaderboard button to:
// - DiscoverScreen (explore tab)
// - ProfileScreen (for "My Stats")
```

---

## Activity Tracking Integration

### Existing Code to Modify

Track activities at these points:

```typescript
// 1. Track Upload - src/screens/UploadScreen.tsx
// After successful upload:
await trackActivity('track_uploaded', { trackId: newTrack.id });

// 2. Tip Sent - src/components/TipModal.tsx
// After successful tip:
await trackActivity('tip_sent', {
  recipientId: creatorId,
  amount,
  currency
});

// 3. Tip Received - Backend webhook
// When tip confirmed:
await trackActivity('tip_received', {
  senderId,
  amount,
  currency
});

// 4. Event Created - src/screens/CreateEventScreen.tsx
// After event published:
await trackActivity('event_created', { eventId });

// 5. Event Ticket Purchased - src/services/EventTicketService.ts
// After purchase:
await trackActivity('event_ticket_purchased', {
  eventId,
  creatorId: event.creator_id
});

// 6. Content Purchased - src/services/ContentPurchaseService.ts
// After purchase:
await trackActivity('content_purchased', {
  contentId,
  contentType,
  creatorId
});

// 7. Collaboration Response - src/screens/CollaborationRequestsScreen.tsx
// After responding:
await trackActivity('collab_request_responded', {
  requestId,
  responseTime: hoursToRespond
});

// 8. Follow Creator - src/lib/supabase.ts (followCreator function)
// After follow:
await trackActivity('follow_creator', { creatorId });
```

---

## Notifications

### Notification Types

```typescript
// Weekly rank update (every Monday)
{
  title: "Your Champion Rank Update",
  body: "You're now #127 (↑12 this week). Keep uploading!",
  data: { type: 'leaderboard', screen: 'MyChampionStats' }
}

// Approaching top 50
{
  title: "Almost There! 🏆",
  body: "You're #52 - just 2 spots from Platform Champion status!",
  data: { type: 'leaderboard', screen: 'Leaderboard' }
}

// Badge awarded
{
  title: "Congratulations! 🎉",
  body: "You've earned the Platform Champion 2026 badge!",
  data: { type: 'badge', badgeId: '...' }
}

// Prize won (Superfans only)
{
  title: "You Won! 💰",
  body: "£100 prize added to your wallet for being a Top 10 Superfan!",
  data: { type: 'prize', screen: 'Wallet' }
}
```

---

## Implementation Timeline

### Phase 1: Database & Backend (Week 1-2)
- [ ] Create database tables
- [ ] Implement RLS policies
- [ ] Build scoring functions
- [ ] Set up daily cron job
- [ ] Create API endpoints

### Phase 2: Mobile Screens (Week 3-4)
- [ ] LeaderboardScreen
- [ ] MyChampionStatsScreen / MySuperfanStatsScreen
- [ ] BadgeDisplay component
- [ ] Navigation integration

### Phase 3: Activity Tracking (Week 5)
- [ ] Integrate tracking into existing flows
- [ ] Test activity logging
- [ ] Verify score calculations

### Phase 4: Notifications & Polish (Week 6)
- [ ] Weekly rank notifications
- [ ] Badge award notifications
- [ ] UI polish and animations
- [ ] Testing and bug fixes

### Phase 5: Annual Process (Before Dec 31)
- [ ] Prize distribution system
- [ ] Annual badge award cron
- [ ] Year-end notification campaign

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily Active Users viewing leaderboard | 15% of DAU | Analytics |
| Score improvement attempts | 30% of ranked users | Activity tracking |
| Engagement increase (tips, uploads) | +25% | Compare pre/post launch |
| Retention of top 50 users | 90% monthly | Cohort analysis |
| Prize claim rate | 95% | Distribution tracking |

---

## Future Enhancements

1. **Monthly Mini-Competitions:** Monthly prizes for top movers
2. **Genre-Specific Leaderboards:** Top Gospel Champion, Top Afrobeats Champion
3. **City Leaderboards:** Top London Creator, Top Lagos Superfan
4. **Streak Bonuses:** Bonus points for consecutive weeks of uploads
5. **Referral Bonuses:** Points for bringing new users who become active
6. **Team Leaderboards:** Collaborate with others to compete as groups

---

*Document created: January 17, 2026*
*Status: Planning Complete - Ready for Implementation*
