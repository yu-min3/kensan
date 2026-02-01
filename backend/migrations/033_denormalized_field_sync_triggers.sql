-- 033_denormalized_field_sync_triggers.sql
-- 非正規化フィールドの自動同期トリガー
-- goals/milestones/tasks の name/color 変更時に、関連テーブルの非正規化フィールドを自動更新する

-- ============================================================================
-- Goal: name, color → time_blocks, time_entries, running_timers, notes
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_goal_denormalized_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- name が変更された場合
    IF OLD.name IS DISTINCT FROM NEW.name THEN
        UPDATE time_blocks SET goal_name = NEW.name WHERE goal_id = NEW.id;
        UPDATE time_entries SET goal_name = NEW.name WHERE goal_id = NEW.id;
        UPDATE running_timers SET goal_name = NEW.name WHERE goal_id = NEW.id;
        UPDATE notes SET goal_name = NEW.name WHERE goal_id = NEW.id;
    END IF;

    -- color が変更された場合
    IF OLD.color IS DISTINCT FROM NEW.color THEN
        UPDATE time_blocks SET goal_color = NEW.color WHERE goal_id = NEW.id;
        UPDATE time_entries SET goal_color = NEW.color WHERE goal_id = NEW.id;
        UPDATE running_timers SET goal_color = NEW.color WHERE goal_id = NEW.id;
        UPDATE notes SET goal_color = NEW.color WHERE goal_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_goal_denormalized_fields
    AFTER UPDATE OF name, color ON goals
    FOR EACH ROW
    EXECUTE FUNCTION sync_goal_denormalized_fields();

-- ============================================================================
-- Milestone: name → time_blocks, time_entries, running_timers, notes
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_milestone_denormalized_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.name IS DISTINCT FROM NEW.name THEN
        UPDATE time_blocks SET milestone_name = NEW.name WHERE milestone_id = NEW.id;
        UPDATE time_entries SET milestone_name = NEW.name WHERE milestone_id = NEW.id;
        UPDATE running_timers SET milestone_name = NEW.name WHERE milestone_id = NEW.id;
        UPDATE notes SET milestone_name = NEW.name WHERE milestone_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_milestone_denormalized_fields
    AFTER UPDATE OF name ON milestones
    FOR EACH ROW
    EXECUTE FUNCTION sync_milestone_denormalized_fields();

-- ============================================================================
-- Task: name → time_blocks, time_entries, running_timers
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_task_denormalized_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.name IS DISTINCT FROM NEW.name THEN
        UPDATE time_blocks SET task_name = NEW.name WHERE task_id = NEW.id;
        UPDATE time_entries SET task_name = NEW.name WHERE task_id = NEW.id;
        UPDATE running_timers SET task_name = NEW.name WHERE task_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_task_denormalized_fields
    AFTER UPDATE OF name ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION sync_task_denormalized_fields();
