# Event Notification Templates - MUST USE THESE FORMATS

## Status: REQUIRED - Notifications must be natural, engaging, and personal

---

## Core Principles

1. **Use creator name** - Makes it personal ("John is hosting..." not "New event...")
2. **Natural date language** - "next Saturday" or "this Friday" not "Jan 18, 2026"
3. **Avoid numbers when possible** - "next week" not "in 7 days"
4. **Vary the templates** - Don't send the same format every time
5. **Action-oriented CTAs** - "Book your place!" or "Check in to attend"

---

## Template Pool (Rotate Between These)

### Type 1: Creator-Focused (Primary)

```javascript
{
  title: `${creatorName} is hosting a ${category} ${naturalDate}!`,
  body: `${eventTitle} in ${city}. Book your place!`,
  // OR for free events:
  body: `${eventTitle} in ${city}. Check in to attend!`
}
```

**Examples:**
- Title: "Sarah Johnson is hosting a Gospel Concert next Saturday!"
- Body: "Worship Night Live in London. Book your place!"

- Title: "DJ Mike is hosting a Music Concert this Friday!"
- Body: "Summer Vibes Party in Manchester. Get your ticket!"

---

### Type 2: Description Excerpt (Intelligent)

Pull a relevant, engaging excerpt from the event description:

```javascript
{
  title: `${creatorName}: "${shortExcerpt}"`,
  body: `${category} in ${city} ${naturalDate}. ${isPaid ? 'Get your ticket!' : 'Check in to attend!'}`
}
```

**Examples:**
- Title: `Sarah Johnson: "Join us for an evening of powerful worship"`
- Body: "Gospel Concert in London next Saturday. Book your place!"

- Title: `DJ Mike: "The biggest party of the summer"`
- Body: "Music Concert in Manchester this Friday. Get your ticket!"

---

### Type 3: Casual/Friendly Tone

```javascript
{
  title: `Hey! ${creatorName} has something for you`,
  body: `${category}: ${eventTitle} in ${city} ${naturalDate}`
}
```

**Examples:**
- Title: "Hey! Sarah Johnson has something for you"
- Body: "Gospel Concert: Worship Night Live in London next Saturday"

---

### Type 4: Location-First (For nearby events)

```javascript
{
  title: `${category} happening in ${city} ${naturalDate}!`,
  body: `${creatorName} presents: ${eventTitle}. ${cta}`
}
```

**Examples:**
- Title: "Gospel Concert happening in London next Saturday!"
- Body: "Sarah Johnson presents: Worship Night Live. Book your place!"

---

### Type 5: Urgency (For events happening soon)

```javascript
// For events within 3 days
{
  title: `Don't miss out! ${creatorName}'s ${category} is ${naturalDate}`,
  body: `${eventTitle} in ${city}. Limited spots available!`
}
```

**Examples:**
- Title: "Don't miss out! Sarah Johnson's Gospel Concert is tomorrow"
- Body: "Worship Night Live in London. Limited spots available!"

---

### Type 6: HIGH-PROFILE CREATOR (10k+ followers) ⭐

For creators with 10,000+ followers, use an exciting, hype-building template:

```javascript
// ONLY for creators with followers >= 10000
{
  title: `${creatorName.toUpperCase()} IS COMING TO YOUR CITY!`,
  body: `${category} in ${monthName}! ${isPaid ? 'Get your ticket now!' : 'Check in to attend!'}`
}
```

**Examples:**
- Title: "TRAVIS GREENE IS COMING TO YOUR CITY!"
- Body: "Gospel Concert in February! Get your ticket now!"

- Title: "BURNA BOY IS COMING TO YOUR CITY!"
- Body: "Music Concert in March! Get your ticket now!"

- Title: "SINACH IS COMING TO YOUR CITY!"
- Body: "Gospel Concert in May! Don't miss it!"

**Alternative variations for 10k+ creators:**

```javascript
// Variation A - Excitement
{
  title: `🔥 ${creatorName.toUpperCase()} IS COMING TO ${city.toUpperCase()}!`,
  body: `${eventTitle} - ${monthName}. This is HUGE! Get your ticket!`
}

// Variation B - Exclusive feel
{
  title: `${creatorName} is coming to ${city}!`,
  body: `Don't miss this! ${category} in ${monthName}. Tickets selling fast!`
}

