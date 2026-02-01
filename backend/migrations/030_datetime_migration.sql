-- Migration: Convert time_blocks and time_entries from (date, start_time, end_time) to (start_datetime, end_datetime)

-- 1. Add new columns
ALTER TABLE time_blocks ADD COLUMN start_datetime TIMESTAMPTZ;
ALTER TABLE time_blocks ADD COLUMN end_datetime TIMESTAMPTZ;
ALTER TABLE time_entries ADD COLUMN start_datetime TIMESTAMPTZ;
ALTER TABLE time_entries ADD COLUMN end_datetime TIMESTAMPTZ;

-- 2. Migrate data (handle cross-midnight entries)
UPDATE time_blocks SET
  start_datetime = (date + start_time) AT TIME ZONE 'UTC',
  end_datetime = CASE
    WHEN end_time < start_time
    THEN ((date + INTERVAL '1 day') + end_time) AT TIME ZONE 'UTC'
    ELSE (date + end_time) AT TIME ZONE 'UTC'
  END;

UPDATE time_entries SET
  start_datetime = (date + start_time) AT TIME ZONE 'UTC',
  end_datetime = CASE
    WHEN end_time < start_time
    THEN ((date + INTERVAL '1 day') + end_time) AT TIME ZONE 'UTC'
    ELSE (date + end_time) AT TIME ZONE 'UTC'
  END;

-- 3. Add NOT NULL constraints
ALTER TABLE time_blocks ALTER COLUMN start_datetime SET NOT NULL;
ALTER TABLE time_blocks ALTER COLUMN end_datetime SET NOT NULL;
ALTER TABLE time_entries ALTER COLUMN start_datetime SET NOT NULL;
ALTER TABLE time_entries ALTER COLUMN end_datetime SET NOT NULL;

-- 4. Drop old columns
ALTER TABLE time_blocks DROP COLUMN date, DROP COLUMN start_time, DROP COLUMN end_time;
ALTER TABLE time_entries DROP COLUMN date, DROP COLUMN start_time, DROP COLUMN end_time;

-- 5. Drop old indexes and create new ones
DROP INDEX IF EXISTS idx_time_blocks_date;
DROP INDEX IF EXISTS idx_time_blocks_user_date;
DROP INDEX IF EXISTS idx_time_entries_date;
DROP INDEX IF EXISTS idx_time_entries_user_date;

CREATE INDEX idx_time_blocks_user_start ON time_blocks(user_id, start_datetime);
CREATE INDEX idx_time_entries_user_start ON time_entries(user_id, start_datetime);
