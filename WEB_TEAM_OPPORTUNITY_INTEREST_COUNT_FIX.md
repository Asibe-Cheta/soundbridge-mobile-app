# Web Team: `interest_count` Not Updating on My Opportunities

## Symptom
Another user expressed interest in an opportunity (POST succeeded, "Interest Sent" shown in feed).
But `GET /api/opportunities/mine` still returns `interest_count: 0` for that opportunity.

## Root Cause (likely)
The `interest_count` column on `opportunity_posts` is a denormalized counter that is **not being incremented** when a row is inserted into `opportunity_interests`.

## Fix Required

**Option A — Trigger / function increment (recommended)**
Add a trigger on `opportunity_interests` INSERT to increment the counter:

```sql
CREATE OR REPLACE FUNCTION increment_opportunity_interest_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE opportunity_posts
  SET interest_count = interest_count + 1
  WHERE id = NEW.opportunity_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_interest_count
AFTER INSERT ON opportunity_interests
FOR EACH ROW EXECUTE FUNCTION increment_opportunity_interest_count();

-- Also decrement on DELETE (if interests can be withdrawn)
CREATE OR REPLACE FUNCTION decrement_opportunity_interest_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE opportunity_posts
  SET interest_count = GREATEST(interest_count - 1, 0)
  WHERE id = OLD.opportunity_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_decrement_interest_count
AFTER DELETE ON opportunity_interests
FOR EACH ROW EXECUTE FUNCTION decrement_opportunity_interest_count();
```

**Option B — Count live in the `/mine` endpoint**
Instead of returning the stale `interest_count` column, count directly:

```sql
SELECT
  op.*,
  COUNT(oi.id) AS interest_count
FROM opportunity_posts op
LEFT JOIN opportunity_interests oi ON oi.opportunity_id = op.id
WHERE op.user_id = $1
GROUP BY op.id;
```

**Option C — Also fix `get_recommended_opportunities` RPC**
The feed RPC likely has the same issue — `interest_count` shown to other users may also be stale.

## Impact
- `MyOpportunitiesScreen`: always shows 0 interests even when people have applied
- Poster cannot see "View Interests" button (it only appears when `interest_count > 0`)
- Poster is blind to incoming applications

## Priority
**High** — this breaks the core poster workflow. The poster literally cannot see who applied.