// Variation C - Direct announcement
{
  title: `BIG NEWS: ${creatorName} live in ${city}!`,
  body: `${eventTitle} - ${monthName}. Be there! ${cta}`
}
```

**Examples:**
- Title: "🔥 TRAVIS GREENE IS COMING TO LONDON!"
- Body: "Worship Experience Live - February. This is HUGE! Get your ticket!"

- Title: "BIG NEWS: Tasha Cobbs live in Manchester!"
- Body: "Grace Tour - March. Be there! Book your place!"

---

## Natural Date Formatting

**CRITICAL:** Use natural language, not numeric dates.

```typescript
function formatNaturalDate(eventDate: Date): string {
  const now = new Date();
  const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const dayOfWeek = eventDate.toLocaleDateString('en-US', { weekday: 'long' }); // "Saturday"
  const shortDay = eventDate.toLocaleDateString('en-US', { weekday: 'short' }); // "Sat"

  // Today
  if (diffDays === 0) {
    return 'tonight';
  }

  // Tomorrow
  if (diffDays === 1) {
    return 'tomorrow';
  }

  // This week (2-6 days)
  if (diffDays >= 2 && diffDays <= 6) {
    return `this ${dayOfWeek}`; // "this Friday"
  }

  // Next week (7-13 days)
  if (diffDays >= 7 && diffDays <= 13) {
    return `next ${dayOfWeek}`; // "next Saturday"
  }

  // Within the month - use "last [day] of [month]" or "first [day] of [month]"
  if (diffDays >= 14 && diffDays <= 31) {
    const weekOfMonth = Math.ceil(eventDate.getDate() / 7);
    const monthName = eventDate.toLocaleDateString('en-US', { month: 'long' });

    if (weekOfMonth === 1) {
      return `the first ${dayOfWeek} of ${monthName}`;
    } else if (weekOfMonth === 2) {
      return `the second ${dayOfWeek} of ${monthName}`;
    } else if (weekOfMonth === 3) {
      return `the third ${dayOfWeek} of ${monthName}`;
    } else if (isLastWeekOfMonth(eventDate)) {
      return `the last ${dayOfWeek} of ${monthName}`;
    } else {
      return `${shortDay}, ${monthName} ${eventDate.getDate()}`;
    }
  }

  // More than a month away - use month name
  const monthName = eventDate.toLocaleDateString('en-US', { month: 'long' });
  return `in ${monthName}`; // "in March"
}

function isLastWeekOfMonth(date: Date): boolean {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return date.getDate() > lastDay - 7;
}
```

**Output Examples:**
| Days Away | Output |
|-----------|--------|
| 0 | "tonight" |
| 1 | "tomorrow" |
| 3 | "this Wednesday" |
| 7 | "next Monday" |
| 10 | "next Thursday" |
| 14 | "the third Friday of January" |
| 25 | "the last Saturday of January" |
| 45 | "in March" |

---

## Smart Excerpt Extraction

Extract engaging snippets from event descriptions:

```typescript
function extractSmartExcerpt(description: string, maxLength: number = 50): string {
  if (!description) return '';

  // Clean up the description
  const cleaned = description.trim();

  // Try to find a compelling first sentence
  const firstSentence = cleaned.split(/[.!?]/)[0].trim();

  if (firstSentence.length <= maxLength) {
    return firstSentence;
  }

  // Truncate at word boundary
  const truncated = firstSentence.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  return truncated.substring(0, lastSpace) + '...';
}
```

**Examples:**
- Input: "Join us for an evening of powerful worship and praise. Featuring live bands and guest speakers."
- Output: "Join us for an evening of powerful worship"

- Input: "The biggest summer party Manchester has ever seen! Three stages, 20 artists."
- Output: "The biggest summer party Manchester has ever seen"

---

## Call-to-Action (CTA) Selection

```typescript
function getCTA(event: any): string {
  const isPaid = event.price_gbp > 0 || event.price_ngn > 0 || event.price_usd > 0;
  const hasLimitedSpots = event.max_attendees && event.current_attendees >= event.max_attendees * 0.8;

  if (hasLimitedSpots && isPaid) {
    return 'Limited spots - get your ticket!';
  }

  if (hasLimitedSpots && !isPaid) {
    return 'Limited spots - check in now!';
  }

  if (isPaid) {
    // Rotate between these
    const paidCTAs = [
      'Book your place!',
      'Get your ticket!',
      'Reserve your spot!',
      'Grab your ticket now!'
    ];
    return paidCTAs[Math.floor(Math.random() * paidCTAs.length)];
  }

  // Free event CTAs
  const freeCTAs = [
    'Check in to attend!',
    'RSVP now!',
    'Save your spot!',
    'Join the event!'
  ];
  return freeCTAs[Math.floor(Math.random() * freeCTAs.length)];
}
```

---

## Complete Template Builder

```typescript
interface EventNotificationInput {
  event: {
    id: string;
    title: string;
    description: string;
    category: string;
    event_date: string;
    city: string;
    location: string;
    venue?: string;
    price_gbp?: number;
    price_ngn?: number;
    max_attendees?: number;
    current_attendees?: number;
  };
  creator: {
    display_name: string;
    username: string;
    followers_count: number; // IMPORTANT: Include follower count
  };
}

