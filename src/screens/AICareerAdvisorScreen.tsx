import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { config } from '../config/environment';
import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { apiFetch } from '../lib/apiClient';
import { payoutService } from '../services/PayoutService';
import { creatorRevenueService } from '../services/CreatorRevenueService';
import { Session } from '@supabase/supabase-js';

const { width } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────────────────
type Phase = 'idle' | 'scanning' | 'results';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

interface InsightCardData {
  id: string;
  icon: string;
  color: string;
  bg: string;
  borderColor: string;
  shadowColor: string;
  label: string;
  title: string;
  stat: string;
  statUnit: string;
  statLabel: string;
  detail: string;
}

interface CreatorContext {
  // Profile / onboarding
  displayName: string;
  firstName: string;
  bio: string | null;
  onboardingUserType: string | null;
  genres: string[];
  location: string | null;
  isVerified: boolean;
  hasAvatar: boolean;
  accountCreatedAt: string | null;
  // Tracks
  totalTracks: number;
  totalPlays: number;
  topTracks: { title: string; plays: number; genre: string | null }[];
  moodTags: string[];
  // Earnings (from wallet API — net creator share)
  totalEarned: number;
  earningsCurrency: string;
  thisMonthEarnings: number;
  tipsByTrack: Record<string, number>;
  // Network
  followersCount: number;
  followingCount: number;
  communityMemberships: number;
  // Posts
  totalPosts: number;
  postTypes: string[];
  // Events
  createdEvents: { title: string; date: string; location: string | null; category: string | null; attendees: number }[];
  // Services
  isServiceProvider: boolean;
  serviceCategories: string[];
}

interface UsageData {
  id: string | null;
  analysesUsed: number;
  chatsUsed: number;
  freeDemoUsed: boolean;
  maxAnalyses: number;
  maxChats: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

interface ProactiveSignal {
  id: string;
  signal_type: 'quality_threshold' | 'live_interest' | 'curated_opportunity' | 'service_match';
  signal_data: any;
  generated_insight: string | null;
  shown_to_user: boolean;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const AI_GRADIENT = ['#ef4444', '#ec4899', '#a855f7', '#60a5fa'] as const;
const AI_GRADIENT_H = { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };
const AI_GRADIENT_D = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };

const SCAN_LINES = [
  'Connecting to SoundBridge...',
  'Loading your track catalogue...',
  'Analysing play and engagement patterns...',
  'Reviewing audience location data...',
  'Benchmarking against platform trends...',
  'Generating your personalised report...',
];

const CARD_CONFIGS = [
  { id: 'performance', icon: 'trending-up', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', borderColor: 'rgba(96,165,250,0.22)', shadowColor: '#60a5fa', label: 'PERFORMANCE' },
  { id: 'earnings',    icon: 'cash',        color: '#10b981', bg: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.22)', shadowColor: '#10b981', label: 'EARNINGS' },
  { id: 'location',   icon: 'location',    color: '#a855f7', bg: 'rgba(168,85,247,0.12)', borderColor: 'rgba(168,85,247,0.22)', shadowColor: '#a855f7', label: 'LOCATION' },
  { id: 'collaboration', icon: 'people',   color: '#ec4899', bg: 'rgba(236,72,153,0.12)', borderColor: 'rgba(236,72,153,0.22)', shadowColor: '#ec4899', label: 'COLLABORATION' },
  { id: 'timing',     icon: 'time',        color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.22)', shadowColor: '#fbbf24', label: 'RELEASE TIMING' },
] as const;

const TIER_LIMITS = {
  free:      { analyses: 0, chats: 0, freeDemo: 1 },
  premium:   { analyses: 10, chats: 5, freeDemo: 0 },
  unlimited: { analyses: 20, chats: 15, freeDemo: 0 },
};

const PROMPT_CHIPS = [
  'Why this city?',
  'How do I grow faster?',
  'What should I post today?',
  'Explain my earnings',
];

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function geminiPost(body: object, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 2000));
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status !== 503) return res;
    lastError = new Error(`Gemini error 503: service temporarily unavailable`);
  }
  throw lastError ?? new Error('Gemini unavailable after retries');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBillingPeriod(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1).toISOString().split('T')[0];
  const end   = new Date(y, m + 1, 0).toISOString().split('T')[0];
  return { start, end };
}

async function fetchCreatorContext(userId: string, session: Session): Promise<CreatorContext> {
  const [
    profileRes, tracksRes, tipsRes,
    followersRes, followingRes, postsRes, eventsRes,
    spRes, communityRes,
  ] = await Promise.allSettled([
    supabase
      .from('profiles')
      .select('display_name, bio, genres, location, onboarding_user_type, is_verified, avatar_url, created_at')
      .eq('id', userId)
      .single(),
    supabase
      .from('audio_tracks')
      .select('id, title, genre, play_count, mood_tags')
      .eq('creator_id', userId)
      .order('play_count', { ascending: false })
      .limit(20),
    supabase
      .from('tips')
      .select('amount, track_id')
      .eq('recipient_id', userId)
      .eq('status', 'completed'),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId),
    supabase
      .from('posts')
      .select('id, post_type')
      .eq('user_id', userId)
      .is('deleted_at', null),
    supabase
      .from('events')
      .select('id, title, event_date, location, category, current_attendees, max_attendees')
      .eq('creator_id', userId)
      .order('event_date', { ascending: false })
      .limit(10),
    supabase
      .from('service_provider_profiles')
      .select('categories')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('community_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', userId),
  ]);

  const profile          = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
  const tracks           = tracksRes.status  === 'fulfilled' ? (tracksRes.value.data ?? []) : [];
  const tips             = tipsRes.status    === 'fulfilled' ? (tipsRes.value.data ?? []) : [];
  const followersCount   = followersRes.status === 'fulfilled' ? (followersRes.value.count ?? 0) : 0;
  const followingCount   = followingRes.status === 'fulfilled' ? (followingRes.value.count ?? 0) : 0;
  const posts            = postsRes.status === 'fulfilled' ? (postsRes.value.data ?? []) : [];
  const events           = eventsRes.status === 'fulfilled' ? (eventsRes.value.data ?? []) : [];
  const spProfile        = spRes.status === 'fulfilled' ? spRes.value.data : null;
  const communityCount   = communityRes.status === 'fulfilled' ? (communityRes.value.count ?? 0) : 0;

  // Use wallet_transactions via getRevenueBySource — same source as Creator Insights (most accurate)
  const now = new Date().toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const [allTimeRevenue, thisMonthRevenue] = await Promise.all([
    creatorRevenueService.getRevenueBySource(session).catch(() => null),
    creatorRevenueService.getRevenueBySource(session, monthStart, now).catch(() => null),
  ]);

  const totalPlays = tracks.reduce((s: number, t: any) => s + (t.play_count ?? 0), 0);
  const topTracks  = tracks.slice(0, 5).map((t: any) => ({
    title: t.title,
    plays: t.play_count ?? 0,
    genre: t.genre ?? null,
  }));

  const tipsByTrack: Record<string, number> = {};
  for (const t of tips) {
    if (t.track_id) tipsByTrack[t.track_id] = (tipsByTrack[t.track_id] ?? 0) + (t.amount ?? 0);
  }

  const moodTags: string[] = Array.from(
    new Set(tracks.flatMap((t: any) => t.mood_tags ?? []))
  ).slice(0, 10) as string[];

  const totalEarned       = allTimeRevenue?.total?.amount ?? 0;
  const thisMonthEarnings = thisMonthRevenue?.total?.amount ?? 0;
  const earningsCurrency  = allTimeRevenue?.total?.currency ?? 'GBP';

  const displayName = profile?.display_name ?? 'Creator';
  const firstName   = displayName.split(' ')[0];

  const postTypes: string[] = Array.from(new Set(posts.map((p: any) => p.post_type).filter(Boolean)));

  const createdEvents = events.map((e: any) => ({
    title:     e.title ?? 'Untitled',
    date:      e.event_date ?? '',
    location:  e.location ?? null,
    category:  e.category ?? null,
    attendees: e.current_attendees ?? 0,
  }));

  return {
    displayName,
    firstName,
    bio:               profile?.bio ?? null,
    onboardingUserType: profile?.onboarding_user_type ?? null,
    genres:            profile?.genres ?? [],
    location:          profile?.location ?? null,
    isVerified:        profile?.is_verified ?? false,
    hasAvatar:         !!(profile?.avatar_url),
    accountCreatedAt:  profile?.created_at ?? null,
    totalTracks:       tracks.length,
    totalPlays,
    topTracks,
    moodTags,
    totalEarned,
    earningsCurrency,
    thisMonthEarnings,
    tipsByTrack,
    followersCount,
    followingCount,
    communityMemberships: communityCount,
    totalPosts:           posts.length,
    postTypes,
    createdEvents,
    isServiceProvider:    !!spProfile,
    serviceCategories:    spProfile?.categories ?? [],
  };
}

