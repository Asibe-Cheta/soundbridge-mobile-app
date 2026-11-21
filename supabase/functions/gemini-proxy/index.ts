// Single server-side entry point for every Gemini call the app makes
// (AI Career Advisor analysis + chat, Bridge collaborator explanations).
// The Gemini key never reaches the client from here on — it lives only in
// this function's GEMINI_API_KEY secret (already set for
// ai-career-proactive-filter; reused here, not a new secret).
//
// The model name is pinned in exactly one place (GEMINI_MODEL below) so a
// future model swap — including Google's own auto-reroute of
// gemini-2.5-flash on Dec 1 2026 — is a one-line change here, not a hunt
// through every caller.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;

// One place to change the model. Verify against
// ai.google.dev/gemini-api/docs/deprecations before Dec 1 2026 — Google
// auto-reroutes gemini-2.5-flash to gemini-3.5-flash-lite on that date and
// bills at that model's rate, which is a silent behavior + cost change if
// left unexamined.
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_FEATURES = [
  'career_advisor_analysis',
  'career_advisor_chat',
  'bridge_collab_explanation',
] as const;
type Feature = (typeof ALLOWED_FEATURES)[number];

// Sensible defaults, not tied to the existing per-feature billing-period
// limits in ai_adviser_usage (analyses_used/maxAnalyses etc.) — this is a
// separate, simpler daily safety net against runaway cost/abuse across ALL
// Gemini usage combined, enforced server-side so it can't be bypassed by
// reinstalling the app or clearing local storage (unlike the AsyncStorage
// cap BridgeCollabService had before this).
const DAILY_CAP: Record<'free' | 'premium' | 'unlimited', number> = {
  free: 5,
  premium: 30,
  unlimited: 100,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function geminiPost(body: object, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status !== 503) return res;
    lastError = new Error('Gemini error 503: service temporarily unavailable');
    await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
  }
  throw lastError ?? new Error('Gemini unavailable after retries');
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: 'unauthorized', message: 'Please log in and try again.' }, 401);
    }

    const body = await req.json().catch(() => null);
    const feature: Feature | undefined = body?.feature;
    if (!feature || !ALLOWED_FEATURES.includes(feature)) {
      return jsonResponse({ error: 'invalid_feature', message: 'Unknown or missing feature.' }, 400);
    }
    if (!body?.contents) {
      return jsonResponse({ error: 'invalid_request', message: 'Missing contents.' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const tier = (profile?.subscription_tier as 'free' | 'premium' | 'unlimited') ?? 'free';
    const cap = DAILY_CAP[tier] ?? DAILY_CAP.free;

    const startOfDayUtc = new Date();
    startOfDayUtc.setUTCHours(0, 0, 0, 0);

    const { count: usedToday } = await admin
      .from('ai_usage_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfDayUtc.toISOString());

    if ((usedToday ?? 0) >= cap) {
      return jsonResponse(
        {
          error: 'daily_limit_reached',
          message: `You've reached today's AI usage limit (${cap} requests). It resets at midnight UTC.`,
        },
        429
      );
    }

    const geminiBody: Record<string, unknown> = { contents: body.contents };
    if (body.systemInstruction) geminiBody.systemInstruction = body.systemInstruction;
    if (body.generationConfig) geminiBody.generationConfig = body.generationConfig;

    const res = await geminiPost(geminiBody);
    if (!res.ok) {
      const errText = await res.text();
      return jsonResponse(
        { error: 'gemini_error', message: `Gemini error ${res.status}: ${errText.slice(0, 200)}` },
        502
      );
    }

    const json = await res.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const usage = json?.usageMetadata ?? {};

    const { error: logError } = await admin.from('ai_usage_log').insert({
      user_id: user.id,
      feature,
      model: GEMINI_MODEL,
      input_tokens: usage.promptTokenCount ?? null,
      output_tokens: usage.candidatesTokenCount ?? null,
    });
    if (logError) {
      // Never block the response on a logging failure.
      console.warn('[gemini-proxy] failed to write ai_usage_log:', logError.message);
    }

    return jsonResponse({ text });
  } catch (err) {
    console.error('[gemini-proxy] unhandled error:', err);
    return jsonResponse({ error: 'internal_error', message: 'Something went wrong. Please try again.' }, 500);
  }
});