function buildEventNotification(input: EventNotificationInput): {
  title: string;
  body: string;
  data: object;
} {
  const { event, creator } = input;
  const creatorName = creator.display_name || creator.username;
  const naturalDate = formatNaturalDate(new Date(event.event_date));
  const cta = getCTA(event);
  const excerpt = extractSmartExcerpt(event.description);
  const eventDate = new Date(event.event_date);
  const monthName = eventDate.toLocaleDateString('en-US', { month: 'long' }); // "February"
  const isHighProfile = creator.followers_count >= 10000;

  // ⭐ HIGH-PROFILE CREATOR (10k+ followers) - Use special hype template
  if (isHighProfile) {
    const highProfileVariant = Math.floor(Math.random() * 3);

    switch (highProfileVariant) {
      case 0:
        return {
          title: `${creatorName.toUpperCase()} IS COMING TO YOUR CITY!`,
          body: `${event.category} in ${monthName}! ${cta}`,
          data: buildNotificationData(event, creatorName)
        };
      case 1:
        return {
          title: `🔥 ${creatorName.toUpperCase()} IS COMING TO ${event.city.toUpperCase()}!`,
          body: `${event.title} - ${monthName}. This is HUGE! ${cta}`,
          data: buildNotificationData(event, creatorName)
        };
      case 2:
        return {
          title: `BIG NEWS: ${creatorName} live in ${event.city}!`,
          body: `${event.title} - ${monthName}. Be there! ${cta}`,
          data: buildNotificationData(event, creatorName)
        };
    }
  }

  // Regular creators - randomly select a template type for variety
  const templateType = Math.floor(Math.random() * 5);

  let title: string;
  let body: string;

  switch (templateType) {
    case 0: // Creator-focused
      title = `${creatorName} is hosting a ${event.category} ${naturalDate}!`;
      body = `${event.title} in ${event.city}. ${cta}`;
      break;

    case 1: // Description excerpt (if available)
      if (excerpt) {
        title = `${creatorName}: "${excerpt}"`;
        body = `${event.category} in ${event.city} ${naturalDate}. ${cta}`;
      } else {
        title = `${creatorName} has a ${event.category} coming up!`;
        body = `${event.title} in ${event.city} ${naturalDate}. ${cta}`;
      }
      break;

    case 2: // Casual/friendly
      title = `Hey! ${creatorName} has something for you`;
      body = `${event.category}: ${event.title} in ${event.city} ${naturalDate}`;
      break;

    case 3: // Location-first
      title = `${event.category} happening in ${event.city} ${naturalDate}!`;
      body = `${creatorName} presents: ${event.title}. ${cta}`;
      break;

    case 4: // Event title focused
      title = `${event.title} - ${naturalDate}`;
      body = `${creatorName}'s ${event.category} in ${event.city}. ${cta}`;
      break;

    default:
      title = `${creatorName} is hosting a ${event.category} ${naturalDate}!`;
      body = `${event.title} in ${event.city}. ${cta}`;
  }

  return {
    title,
    body,
    data: buildNotificationData(event, creatorName)
  };
}

// Helper function to build notification data object
function buildNotificationData(event: any, creatorName: string) {
  return {
    type: 'event',
    eventId: event.id,
    eventTitle: event.title,
    eventCategory: event.category,
    eventLocation: event.location,
    city: event.city,
    creatorName: creatorName,
    deepLink: `soundbridge://event/${event.id}`
  };
}
```

---

## Event Reminder Templates

### 24 Hours Before

```javascript
{
  title: `Reminder: ${creatorName}'s ${category} is tomorrow!`,
  body: `${eventTitle} at ${venue || city}. Don't miss it!`
}
```

**Example:**
- Title: "Reminder: Sarah Johnson's Gospel Concert is tomorrow!"
- Body: "Worship Night Live at Royal Albert Hall. Don't miss it!"

### 1 Hour Before

```javascript
{
  title: `${eventTitle} starts in 1 hour!`,
  body: `${creatorName}'s ${category} at ${venue || city}. See you there!`
}
```

**Example:**
- Title: "Worship Night Live starts in 1 hour!"
- Body: "Sarah Johnson's Gospel Concert at Royal Albert Hall. See you there!"

---

## Sample Notification Outputs

| Creator | Event | Category | City | Date | Sample Title | Sample Body |
|---------|-------|----------|------|------|--------------|-------------|
| Sarah Johnson | Worship Night | Gospel Concert | London | Tomorrow | "Sarah Johnson is hosting a Gospel Concert tomorrow!" | "Worship Night in London. Book your place!" |
| DJ Mike | Summer Vibes | Music Concert | Manchester | Next Saturday | "DJ Mike: \"The biggest party of the summer\"" | "Music Concert in Manchester next Saturday. Get your ticket!" |
| Jazz Ensemble | Evening Jazz | Jazz Room | Birmingham | This Friday | "Jazz Room happening in Birmingham this Friday!" | "Jazz Ensemble presents: Evening Jazz. Reserve your spot!" |
| Comedy Club | Stand Up Night | Comedy Night | Leeds | The last Saturday of January | "Hey! Comedy Club has something for you" | "Comedy Night: Stand Up Night in Leeds the last Saturday of January" |

---

## DO NOT USE

```javascript
// ❌ Generic and impersonal
title: "New event available!"
title: "Event: Worship Night"

// ❌ Raw dates
body: "on 2026-01-18T19:00:00Z"
body: "on January 18, 2026"

// ❌ No creator name
title: "Gospel Concert in London"

// ❌ No clear CTA
body: "Tap to learn more"
body: "Click here for details"
```

---

## Priority

**HIGH** - Natural, personal notifications significantly increase engagement and attendance rates.

---

*Document created: January 17, 2026*