async function getOrCreateUsage(creatorId: string, tier: 'free' | 'premium' | 'unlimited'): Promise<UsageData> {
  const { start, end } = getBillingPeriod();
  const limits = TIER_LIMITS[tier];

  try {
    const { data, error } = await supabase
      .from('ai_adviser_usage')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('billing_period_start', start)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const { data: newRow, error: insertErr } = await supabase
        .from('ai_adviser_usage')
        .insert({ creator_id: creatorId, billing_period_start: start, billing_period_end: end })
        .select()
        .single();
      if (insertErr) throw insertErr;
      return {
        id: newRow.id,
        analysesUsed: 0,
        chatsUsed: 0,
        freeDemoUsed: false,
        maxAnalyses: limits.analyses,
        maxChats: limits.chats,
        billingPeriodStart: start,
        billingPeriodEnd: end,
      };
    }

    return {
      id: data.id,
      analysesUsed: data.analyses_used ?? 0,
      chatsUsed: data.chats_used ?? 0,
      freeDemoUsed: data.free_demo_used ?? false,
      maxAnalyses: limits.analyses,
      maxChats: limits.chats,
      billingPeriodStart: data.billing_period_start,
      billingPeriodEnd: data.billing_period_end,
    };
  } catch {
    return {
      id: null,
      analysesUsed: 0,
      chatsUsed: 0,
      freeDemoUsed: false,
      maxAnalyses: limits.analyses,
      maxChats: limits.chats,
      billingPeriodStart: start,
      billingPeriodEnd: end,
    };
  }
}

async function incrementUsage(usageId: string | null, field: 'analyses_used' | 'chats_used' | 'free_demo_used', current: number | boolean) {
  if (!usageId) return;
  const value = typeof current === 'boolean' ? true : (current as number) + 1;
  await supabase.from('ai_adviser_usage').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', usageId);
}

function detectProactiveWelcome(ctx: Pick<CreatorContext, 'totalTracks' | 'bio' | 'hasAvatar'>): string | null {
  if (ctx.totalTracks === 0) {
    return "You haven't uploaded anything yet, and that is completely fine — everyone starts here. Can I ask you something? A lot of artists feel a bit nervous about putting their first thing out there. Does that sound like you at all? If so, that is normal, and the people who push through that feeling are usually glad they did.";
  }
  if (ctx.totalTracks === 1) {
    return "Your first track is live. Here is something worth knowing — the artists who tend to build something real out of this usually do a few simple things early on: they finish their profile completely, they tell their own circle directly rather than waiting to be discovered, and they stay consistent rather than disappearing after one upload. You do not need to do all of this today. Just keep it in mind.";
  }
  if (!ctx.bio || !ctx.hasAvatar) {
    return "You are most of the way there. The people who get discovered fastest usually have one more thing in place — a clear photo and a few honest words about who they are. Want me to help you think through what to write?";
  }
  return null;
}

