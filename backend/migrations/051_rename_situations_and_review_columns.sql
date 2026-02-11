-- 051: Rename situations (weekly→review, planning→daily_advice)
--      and ai_review_reports columns (week_start/end→period_start/end)

BEGIN;

-- (a) Update ai_contexts situation values
UPDATE ai_contexts SET situation = 'review' WHERE situation = 'weekly';
UPDATE ai_contexts SET situation = 'daily_advice' WHERE situation = 'planning';

-- (b) Rename ai_review_reports columns
ALTER TABLE ai_review_reports RENAME COLUMN week_start TO period_start;
ALTER TABLE ai_review_reports RENAME COLUMN week_end TO period_end;

-- (c) Recreate index with new column names
DROP INDEX IF EXISTS idx_ai_review_reports_week;
CREATE INDEX idx_ai_review_reports_period ON ai_review_reports(period_start, period_end);

-- (d) Recreate unique index for ai_contexts default per situation
-- (existing index auto-updates with data changes, no DDL needed)

COMMIT;
