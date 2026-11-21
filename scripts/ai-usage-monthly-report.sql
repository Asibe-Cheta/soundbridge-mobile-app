-- Read-only. Monthly Gemini usage and estimated cost by feature, from
-- ai_usage_log (populated only by the gemini-proxy edge function going
-- forward — no historical data exists before that function is deployed
-- and the client switches over to it).
--
-- Pricing below ($0.30 / 1M input tokens, $2.50 / 1M output tokens) is for
-- gemini-2.5-flash, per third-party aggregators citing Google's pricing
-- page as of 2026-11-21 — I could not load ai.google.dev/gemini-api/docs/pricing
-- directly to confirm it first-hand. Verify there before trusting the
-- dollar figures, and update the two constants below if the model or its
-- price changes (also update GEMINI_MODEL in supabase/functions/gemini-proxy/
-- index.ts if you change the model itself).

SELECT
  feature,
  model,
  date_trunc('month', created_at) AS month,
  count(*) AS requests,
  sum(input_tokens)  AS total_input_tokens,
  sum(output_tokens) AS total_output_tokens,
  round(avg(input_tokens))  AS avg_input_tokens_per_request,
  round(avg(output_tokens)) AS avg_output_tokens_per_request,
  round(
    (sum(input_tokens)  / 1000000.0) * 0.30 +
    (sum(output_tokens) / 1000000.0) * 2.50,
    4
  ) AS estimated_cost_usd
FROM ai_usage_log
GROUP BY feature, model, date_trunc('month', created_at)
ORDER BY month DESC, feature;