async function callGeminiAnalysis(ctx: CreatorContext): Promise<InsightCardData[]> {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not configured. Add EXPO_PUBLIC_GEMINI_API_KEY to .env.');

  const hasData = ctx.totalTracks > 0;

  const symbol = ctx.earningsCurrency === 'GBP' ? '£' : ctx.earningsCurrency === 'EUR' ? '€' : '$';
  const tipsDisplay = ctx.totalEarned > 0
    ? `${symbol}${ctx.totalEarned.toFixed(2)} ${ctx.earningsCurrency} total earned (${symbol}${ctx.thisMonthEarnings.toFixed(2)} this month)`
    : 'None yet';

  const systemPrompt = `You are a music industry AI career advisor for SoundBridge — someone who genuinely knows this creator and cares about them, not a dashboard and not a generic chatbot.
You receive real data about a creator and produce a JSON analysis with exactly 5 insight cards.
Never fabricate statistics. If data is missing or the creator has no uploads yet, say so honestly and give onboarding guidance.
Always respond with valid JSON only — no markdown fences, no explanation outside the JSON.

PERSONALITY — these rules are non-negotiable:
- Never use the creator's name anywhere. The name appears only in the app header, never in your output.
- Always write in second person: "You", "Your", "You've". Never say "the creator" or third-person phrasing.
- Write in plain, warm, simple language at all times. Never technical, never corporate.
- Every single data point must be translated into what it actually means for the person in the simplest possible words, before any number is shown. The number supports the sentence. The sentence is never just the number. For example, instead of "your repeat listen rate is 14%", say "people are coming back to listen to this again — that almost never happens by accident, that means something real is landing with them."
- Never judge, discourage, or imply someone is behind, wrong, or not doing enough. Always frame things as "here is what tends to work", never "here is what you are doing wrong."
- Do not use rigid section headers in ALL CAPS or title case within detail text. Write naturally as a flowing paragraph.
- Avoid hollow filler phrases: "consider promoting", "areas for growth", "explore opportunities", "leverage your". Say the actual thing directly.
- When data shows early-stage numbers, frame them as a real starting point, not a deficiency. Acknowledge what exists, explain what it signals, give a specific next step.
- Never invent data. If a stat truly has no data, the stat field should be "—" and acknowledge it honestly in one sentence, then pivot to the most useful guidance you can offer.
- End every detail field with one clear, specific, immediately actionable sentence the creator can act on today.

VERIFICATION AND PHOTO — only include these if the data shows they apply:
- If not verified: weave in warmly once — "one small thing that helps people trust you faster: your profile isn't verified yet. It only takes a couple of minutes and people tend to book and support verified profiles more readily."
- If no photo: "a simple, well-lit photo helps people feel like they know you before they've even heard your music."
- Photo guidance is strictly limited to whether a photo exists, and technically: resolution, lighting, face visible. Never comment on personality, confidence, boldness, or presentation style.

Output format:
{
  "intro": "One warm opening sentence in second person. No name. Translate what the overall data means in plain language before anything else.",
  "cards": [
    { "id": "performance",   "title": "...", "stat": "...", "statUnit": "...", "statLabel": "...", "detail": "..." },
    { "id": "earnings",      "title": "...", "stat": "...", "statUnit": "...", "statLabel": "...", "detail": "..." },
    { "id": "location",      "title": "...", "stat": "...", "statUnit": "...", "statLabel": "...", "detail": "..." },
    { "id": "collaboration", "title": "...", "stat": "...", "statUnit": "...", "statLabel": "...", "detail": "..." },
    { "id": "timing",        "title": "...", "stat": "...", "statUnit": "...", "statLabel": "...", "detail": "..." }
  ]
}

Field rules:
- stat: short number/value shown large (e.g. "108", "${symbol}4.25", "—")
- statUnit: very short unit if applicable (e.g. "plays", "followers") or empty string
- statLabel: one short contextual label (e.g. "all-time", "this month") or empty string
- detail: 2–3 sentences in second person. Plain language first, then number. End with one specific next step.
- earnings detail: use the exact currency symbol — USD = $, GBP = £, NGN = ₦. Never convert or assume.`;

  const userContent = `Creator data:
Onboarding type: ${ctx.onboardingUserType ?? 'Not specified'}
Bio: ${ctx.bio ? 'Present' : 'Missing — profile incomplete'}
Profile photo: ${ctx.hasAvatar ? 'Present' : 'Missing — no photo uploaded'}
Verified: ${ctx.isVerified ? 'Yes' : 'No — not yet verified'}
Genres: ${ctx.genres.length > 0 ? ctx.genres.join(', ') : 'Not specified'}
Location: ${ctx.location ?? 'Not specified'}
Total public tracks: ${ctx.totalTracks}
Total all-time plays: ${ctx.totalPlays}
Top tracks: ${hasData ? ctx.topTracks.map(t => `"${t.title}" — ${t.plays} plays${t.genre ? ` (${t.genre})` : ''}`).join('; ') : 'None yet'}
Mood tags: ${ctx.moodTags.length > 0 ? ctx.moodTags.join(', ') : 'None tagged'}
Total earnings (net, wallet): ${tipsDisplay}
Followers: ${ctx.followersCount}
Following: ${ctx.followingCount}
Community memberships: ${ctx.communityMemberships}
Total posts: ${ctx.totalPosts}${ctx.postTypes.length > 0 ? ` (types: ${ctx.postTypes.join(', ')})` : ''}
Created events: ${ctx.createdEvents.length > 0 ? ctx.createdEvents.map(e => `"${e.title}"${e.category ? ` [${e.category}]` : ''} on ${e.date}${e.location ? ` in ${e.location}` : ''}, ${e.attendees} attendees`).join('; ') : 'None'}
Service provider: ${ctx.isServiceProvider ? `Yes (categories: ${ctx.serviceCategories.join(', ') || 'not listed'})` : 'No'}`;

  const res = await geminiPost({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userContent }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const raw: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  // Extract the JSON object robustly — handles markdown fences and leading/trailing text
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse Gemini response. Please try again.');
  const parsed = JSON.parse(jsonMatch[0]);

  return CARD_CONFIGS.map(cfg => {
    const card = parsed.cards?.find((c: any) => c.id === cfg.id) ?? {};
    return {
      ...cfg,
      title:     card.title     ?? 'Analysis unavailable',
      stat:      card.stat      ?? '—',
      statUnit:  card.statUnit  ?? '',
      statLabel: card.statLabel ?? '',
      detail:    card.detail    ?? 'Could not generate insight for this category.',
      _intro:    parsed.intro   ?? '',
    } as InsightCardData & { _intro: string };
  });
}

async function callGeminiChat(
  ctx: CreatorContext,
  history: ChatMessage[],
  newMessage: string,
  analysisCards: InsightCardData[]
): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not configured.');

  const chatSymbol = ctx.earningsCurrency === 'GBP' ? '£' : ctx.earningsCurrency === 'EUR' ? '€' : '$';
  const chatTipsDisplay = ctx.totalEarned > 0
    ? `${chatSymbol}${ctx.totalEarned.toFixed(2)} ${ctx.earningsCurrency} total earned`
    : 'none yet';

  const systemPrompt = `You are the SoundBridge AI Career Advisor — someone who genuinely knows this creator and cares about them. You speak directly to them in a warm, personal way.

RULES — non-negotiable:
1. NEVER say the creator's name. Use "you" and "your" exclusively.
2. NEVER say "the creator" or third-person phrasing. You are talking TO them, not ABOUT them.
3. Plain, warm, simple language at all times. Never technical, never corporate.
4. Translate every data point into what it means in plain language before quoting any number. The number supports the sentence, the sentence is never just the number.
5. Never judge, discourage, or imply they are behind or doing something wrong. Frame things as "here is what tends to work."
6. Real numbers from the data only. Never invent statistics.
7. Write like a genuinely invested manager — warm, direct, specific. No hollow phrases: "consider", "explore opportunities", "leverage", "areas for growth". Say the actual thing.
8. Occasionally ask gentle, open, reflective questions that invite the person to share more — always as genuine curiosity, never as an assessment. Examples: "What made you want to start sharing your music publicly?" or "A lot of people find it hard to ask their own community to support them directly — has that felt true for you?" Always follow any reflective question with encouragement, never leave it as a judgement.
9. Keep responses to 3–5 sentences. End with one specific, immediately actionable next step.
10. If not verified, mention it warmly once: "One small thing that helps people trust you faster — your profile isn't verified yet. It only takes a couple of minutes and people tend to book and support verified profiles more readily."
11. Photo guidance is strictly limited to whether a photo exists and technical quality (lighting, resolution, face clearly visible). Never comment on personality, confidence, boldness, or presentation style from a photo.

Creator data:
Profile photo: ${ctx.hasAvatar ? 'present' : 'missing'}
Verified: ${ctx.isVerified ? 'yes' : 'no'}
Bio: ${ctx.bio ? 'present' : 'missing'}
Onboarding type: ${ctx.onboardingUserType ?? 'not specified'}
Genres: ${ctx.genres.join(', ') || 'not specified'}
Location: ${ctx.location ?? 'not specified'}
Tracks: ${ctx.totalTracks}, Total plays: ${ctx.totalPlays}
Top track: ${ctx.topTracks[0] ? `"${ctx.topTracks[0].title}" (${ctx.topTracks[0].plays} plays)` : 'none yet'}
Earnings (net): ${chatTipsDisplay}
Followers: ${ctx.followersCount}, Following: ${ctx.followingCount}
Posts: ${ctx.totalPosts}${ctx.postTypes.length > 0 ? ` (${ctx.postTypes.join(', ')})` : ''}
Events created: ${ctx.createdEvents.length > 0 ? ctx.createdEvents.map(e => `"${e.title}" — ${e.attendees} attendees`).join('; ') : 'none'}
Service provider: ${ctx.isServiceProvider ? `Yes (${ctx.serviceCategories.join(', ') || 'categories not listed'})` : 'No'}`;

  const contents = [
    ...history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    })),
    { role: 'user', parts: [{ text: newMessage }] },
  ];

  const res = await geminiPost({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.75, maxOutputTokens: 600 },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'Sorry, I could not generate a response right now.';
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((dots.length - i) * 160),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#a855f7', opacity: dot }}
        />
      ))}
    </View>
  );
}

