/**
 * ai-career-proactive-filter
 *
 * Run once daily (cron or manual trigger).
 * Step 1 — cheap DB-only filter: check 4 signals for every active premium/unlimited creator.
 * Step 2 — expensive generation: only when a genuine signal fires, call Gemini Flash.
 * Step 3 — push one notification per creator per day (highest priority signal).
 *
 * Deploy: supabase functions deploy ai-career-proactive-filter
 * Cron:   schedule via pg_cron or Supabase dashboard — "0 9 * * *" (09:00 UTC daily)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY    = Deno.env.get('GEMINI_API_KEY')!

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

// Signal priority (higher index = higher priority for the single daily notification)
const SIGNAL_PRIORITY = ['service_match', 'curated_opportunity', 'live_interest', 'quality_threshold']

interface SignalCandidate {
  creatorId: string
  signalType: string
  signalData: Record<string, unknown>
}

// ── Gemini helper ──────────────────────────────────────────────────────────────

// Maps onboarding_user_type to a plain-English description for Gemini context
function describeCreatorType(userType: string | null): string {
  const map: Record<string, string> = {
    musician:       'a musician/instrumentalist',
    vocalist:       'a vocalist/singer',
    singer:         'a vocalist/singer',
    podcaster:      'a podcaster',
    audio_engineer: 'an audio engineer',
    engineer:       'an audio engineer',
    producer:       'a music producer/beatmaker',
    beatmaker:      'a music producer/beatmaker',
    dj:             'a DJ',
    band:           'a band or music group',
    composer:       'a composer/arranger',
    songwriter:     'a songwriter',
  }
  if (!userType) return 'an independent audio creator'
  const key = userType.toLowerCase().replace(/[\s-]/g, '_')
  return map[key] ?? `an independent creator (${userType})`
}

// Returns a plain-English label for each opportunity type, relevant to the creator's role
function opportunityLabel(opportunityType: string, creatorType: string | null): string {
  const labels: Record<string, Record<string, string>> = {
    open_mic:          { podcaster: 'live speaking or storytelling event', audio_engineer: 'live audio event', default: 'open mic night' },
    venue:             { podcaster: 'recording or event venue', audio_engineer: 'studio or venue hire', default: 'venue opportunity' },
    policy_change:     { default: 'industry policy or regulation change' },
    brand_partnership: { default: 'brand partnership opportunity' },
    industry_news:     { podcaster: 'podcasting industry development', audio_engineer: 'audio industry development', default: 'music industry development' },
  }
  const typeKey = opportunityType ?? 'default'
  const creatorKey = (creatorType ?? '').toLowerCase().replace(/[\s-]/g, '_')
  const variants = labels[typeKey] ?? {}
  return variants[creatorKey] ?? variants['default'] ?? opportunityType
}

async function generateInsight(
  signalType: string,
  signalData: Record<string, unknown>,
  creatorType: string | null
): Promise<string> {
  const creatorDesc = describeCreatorType(creatorType)

  const systemPrompt = `You are a career adviser inside SoundBridge, an audio creator platform.
You are advising ${creatorDesc}. Tailor every sentence to what actually matters for that role.
Write one short, specific, warm insight (2–3 sentences max) about the signal below.
Speak directly using "you" and "your" — never say "the creator".
Be specific to the data. End with one immediately actionable next step relevant to their role.
You may discuss general budgeting and financial planning in broad terms only.
Never recommend specific loans, credit products, or lending decisions.
If finances come up, ask general budget questions; suggest they speak to their own bank for anything further.`

  const oppLabel = signalType === 'curated_opportunity'
    ? opportunityLabel(signalData.opportunity_type as string, creatorType)
    : ''

  const signalDescriptions: Record<string, string> = {
    quality_threshold: `The track "${signalData.track_title || 'a track'}" just crossed a quality score threshold (${signalData.previous_score || 'below 60'} → ${signalData.new_score || 'above 60'}), signalling growing engagement on SoundBridge.`,
    live_interest: `${signalData.interest_count || 'Several'} listeners have expressed live interest — enough to justify exploring a live or in-person event in ${signalData.location || 'their area'}.`,
    curated_opportunity: `There is a new ${oppLabel} that matches this creator's profile and location: "${signalData.title}". ${signalData.description || ''}`,
    service_match: `A service provider on SoundBridge may be a good fit: ${signalData.provider_name} (${(signalData.categories as string[] | undefined)?.join(', ') || 'audio services'}). ${signalData.headline || ''}`,
  }

  const userContent = signalDescriptions[signalType] || JSON.stringify(signalData)

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
    }),
  })

  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const json = await res.json()
  return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
}

// ── Signal checks ──────────────────────────────────────────────────────────────

async function checkQualityThreshold(
  supabase: ReturnType<typeof createClient>,
  creatorId: string
): Promise<SignalCandidate[]> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Tracks whose quality_score crossed from below 60 to 60+ in the last 24h
  const { data } = await supabase
    .from('track_quality_signals')
    .select('track_id, quality_score, updated_at')
    .eq('creator_id', creatorId)
    .gte('quality_score', 60)
    .gte('updated_at', yesterday)

  if (!data?.length) return []

  const candidates: SignalCandidate[] = []
  for (const row of data) {
    // Check we haven't already surfaced a quality_threshold signal for this track today
    const { count } = await supabase
      .from('ai_proactive_signals')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .eq('signal_type', 'quality_threshold')
      .contains('signal_data', { track_id: row.track_id })
      .gte('created_at', yesterday)

    if (!count) {
      const { data: track } = await supabase
        .from('audio_tracks')
        .select('title')
        .eq('id', row.track_id)
        .single()

      candidates.push({
        creatorId,
        signalType: 'quality_threshold',
        signalData: {
          track_id: row.track_id,
          track_title: track?.title ?? 'a track',
          new_score: row.quality_score,
          previous_score: Math.round(row.quality_score - 5), // approximate
        },
      })
    }
  }
  return candidates
}

async function checkLiveInterest(
  supabase: ReturnType<typeof createClient>,
  creatorId: string,
  location: string | null
): Promise<SignalCandidate[]> {
  // Use listener_genre_affinity / track_quality_signals live_interest_yes_count
  const { data } = await supabase
    .from('track_quality_signals')
    .select('track_id, live_interest_yes_count, live_interest_rate')
    .eq('creator_id', creatorId)
    .gte('live_interest_yes_count', 10) // meaningful threshold

  if (!data?.length) return []

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: alreadySurfaced } = await supabase
    .from('ai_proactive_signals')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId)
    .eq('signal_type', 'live_interest')
    .gte('created_at', yesterday)

  if (alreadySurfaced) return []

  const topTrack = data.sort((a, b) => b.live_interest_yes_count - a.live_interest_yes_count)[0]
  return [{
    creatorId,
    signalType: 'live_interest',
    signalData: {
      interest_count: topTrack.live_interest_yes_count,
      interest_rate: topTrack.live_interest_rate,
      location: location ?? 'your area',
    },
  }]
}

async function checkCuratedOpportunities(
  supabase: ReturnType<typeof createClient>,
  creatorId: string,
  genres: string[],
  location: string | null
): Promise<SignalCandidate[]> {
  const today = new Date().toISOString().split('T')[0]

  // Opportunities not yet expired, matching genre/location, not yet surfaced to this creator
  const { data: opps } = await supabase
    .from('curated_opportunities')
    .select('*')
    .or(`expires_at.is.null,expires_at.gte.${today}`)
    .not('id', 'in',
      `(select opportunity_id from curated_opportunity_surfaces where creator_id = '${creatorId}')`
    )

  if (!opps?.length) return []

  const matched = opps.filter(opp => {
    const genreMatch = !opp.genre_tags?.length ||
      genres.some(g => opp.genre_tags.some((t: string) => t.toLowerCase() === g.toLowerCase()))
    const locationMatch = !opp.location_city || !location ||
      location.toLowerCase().includes(opp.location_city.toLowerCase())
    return genreMatch && locationMatch
  })

  if (!matched.length) return []

  // Mark all matched as surfaced
  await supabase.from('curated_opportunity_surfaces').insert(
    matched.map(o => ({ opportunity_id: o.id, creator_id: creatorId }))
  )

  return matched.slice(0, 2).map(opp => ({
    creatorId,
    signalType: 'curated_opportunity',
    signalData: {
      opportunity_id: opp.id,
      title: opp.title,
      description: opp.description,
      opportunity_type: opp.opportunity_type,
      source_url: opp.source_url ?? null,
    },
  }))
}

async function checkServiceMatches(
  supabase: ReturnType<typeof createClient>,
  creatorId: string,
  genres: string[],
  location: string | null
): Promise<SignalCandidate[]> {
  // Only surface if creator has expressed collaborator need (service_provider_profiles doesn't exist for them)
  const { data: selfSp } = await supabase
    .from('service_provider_profiles')
    .select('id')
    .eq('user_id', creatorId)
    .maybeSingle()

  // Skip if creator IS a service provider (they're looking for work, not collaborators)
  if (selfSp) return []

  // Check we haven't sent a service_match signal in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: recentSignal } = await supabase
    .from('ai_proactive_signals')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId)
    .eq('signal_type', 'service_match')
    .gte('created_at', sevenDaysAgo)

  if (recentSignal) return []

  // Find service providers matching genre/location added in the last 7 days
  const { data: providers } = await supabase
    .from('service_provider_profiles')
    .select('user_id, display_name, categories, headline, average_rating')
    .gte('created_at', sevenDaysAgo)
    .limit(5)

  if (!providers?.length) return []

  const matched = providers.filter(p =>
    genres.some(g => (p.categories ?? []).some((c: string) => c.toLowerCase().includes(g.toLowerCase())))
  )

  if (!matched.length) return []

  const best = matched[0]
  return [{
    creatorId,
    signalType: 'service_match',
    signalData: {
      provider_user_id: best.user_id,
      provider_name: best.display_name,
      categories: best.categories ?? [],
      headline: best.headline ?? '',
      rating: best.average_rating ?? null,
    },
  }]
}

// ── Push notification helper ───────────────────────────────────────────────────

async function sendPushNotification(token: string, title: string, body: string) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body, sound: 'default' }),
  })
}

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Fetch all premium/unlimited creators with their profile data
  const { data: creators, error } = await supabase
    .from('profiles')
    .select('id, genres, location, expo_push_token, onboarding_user_type')
    .in('subscription_tier', ['premium', 'unlimited'])
    .eq('role', 'creator')

  if (error) {
    console.error('Failed to fetch creators:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const stats = { creatorsChecked: 0, signalsFired: 0, notificationsSent: 0, errors: 0 }
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayStr = todayStart.toISOString()

  for (const creator of (creators ?? [])) {
    stats.creatorsChecked++
    try {
      // Run all 4 signal checks in parallel
      const [qualitySignals, liveSignals, oppSignals, serviceSignals] = await Promise.all([
        checkQualityThreshold(supabase, creator.id),
        checkLiveInterest(supabase, creator.id, creator.location),
        checkCuratedOpportunities(supabase, creator.id, creator.genres ?? [], creator.location),
        checkServiceMatches(supabase, creator.id, creator.genres ?? [], creator.location),
      ])

      const allSignals = [...qualitySignals, ...liveSignals, ...oppSignals, ...serviceSignals]
      if (!allSignals.length) continue

      stats.signalsFired += allSignals.length

      // Generate insights for each signal — pass creator type so wording is tailored
      const signalRecords = await Promise.all(
        allSignals.map(async (s) => {
          let insight = ''
          try {
            insight = await generateInsight(s.signalType, s.signalData, creator.onboarding_user_type ?? null)
          } catch (err) {
            console.error(`Gemini failed for ${s.signalType}:`, err)
          }
          return {
            creator_id: s.creatorId,
            signal_type: s.signalType,
            signal_data: s.signalData,
            generated_insight: insight || null,
          }
        })
      )

      // Insert all signal records
      await supabase.from('ai_proactive_signals').insert(signalRecords)

      // One push notification per creator per day — highest priority signal only
      if (creator.expo_push_token) {
        const { count: alreadyNotified } = await supabase
          .from('ai_proactive_signals')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', creator.id)
          .not('notified_at', 'is', null)
          .gte('notified_at', todayStr)

        if (!alreadyNotified) {
          const topSignal = signalRecords
            .slice()
            .sort((a, b) =>
              SIGNAL_PRIORITY.indexOf(b.signal_type) - SIGNAL_PRIORITY.indexOf(a.signal_type)
            )[0]

          const notifBody = topSignal.generated_insight?.slice(0, 120) ??
            'You have a new career insight in your AI Career Adviser.'

          await sendPushNotification(
            creator.expo_push_token,
            'Career Insight',
            notifBody
          )

          // Mark the top signal as notified
          await supabase
            .from('ai_proactive_signals')
            .update({ notified_at: new Date().toISOString() })
            .eq('creator_id', creator.id)
            .eq('signal_type', topSignal.signal_type)
            .is('notified_at', null)
            .order('created_at', { ascending: false })
            .limit(1)

          stats.notificationsSent++
        }
      }
    } catch (err) {
      console.error(`Error processing creator ${creator.id}:`, err)
      stats.errors++
    }
  }

  return new Response(JSON.stringify({ ok: true, ...stats }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