// ─── AI Badge ────────────────────────────────────────────────────────────────
function AiBadge({ size = 28, radius = 8, fontSize = 10 }: { size?: number; radius?: number; fontSize?: number }) {
  return (
    <LinearGradient colors={AI_GRADIENT} {...AI_GRADIENT_D} style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize, fontWeight: '800', letterSpacing: 0.5 }}>AI</Text>
    </LinearGradient>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AICareerAdvisorScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user, userProfile, session } = useAuth();

  const effectiveTier: 'free' | 'premium' | 'unlimited' =
    config.bypassRevenueCat && !config.useProfileTier
      ? (config.developmentTier ?? 'free')
      : ((userProfile?.subscription_tier as 'free' | 'premium' | 'unlimited') ?? 'free');

  const firstName = userProfile?.display_name?.split(' ')[0] ?? 'Creator';

  const [phase, setPhase] = useState<Phase>('idle');
  const [visibleLines, setVisibleLines] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(CARD_CONFIGS.map(() => new Animated.Value(0))).current;

  const [dynamicCards, setDynamicCards] = useState<InsightCardData[]>([]);
  const [chatIntro, setChatIntro] = useState('I\'ve analysed your career data. Ask me anything about your results, or tap a suggestion below.');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [allConversations, setAllConversations] = useState<{ id: string; startedAt: string; preview: string }[]>([]);
  const creatorCtxRef = useRef<CreatorContext | null>(null);
  const analysisCardsRef = useRef<InsightCardData[]>([]);

  const [proactiveSignals, setProactiveSignals] = useState<ProactiveSignal[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.55)).current;

  const [proactiveWelcomeMsg, setProactiveWelcomeMsg] = useState<string | null>(null);

  // ── Pulsating alert indicator ────────────────────────────────────────────
  useEffect(() => {
    if (proactiveSignals.length === 0) return;
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.9, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.55, duration: 1000, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [proactiveSignals.length]);

  // ── Load proactive signals ────────────────────────────────────────────────
  const loadProactiveSignals = useCallback(async () => {
    if (!user?.id || effectiveTier === 'free') return;
    try {
      const { data } = await supabase
        .from('ai_proactive_signals')
        .select('*')
        .eq('creator_id', user.id)
        .eq('shown_to_user', false)
        .order('created_at', { ascending: false })
        .limit(10);
      setProactiveSignals(data ?? []);
    } catch {}
  }, [user?.id, effectiveTier]);

  const openAlerts = useCallback(async () => {
    setShowAlerts(true);
    if (proactiveSignals.length === 0) return;
    const ids = proactiveSignals.map(s => s.id);
    try {
      await supabase.from('ai_proactive_signals').update({ shown_to_user: true }).in('id', ids);
      setProactiveSignals([]);
    } catch {}
  }, [proactiveSignals]);

  useEffect(() => { loadProactiveSignals(); }, [loadProactiveSignals]);

  // ── Proactive welcome — lightweight mount-time lifecycle check ────────────
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const [{ data: prof }, { count: trackCount }] = await Promise.all([
          supabase.from('profiles').select('bio, is_verified, avatar_url').eq('id', user.id).single(),
          supabase.from('audio_tracks').select('*', { count: 'exact', head: true }).eq('creator_id', user.id),
        ]);
        const msg = detectProactiveWelcome({
          totalTracks: trackCount ?? 0,
          bio: prof?.bio ?? null,
          hasAvatar: !!(prof?.avatar_url),
        });
        setProactiveWelcomeMsg(msg);
      } catch {}
    })();
  }, [user?.id]);

  // ── Load usage + restore last conversation on mount ──────────────────────
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setUsageLoading(true);
      const usage = await getOrCreateUsage(user.id, effectiveTier);
      setUsageData(usage);
      setUsageLoading(false);

      // Restore last conversation
      try {
        const { data } = await supabase
          .from('ai_adviser_conversations')
          .select('id, messages')
          .eq('creator_id', user.id)
          .order('last_message_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.messages?.length) {
          setConversationId(data.id);
          setChatMessages(data.messages as ChatMessage[]);
        }
      } catch {}
    })();
  }, [user?.id]);

  // ── Conversation management ───────────────────────────────────────────────
  const startNewChat = () => {
    setConversationId(null);
    setChatMessages([]);
  };

  const openHistory = async () => {
    if (!user?.id) return;
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('ai_adviser_conversations')
        .select('id, started_at, last_message_at, messages')
        .eq('creator_id', user.id)
        .order('last_message_at', { ascending: false })
        .limit(30);
      setAllConversations(
        (data ?? []).map((conv: any) => {
          const msgs = (conv.messages ?? []) as ChatMessage[];
          const firstUser = msgs.find(m => m.role === 'user');
          return {
            id: conv.id,
            startedAt: conv.started_at,
            preview: firstUser?.text?.slice(0, 70) ?? 'New conversation',
          };
        })
      );
    } catch {}
    setHistoryLoading(false);
  };

  const loadConversationFromHistory = async (id: string) => {
    try {
      const { data } = await supabase
        .from('ai_adviser_conversations')
        .select('id, messages')
        .eq('id', id)
        .single();
      if (data) {
        setConversationId(data.id);
        setChatMessages((data.messages ?? []) as ChatMessage[]);
      }
    } catch {}
    setShowHistory(false);
  };

  const deleteConversationFromHistory = async (id: string) => {
    Alert.alert('Delete conversation?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('ai_adviser_conversations').delete().eq('id', id);
          setAllConversations(prev => prev.filter(c => c.id !== id));
          if (conversationId === id) { setConversationId(null); setChatMessages([]); }
        },
      },
    ]);
  };

  // ── Determine locked state ────────────────────────────────────────────────
  const isAnalysisLocked = (() => {
    if (!usageData) return false;
    if (effectiveTier === 'free') return usageData.freeDemoUsed;
    return usageData.analysesUsed >= usageData.maxAnalyses;
  })();

  const isChatLocked = (() => {
    if (!usageData) return true;
    if (effectiveTier === 'free') return true;
    return usageData.chatsUsed >= usageData.maxChats;
  })();

  const analysesRemaining = usageData
    ? effectiveTier === 'free'
      ? (usageData.freeDemoUsed ? 0 : 1)
      : Math.max(0, usageData.maxAnalyses - usageData.analysesUsed)
    : null;

  const chatsRemaining = usageData
    ? effectiveTier === 'free' ? 0 : Math.max(0, usageData.maxChats - usageData.chatsUsed)
    : null;

  // ── Start scan ────────────────────────────────────────────────────────────
  const startScan = useCallback(async () => {
    if (!user?.id) return;

    setPhase('scanning');
    setVisibleLines(0);
    setAnalysisError(null);
    progressAnim.setValue(0);

    // Animate scan lines
    SCAN_LINES.forEach((_, i) => {
      setTimeout(() => setVisibleLines(prev => prev + 1), i * 600 + 300);
    });
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: SCAN_LINES.length * 600 + 200,
      useNativeDriver: false,
    }).start();

    // Fetch real data + call Gemini in parallel with animation
    try {
      const ctx = await fetchCreatorContext(user.id, session!);
      creatorCtxRef.current = ctx;

      const cards = await callGeminiAnalysis(ctx) as (InsightCardData & { _intro?: string })[];
      const intro = (cards[0] as any)?._intro;
      if (intro) setChatIntro(intro);
      const clean: InsightCardData[] = cards.map(({ _intro: _, ...rest }) => rest as InsightCardData);
      setDynamicCards(clean);
      analysisCardsRef.current = clean;

      // Persist analysis
      try {
        await supabase.from('ai_adviser_analyses').insert({
          creator_id: user.id,
          analysis_json: { cards: clean, intro },
        });
      } catch {}

      // Increment usage
      if (usageData) {
        if (effectiveTier === 'free') {
          await incrementUsage(usageData.id, 'free_demo_used', false);
          setUsageData(prev => prev ? { ...prev, freeDemoUsed: true } : prev);
        } else {
          await incrementUsage(usageData.id, 'analyses_used', usageData.analysesUsed);
          setUsageData(prev => prev ? { ...prev, analysesUsed: prev.analysesUsed + 1 } : prev);
        }
      }
    } catch (err: any) {
      setAnalysisError(err?.message ?? 'Could not generate analysis. Please try again.');
    }

    // Wait for scan animation to finish, then show results
    const scanDuration = SCAN_LINES.length * 600 + 600;
    setTimeout(() => {
      setPhase('results');
      CARD_CONFIGS.forEach((_, i) => {
        setTimeout(() => {
          Animated.spring(cardAnims[i], { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }).start();
        }, i * 120);
      });
    }, scanDuration);
  }, [user?.id, usageData, effectiveTier]);

  // ── Send chat message ─────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !user?.id) return;

    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: text.trim() };
    const updatedHistory = [...chatMessages, newUserMsg];
    setChatMessages(updatedHistory);
    setChatInput('');
    setIsTyping(true);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const ctx = creatorCtxRef.current ?? await fetchCreatorContext(user.id, session!);
      creatorCtxRef.current = ctx;

      const reply = await callGeminiChat(ctx, chatMessages, text.trim(), analysisCardsRef.current);
      const newAiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'ai', text: reply };
      const fullHistory = [...updatedHistory, newAiMsg];
      setIsTyping(false);
      setChatMessages(fullHistory);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

      // Persist conversation
      try {
        if (conversationId) {
          await supabase.from('ai_adviser_conversations').update({
            messages: fullHistory,
            last_message_at: new Date().toISOString(),
          }).eq('id', conversationId);
        } else {
          const { data } = await supabase.from('ai_adviser_conversations').insert({
            creator_id: user.id,
            messages: fullHistory,
          }).select('id').single();
          if (data?.id) setConversationId(data.id);
        }
      } catch {}

      // Increment chat usage
      if (usageData) {
        await incrementUsage(usageData.id, 'chats_used', usageData.chatsUsed);
        setUsageData(prev => prev ? { ...prev, chatsUsed: prev.chatsUsed + 1 } : prev);
      }
    } catch (err: any) {
      setIsTyping(false);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'ai',
        text: `Sorry, I couldn't process that right now. ${err?.message ?? 'Please try again.'}`,
      };
      setChatMessages(prev => [...prev, errorMsg]);
    }
  }, [user?.id, chatMessages, usageData, conversationId]);

  // ── Buy extra analyses ────────────────────────────────────────────────────
  const handleBuyCredits = useCallback(async () => {
    if (!session) return;
    try {
      const { clientSecret } = await apiFetch<{ clientSecret: string }>('/api/ai-adviser/credits/create-payment', {
        method: 'POST',
        session,
        body: JSON.stringify({ creatorId: user?.id, amount: 199, currency: 'gbp', credits: 5 }),
      });
      const { error: initErr } = await initPaymentSheet({
        merchantDisplayName: 'SoundBridge',
        paymentIntentClientSecret: clientSecret,
      });
      if (initErr) { Alert.alert('Error', initErr.message); return; }
      const { error: presentErr } = await presentPaymentSheet();
      if (presentErr) { if (presentErr.code !== 'Canceled') Alert.alert('Payment failed', presentErr.message); return; }
      await apiFetch('/api/ai-adviser/credits/confirm', {
        method: 'POST',
        session,
        body: JSON.stringify({ creatorId: user?.id, credits: 5 }),
      });
      setUsageData(prev => prev ? { ...prev, maxAnalyses: prev.maxAnalyses + 5 } : prev);
      Alert.alert('Done', '5 additional analyses added to your account.');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not complete purchase. Please try again.');
    }
  }, [session, user?.id]);

  // ── Render locked state ───────────────────────────────────────────────────
  const renderLockedState = () => (
    <View style={styles.lockedContainer}>
      <View style={[styles.lockedCard, { borderColor: 'rgba(168,85,247,0.25)' }]}>
        <LinearGradient
          colors={['rgba(168,85,247,0.12)', 'transparent']}
          {...AI_GRADIENT_D}
          style={StyleSheet.absoluteFill}
        />
        <AiBadge size={56} radius={17} fontSize={20} />
        <Ionicons name="lock-closed" size={28} color="#a855f7" style={{ marginTop: 16 }} />
        <Text style={styles.lockedTitle}>
          {effectiveTier === 'free' ? 'Free demo used' : 'Monthly limit reached'}
        </Text>
        <Text style={styles.lockedBody}>
          {effectiveTier === 'free'
            ? 'You have used your free analysis. Upgrade to Premium or Unlimited for ongoing access.'
            : `You have used all ${usageData?.maxAnalyses} analyses for this billing period. Buy 5 more or wait until next month.`}
        </Text>
        {effectiveTier === 'free' ? (
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => (navigation as any).navigate('Upgrade')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={AI_GRADIENT} {...AI_GRADIENT_H} style={styles.ctaBtnGrad}>
              <Ionicons name="diamond" size={18} color="#fff" />
              <Text style={styles.ctaBtnText}>Access Premium</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.ctaBtn} onPress={handleBuyCredits} activeOpacity={0.85}>
            <LinearGradient colors={AI_GRADIENT} {...AI_GRADIENT_H} style={styles.ctaBtnGrad}>
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.ctaBtnText}>Buy 5 more analyses — £1.99</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Background */}
      <LinearGradient
        colors={['#080812', '#1a0a2e', '#080812']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.ambientGlow} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <View style={styles.backBtnInner}>
              <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.85)" />
            </View>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <AiBadge size={30} radius={9} fontSize={11} />
            <Text style={styles.headerTitle}>Career Advisor</Text>
          </View>

          {/* Right slot: alert indicator + usage pill */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {proactiveSignals.length > 0 && (
              <TouchableOpacity onPress={openAlerts} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.alertBellBtn}>
                <Ionicons name="notifications-outline" size={22} color="#a855f7" />
                <View style={styles.alertBellDotWrap}>
                  <Animated.View style={[styles.alertBellPulse, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
                  <View style={styles.alertBellDot} />
                </View>
              </TouchableOpacity>
            )}
            {!usageLoading && usageData && analysesRemaining !== null && phase !== 'results' && (
              <View style={styles.usagePill}>
                <Text style={styles.usagePillText}>
                  {effectiveTier === 'free'
                    ? (usageData.freeDemoUsed ? '0 left' : '1 demo')
                    : `${analysesRemaining} left`}
                </Text>
              </View>
            )}
            {(usageLoading || analysesRemaining === null || phase === 'results') && proactiveSignals.length === 0 && (
              <View style={{ width: 60 }} />
            )}
          </View>
        </View>

        <ScrollView
          ref={chatScrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Greeting hero ── */}
          <View style={styles.greetingSection}>
            <View style={styles.greetingBadgeRow}>
              <View style={styles.greetingBadge}>
                <View style={styles.greetingBadgeDot} />
                <Text style={styles.greetingBadgeText}>PERSONALISED ANALYSIS</Text>
              </View>
            </View>
            <Text style={styles.greetName}>Good evening, {firstName}</Text>
            <Text style={styles.greetSub}>
              Your personal AI career analyst — trained on SoundBridge data from thousands of creators.
            </Text>
          </View>

          {/* ── Proactive Alerts ── */}
          {effectiveTier !== 'free' && (proactiveSignals.length > 0 || showAlerts) && (
            <View style={styles.alertsSection}>
              {!showAlerts && proactiveSignals.length > 0 && (
                <TouchableOpacity style={styles.alertsBanner} onPress={openAlerts} activeOpacity={0.85}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={styles.alertsBannerDotWrap}>
                      <Animated.View style={[styles.alertsBannerPulse, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
                      <View style={styles.alertsBannerDot} />
                    </View>
                    <Text style={styles.alertsBannerText}>
                      {proactiveSignals.length} new career insight{proactiveSignals.length !== 1 ? 's' : ''} for you
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color="#a855f7" />
                </TouchableOpacity>
              )}

              {showAlerts && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 2 }}>
                    <Text style={styles.sectionLabel}>YOUR ALERTS</Text>
                    <TouchableOpacity onPress={() => setShowAlerts(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="chevron-up" size={18} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                  </View>

                  {proactiveSignals.length === 0 ? (
                    <Text style={styles.alertsEmpty}>All caught up — no new insights.</Text>
                  ) : (
                    proactiveSignals.map((signal) => {
                      const isServiceMatch = signal.signal_type === 'service_match';
                      const signalIcons: Record<string, string> = {
                        quality_threshold: 'trending-up',
                        live_interest: 'people',
                        curated_opportunity: 'bulb',
                        service_match: 'person-add',
                      };
                      const signalColors: Record<string, string> = {
                        quality_threshold: '#60a5fa',
                        live_interest: '#10b981',
                        curated_opportunity: '#fbbf24',
                        service_match: '#ec4899',
                      };
                      const color = signalColors[signal.signal_type] ?? '#a855f7';
                      return (
                        <View key={signal.id} style={[styles.alertCard, { borderColor: `${color}35` }]}>
                          <LinearGradient
                            colors={[`${color}12`, 'transparent']}
                            {...AI_GRADIENT_D}
                            style={StyleSheet.absoluteFill}
                          />
                          <View style={styles.alertCardHeader}>
                            <View style={[styles.alertIconWrap, { backgroundColor: `${color}20` }]}>
                              <Ionicons name={signalIcons[signal.signal_type] as any ?? 'sparkles'} size={16} color={color} />
                            </View>
                            <Text style={[styles.alertCardType, { color }]}>
                              {signal.signal_type === 'quality_threshold' ? 'Quality milestone'
                                : signal.signal_type === 'live_interest' ? 'Live interest spike'
                                : signal.signal_type === 'curated_opportunity' ? 'Opportunity spotted'
                                : 'Collaborator match'}
                            </Text>
                          </View>
                          <Text style={styles.alertCardText}>
                            {signal.generated_insight ?? 'Tap to learn more in your career analysis.'}
                          </Text>
                          {isServiceMatch && signal.signal_data?.provider_user_id && (
                            <TouchableOpacity
                              style={[styles.alertConnectBtn, { borderColor: `${color}55`, backgroundColor: `${color}18` }]}
                              onPress={() => (navigation as any).navigate('ServiceProviderDashboard', { providerId: signal.signal_data.provider_user_id })}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.alertConnectText, { color }]}>
                                Connect with {signal.signal_data.provider_name ?? 'this provider'} →
                              </Text>
                            </TouchableOpacity>
                          )}
                          {signal.signal_data?.source_url && (
                            <TouchableOpacity
                              style={[styles.alertConnectBtn, { borderColor: `${color}55`, backgroundColor: `${color}18` }]}
                              onPress={() => { /* Linking.openURL(signal.signal_data.source_url) handled by web team */ }}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.alertConnectText, { color }]}>View opportunity →</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })
                  )}
                </>
              )}
            </View>
          )}

          {/* ── Proactive welcome card — lifecycle-triggered ── */}
          {phase === 'idle' && proactiveWelcomeMsg && (
            <View style={styles.welcomeCard}>
              <LinearGradient
                colors={['rgba(168,85,247,0.14)', 'rgba(96,165,250,0.06)']}
                {...AI_GRADIENT_D}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.welcomeCardHeader}>
                <AiBadge size={28} radius={8} fontSize={10} />
                <Text style={styles.welcomeCardLabel}>A thought before you start</Text>
              </View>
              <Text style={styles.welcomeCardText}>{proactiveWelcomeMsg}</Text>
            </View>
          )}

          {/* ── IDLE ── */}
          {phase === 'idle' && !usageLoading && (
            <>
              {isAnalysisLocked ? renderLockedState() : (
                <View style={styles.idleContainer}>
                  <View style={styles.idleCard}>
                    <LinearGradient
                      colors={['rgba(168,85,247,0.18)', 'rgba(96,165,250,0.10)', 'rgba(236,72,153,0.08)']}
                      {...AI_GRADIENT_D}
                      style={StyleSheet.absoluteFill}
                    />
                    <LinearGradient
                      colors={['rgba(168,85,247,0.6)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.idleCardTopGlow}
                    />

                    <AiBadge size={68} radius={20} fontSize={24} />

                    <Text style={styles.idleTitle}>Ready to analyse{'\n'}your career</Text>
                    <Text style={styles.idleBody}>
                      I'll scan your play counts, earnings, audience location, and collaboration patterns — then give you 5 data-backed insights tailored specifically to you.
                    </Text>

                    {/* Usage counter for paid tiers */}
                    {effectiveTier !== 'free' && usageData && (
                      <View style={styles.usageCountRow}>
                        <Ionicons name="analytics" size={13} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.usageCountText}>
                          {usageData.analysesUsed} of {usageData.maxAnalyses} analyses used this month
                          {chatsRemaining !== null ? `  ·  ${usageData.chatsUsed} of ${usageData.maxChats} chats` : ''}
                        </Text>
                      </View>
                    )}

                    <View style={styles.idleFeatures}>
                      {[
                        { icon: 'trending-up', label: 'Performance vs peers', color: '#60a5fa' },
                        { icon: 'cash', label: 'Earnings opportunities', color: '#10b981' },
                        { icon: 'location', label: 'Best cities for your music', color: '#a855f7' },
                        { icon: 'people', label: 'Collaboration patterns', color: '#ec4899' },
                        { icon: 'time', label: 'Optimal release timing', color: '#fbbf24' },
                      ].map(f => (
                        <View key={f.label} style={styles.idleFeatureRow}>
                          <View style={[styles.idleFeatureIcon, { backgroundColor: `${f.color}18` }]}>
                            <Ionicons name={f.icon as any} size={14} color={f.color} />
                          </View>
                          <Text style={styles.idleFeatureText}>{f.label}</Text>
                        </View>
                      ))}
                    </View>

                    <TouchableOpacity style={styles.ctaBtn} onPress={startScan} activeOpacity={0.85}>
                      <LinearGradient colors={AI_GRADIENT} {...AI_GRADIENT_H} style={styles.ctaBtnGrad}>
                        <Ionicons name="sparkles" size={18} color="#fff" />
                        <Text style={styles.ctaBtnText}>Analyse My Career</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <Text style={styles.idleFootnote}>
                      Uses your real SoundBridge data · Updates with each analysis
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* ── SCANNING ── */}
          {phase === 'scanning' && (
            <View style={styles.scanContainer}>
              <View style={styles.scanCard}>
                <LinearGradient
                  colors={['rgba(168,85,247,0.14)', 'rgba(96,165,250,0.06)']}
                  {...AI_GRADIENT_D}
                  style={StyleSheet.absoluteFill}
                />

                <AiBadge size={56} radius={17} fontSize={20} />
                <Text style={styles.scanTitle}>Analysing your career…</Text>

                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  >
                    <LinearGradient colors={AI_GRADIENT} {...AI_GRADIENT_H} style={StyleSheet.absoluteFill} />
                  </Animated.View>
                </View>

                <View style={styles.scanLines}>
                  {SCAN_LINES.map((line, i) =>
                    i < visibleLines ? (
                      <View key={i} style={styles.scanLineRow}>
                        <Ionicons
                          name={i < visibleLines - 1 ? 'checkmark-circle' : 'ellipse'}
                          size={15}
                          color={i < visibleLines - 1 ? '#10b981' : '#a855f7'}
                        />
                        <Text style={[styles.scanLineText, { color: i < visibleLines - 1 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.9)', fontWeight: i < visibleLines - 1 ? '400' : '600' }]}>
                          {line}
                        </Text>
                      </View>
                    ) : null
                  )}
                </View>
              </View>
            </View>
          )}

          {/* ── RESULTS ── */}
          {phase === 'results' && (
            <>
              {analysisError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={32} color="#ef4444" />
                  <Text style={styles.errorTitle}>Analysis failed</Text>
                  <Text style={styles.errorBody}>{analysisError}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={() => { setPhase('idle'); setAnalysisError(null); }}>
                    <Text style={styles.retryBtnText}>Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionLabel}>YOUR INSIGHTS</Text>

                  {(dynamicCards.length > 0 ? dynamicCards : CARD_CONFIGS.map(cfg => ({
                    ...cfg, title: 'Loading...', stat: '—', statUnit: '', statLabel: '', detail: '',
                  }))).map((card, i) => (
                    <Animated.View
                      key={card.id}
                      style={[
                        styles.insightCardWrap,
                        {
                          opacity: cardAnims[i],
                          transform: [{ translateY: cardAnims[i].interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
                          shadowColor: card.shadowColor,
                        },
                      ]}
                    >
                      <View style={[styles.insightCard, { borderColor: card.borderColor }]}>
                        <LinearGradient
                          colors={[card.bg, 'transparent']}
                          {...AI_GRADIENT_D}
                          style={StyleSheet.absoluteFill}
                        />

                        <View style={styles.insightCardHeader}>
                          <View style={[styles.insightIconWrap, { backgroundColor: card.bg, borderColor: card.borderColor, borderWidth: 1 }]}>
                            <Ionicons name={card.icon as any} size={20} color={card.color} />
                          </View>
                          <View style={styles.insightCardHeaderText}>
                            <Text style={[styles.insightCardLabel, { color: card.color }]}>{card.label}</Text>
                            <Text style={styles.insightCardTitle} numberOfLines={2}>{card.title}</Text>
                          </View>
                          <View style={styles.insightStatWrap}>
                            <Text style={[styles.insightStat, { color: card.color }]}>{card.stat}</Text>
                            {card.statUnit ? <Text style={[styles.insightStatUnit, { color: card.color }]}>{card.statUnit}</Text> : null}
                            <Text style={styles.insightStatLabel}>{card.statLabel}</Text>
                          </View>
                        </View>

                        <View style={[styles.insightDivider, { backgroundColor: card.borderColor }]} />
                        <Text style={styles.insightDetail}>{card.detail}</Text>
                      </View>
                    </Animated.View>
                  ))}
                </>
              )}

              {/* ── ASK ME ANYTHING ── */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 36, marginBottom: 0 }}>
                <Text style={styles.sectionLabel}>ASK ME ANYTHING</Text>
                <View style={{ flexDirection: 'row', gap: 16, paddingRight: 4 }}>
                  <TouchableOpacity onPress={startNewChat} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="create-outline" size={20} color="rgba(255,255,255,0.45)" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={openHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="time-outline" size={20} color="rgba(255,255,255,0.45)" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Chat locked state for free tier */}
              {isChatLocked ? (
                <View style={[styles.chatContainer, { alignItems: 'center', paddingVertical: 24 }]}>
                  <Ionicons name="lock-closed" size={22} color="#a855f7" />
                  <Text style={[styles.insightCardTitle, { textAlign: 'center', marginTop: 10, marginBottom: 6 }]}>
                    {effectiveTier === 'free' ? 'Chat available on Premium+' : 'Chat limit reached'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => effectiveTier === 'free' ? (navigation as any).navigate('Upgrade') : handleBuyCredits()}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: '#a855f7', fontWeight: '600', fontSize: 13 }}>
                      {effectiveTier === 'free' ? 'Upgrade to Premium →' : 'Buy more credits →'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.chatContainer}>
                    <LinearGradient
                      colors={['rgba(168,85,247,0.08)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />

                    {chatMessages.length === 0 && (
                      <View style={styles.chatAiRow}>
                        <AiBadge size={30} radius={9} fontSize={10} />
                        <View style={styles.chatBubbleAi}>
                          <Text style={styles.chatBubbleText}>{chatIntro}</Text>
                        </View>
                      </View>
                    )}

                    {chatMessages.map(msg =>
                      msg.role === 'user' ? (
                        <View key={msg.id} style={styles.chatUserRow}>
                          <View style={styles.chatBubbleUser}>
                            <Text style={styles.chatBubbleText}>{msg.text}</Text>
                          </View>
                        </View>
                      ) : (
                        <View key={msg.id} style={styles.chatAiRow}>
                          <AiBadge size={30} radius={9} fontSize={10} />
                          <View style={styles.chatBubbleAi}>
                            <Text style={styles.chatBubbleText}>{msg.text}</Text>
                          </View>
                        </View>
                      )
                    )}

                    {isTyping && (
                      <View style={styles.chatAiRow}>
                        <AiBadge size={30} radius={9} fontSize={10} />
                        <View style={styles.chatBubbleAi}>
                          <TypingDots />
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Usage info for paid tiers */}
                  {effectiveTier !== 'free' && chatsRemaining !== null && (
                    <Text style={[styles.idleFootnote, { marginHorizontal: 16, marginTop: 8 }]}>
                      {chatsRemaining} chat{chatsRemaining !== 1 ? 's' : ''} remaining this month
                    </Text>
                  )}

                  {/* Prompt chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
                    {PROMPT_CHIPS.map(chip => (
                      <TouchableOpacity
                        key={chip}
                        style={styles.chip}
                        onPress={() => sendMessage(chip)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.chipText}>{chip}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Input */}
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ask your AI advisor…"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={chatInput}
                      onChangeText={setChatInput}
                      onSubmitEditing={() => sendMessage(chatInput)}
                      returnKeyType="send"
                      multiline={false}
                    />
                    <TouchableOpacity
                      style={[styles.sendBtn, { opacity: chatInput.trim() ? 1 : 0.35 }]}
                      onPress={() => sendMessage(chatInput)}
                      disabled={!chatInput.trim()}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={['#a855f7', '#60a5fa']} {...AI_GRADIENT_H} style={styles.sendBtnGrad}>
                        <Ionicons name="arrow-up" size={16} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <Text style={styles.footerNote}>
                Recommendations are based on your real SoundBridge data. All projections are estimates, not guarantees.
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* ── Chat history modal ── */}
      <Modal visible={showHistory} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.historyOverlay}>
          <View style={[styles.historySheet, { backgroundColor: '#0e1220' }]}>
            {/* Sheet header */}
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Conversations</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            {/* New chat button */}
            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() => { startNewChat(); setShowHistory(false); }}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#a855f7', '#60a5fa']} {...AI_GRADIENT_H} style={styles.newChatGrad}>
                <Ionicons name="create-outline" size={16} color="#fff" />
                <Text style={styles.newChatText}>New conversation</Text>
              </LinearGradient>
            </TouchableOpacity>

            {historyLoading ? (
              <Text style={[styles.footerNote, { textAlign: 'center', marginTop: 32 }]}>Loading…</Text>
            ) : allConversations.length === 0 ? (
              <Text style={[styles.footerNote, { textAlign: 'center', marginTop: 32 }]}>No past conversations yet.</Text>
            ) : (
              <FlatList
                data={allConversations}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 32 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.historyItem, item.id === conversationId && { borderColor: '#a855f740' }]}
                    onPress={() => loadConversationFromHistory(item.id)}
                    activeOpacity={0.75}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyItemPreview} numberOfLines={2}>{item.preview}</Text>
                      <Text style={styles.historyItemDate}>
                        {new Date(item.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteConversationFromHistory(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={17} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: 'transparent' },

  ambientGlow: {
    position: 'absolute',
    top: -80,
    left: width * 0.2,
    width: width * 0.6,
    height: 300,
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderRadius: 150,
    transform: [{ scaleX: 1.8 }],
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: { padding: 2 },
  backBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.3 },

  usagePill: {
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  usagePillText: { fontSize: 11, fontWeight: '700', color: '#c084fc', letterSpacing: 0.3 },

  scroll: { paddingBottom: 56 },

  greetingSection: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 4 },
  greetingBadgeRow: { flexDirection: 'row', marginBottom: 14 },
  greetingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(168,85,247,0.15)', borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },
  greetingBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#a855f7' },
  greetingBadgeText: { fontSize: 10, fontWeight: '700', color: '#a855f7', letterSpacing: 1 },
  greetName: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.6, marginBottom: 8 },
  greetSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 21, fontWeight: '400' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
    marginHorizontal: 20, marginTop: 28, marginBottom: 14,
  },

  // Idle
  idleContainer: { paddingHorizontal: 16, marginTop: 20 },
  idleCard: {
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)',
    padding: 28, alignItems: 'center', overflow: 'hidden',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35, shadowRadius: 32, elevation: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  idleCardTopGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  idleTitle: {
    fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'center',
    letterSpacing: -0.5, lineHeight: 32, marginTop: 18, marginBottom: 12,
  },
  idleBody: { fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  usageCountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7, marginBottom: 20, alignSelf: 'stretch',
  },
  usageCountText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', flex: 1 },
  idleFeatures: { width: '100%', gap: 12, marginBottom: 28 },
  idleFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  idleFeatureIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  idleFeatureText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  ctaBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  ctaBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 17,
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  idleFootnote: { fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 16 },

  // Locked state
  lockedContainer: { paddingHorizontal: 16, marginTop: 20 },
  lockedCard: {
    borderRadius: 24, borderWidth: 1, padding: 28, alignItems: 'center',
    overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.02)',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25, shadowRadius: 24, elevation: 12,
  },
  lockedTitle: {
    fontSize: 20, fontWeight: '700', color: '#FFFFFF',
    letterSpacing: -0.4, marginTop: 14, marginBottom: 10, textAlign: 'center',
  },
  lockedBody: {
    fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 22,
    textAlign: 'center', marginBottom: 24,
  },

  // Error state
  errorContainer: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 12, marginBottom: 8 },
  errorBody: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  retryBtn: {
    paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.5)',
    backgroundColor: 'rgba(168,85,247,0.12)',
  },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#c084fc' },

  // Scan
  scanContainer: { paddingHorizontal: 16, marginTop: 20 },
  scanCard: {
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(168,85,247,0.22)',
    padding: 28, alignItems: 'center', overflow: 'hidden',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  scanTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.4, marginTop: 16, marginBottom: 20 },
  progressTrack: {
    width: '100%', height: 5, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 24,
  },
  progressFill: { height: 5, borderRadius: 3, overflow: 'hidden' },
  scanLines: { width: '100%', gap: 12 },
  scanLineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scanLineText: { fontSize: 13, lineHeight: 19, flex: 1 },

  // Insight cards
  insightCardWrap: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 20,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 10,
  },
  insightCard: {
    borderRadius: 20, borderWidth: 1, padding: 18,
    overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.02)',
  },
  insightCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  insightIconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  insightCardHeaderText: { flex: 1, paddingTop: 2 },
  insightCardLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' },
  insightCardTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.9)', lineHeight: 19 },
  insightStatWrap: { alignItems: 'flex-end', flexShrink: 0, paddingTop: 2 },
  insightStat: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  insightStatUnit: { fontSize: 11, fontWeight: '600', marginTop: -2 },
  insightStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  insightDivider: { height: StyleSheet.hairlineWidth, marginBottom: 12 },
  insightDetail: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 19 },

  // Chat
  chatContainer: {
    marginHorizontal: 16, borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)', padding: 16, gap: 14,
    overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.02)',
  },
  chatAiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  chatUserRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  chatBubbleAi: {
    flex: 1, backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.22)',
    borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10,
  },
  chatBubbleUser: {
    backgroundColor: 'rgba(168,85,247,0.2)', borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.38)', borderRadius: 14,
    paddingHorizontal: 13, paddingVertical: 10, maxWidth: '82%',
  },
  chatBubbleText: { fontSize: 13, color: 'rgba(255,255,255,0.88)', lineHeight: 19 },

  chipsScroll: { marginTop: 12 },
  chipsContent: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)',
    backgroundColor: 'rgba(168,85,247,0.1)',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#c084fc' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 14, paddingVertical: 8, gap: 8,
  },
  textInput: { flex: 1, fontSize: 14, color: '#FFFFFF', paddingVertical: 6 },
  sendBtn: { flexShrink: 0 },
  sendBtnGrad: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  footerNote: {
    fontSize: 11, color: 'rgba(255,255,255,0.28)', lineHeight: 16,
    textAlign: 'center', paddingHorizontal: 28, marginTop: 22,
  },

  // ── History modal ──────────────────────────────────────────────────────────
  historyOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  historySheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingHorizontal: 16, maxHeight: '80%',
  },
  historyHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  historyTitle: {
    fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: -0.3,
  },
  newChatBtn: {
    borderRadius: 12, overflow: 'hidden', marginBottom: 16,
  },
  newChatGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 16,
  },
  newChatText: {
    color: '#fff', fontSize: 14, fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 8,
  },
  historyItemPreview: {
    fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18, marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 11, color: 'rgba(255,255,255,0.35)',
  },

  // ── Proactive Alerts ─────────────────────────────────────────────────────
  alertBellBtn: { position: 'relative', padding: 4 },
  alertBellDotWrap: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  alertBellPulse: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#a855f7' },
  alertBellDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#a855f7', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)' },

  alertsSection: { marginHorizontal: 16, marginTop: 16, marginBottom: 4 },
  alertsBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(168,85,247,0.12)', borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  alertsBannerDotWrap: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  alertsBannerPulse: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#a855f7' },
  alertsBannerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#a855f7', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)' },
  alertsBannerText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  alertsEmpty: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingVertical: 12 },

  alertCard: {
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  alertCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  alertIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  alertCardType: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  alertCardText: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 19, marginBottom: 4 },
  alertConnectBtn: {
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start',
  },
  alertConnectText: { fontSize: 13, fontWeight: '600' },

  // ── Proactive welcome ───────────────────────────────────────────────────
  welcomeCard: {
    marginHorizontal: 16, marginTop: 20, borderRadius: 18, borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.28)', padding: 18, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  welcomeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  welcomeCardLabel: { fontSize: 11, fontWeight: '700', color: '#c084fc', textTransform: 'uppercase', letterSpacing: 0.8 },
  welcomeCardText: { fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 22 },
});
