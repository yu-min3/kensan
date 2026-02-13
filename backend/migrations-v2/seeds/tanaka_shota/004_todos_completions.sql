-- ============================================================================
-- Demo Seed: Todo Completions (~120件)
-- ============================================================================
-- 技術ニュース: 90%, 英語: 65% (Week5-8低下), AWS問題集: 75% (Week5-6激減), ジム: 60%

DO $$
DECLARE
    base_date DATE := CURRENT_DATE - 56;
    d DATE;
    day_offset INT;
    dow INT;
    week_num INT;
    seq INT := 0;
    uid UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd';

    -- Todo IDs
    todo_news UUID := 'dd0b0001-0000-0000-0000-000000000000';
    todo_eng UUID := 'dd0b0002-0000-0000-0000-000000000000';
    todo_aws UUID := 'dd0b0003-0000-0000-0000-000000000000';
    todo_gym UUID := 'dd0b0004-0000-0000-0000-000000000000';

BEGIN
    FOR day_offset IN 0..55 LOOP
        d := base_date + day_offset;
        dow := EXTRACT(DOW FROM d)::INT;
        week_num := day_offset / 7 + 1;

        -- ============================================================
        -- 技術ニュース読む (daily, 90% completion)
        -- ============================================================
        IF day_offset % 11 <> 0 THEN  -- skip ~9%
            seq := seq + 1;
            INSERT INTO todo_completions (id, user_id, todo_id, completed_date, completed_at)
            VALUES (uuid_generate_v4(), uid, todo_news, d, d + TIME '03:30' + INTERVAL '9 hours');
        END IF;

        -- ============================================================
        -- 英語リーディング (daily, 65% overall — drops in later weeks)
        -- ============================================================
        IF week_num <= 4 THEN
            -- Week 1-4: ~80% completion
            IF day_offset % 5 <> 0 THEN
                seq := seq + 1;
                INSERT INTO todo_completions (id, user_id, todo_id, completed_date, completed_at)
                VALUES (uuid_generate_v4(), uid, todo_eng, d, d + TIME '03:45' + INTERVAL '9 hours');
            END IF;
        ELSE
            -- Week 5-8: ~50% completion (busy with personal dev)
            IF day_offset % 2 = 0 THEN
                seq := seq + 1;
                INSERT INTO todo_completions (id, user_id, todo_id, completed_date, completed_at)
                VALUES (uuid_generate_v4(), uid, todo_eng, d, d + TIME '03:45' + INTERVAL '9 hours');
            END IF;
        END IF;

        -- ============================================================
        -- AWS問題集 (daily, 75% overall — Week5-6 drops to ~30%)
        -- ============================================================
        IF week_num <= 4 THEN
            -- Week 1-4: ~85%
            IF day_offset % 7 <> 0 THEN
                seq := seq + 1;
                INSERT INTO todo_completions (id, user_id, todo_id, completed_date, completed_at)
                VALUES (uuid_generate_v4(), uid, todo_aws, d, d + TIME '14:00' + INTERVAL '9 hours');
            END IF;
        ELSIF week_num <= 6 THEN
            -- Week 5-6: ~30% (AWS後回し)
            IF day_offset % 3 = 0 THEN
                seq := seq + 1;
                INSERT INTO todo_completions (id, user_id, todo_id, completed_date, completed_at)
                VALUES (uuid_generate_v4(), uid, todo_aws, d, d + TIME '14:00' + INTERVAL '9 hours');
            END IF;
        ELSE
            -- Week 7-8: ~70% (立て直し)
            IF day_offset % 3 <> 0 THEN
                seq := seq + 1;
                INSERT INTO todo_completions (id, user_id, todo_id, completed_date, completed_at)
                VALUES (uuid_generate_v4(), uid, todo_aws, d, d + TIME '14:00' + INTERVAL '9 hours');
            END IF;
        END IF;

        -- ============================================================
        -- ジム (custom: 火木, 60% overall)
        -- ============================================================
        IF dow IN (2, 4) THEN
            IF week_num <= 4 THEN
                -- Week 1-4: ~70%
                IF day_offset % 3 <> 0 THEN
                    seq := seq + 1;
                    INSERT INTO todo_completions (id, user_id, todo_id, completed_date, completed_at)
                    VALUES (uuid_generate_v4(), uid, todo_gym, d, d + TIME '10:00' + INTERVAL '9 hours');
                END IF;
            ELSIF week_num <= 6 THEN
                -- Week 5-6: ~50%
                IF day_offset % 2 = 0 THEN
                    seq := seq + 1;
                    INSERT INTO todo_completions (id, user_id, todo_id, completed_date, completed_at)
                    VALUES (uuid_generate_v4(), uid, todo_gym, d, d + TIME '10:00' + INTERVAL '9 hours');
                END IF;
            ELSE
                -- Week 7-8: ~55%
                IF day_offset % 4 <> 0 AND dow = 4 THEN
                    seq := seq + 1;
                    INSERT INTO todo_completions (id, user_id, todo_id, completed_date, completed_at)
                    VALUES (uuid_generate_v4(), uid, todo_gym, d, d + TIME '10:00' + INTERVAL '9 hours');
                ELSIF dow = 2 AND day_offset % 3 <> 0 THEN
                    seq := seq + 1;
                    INSERT INTO todo_completions (id, user_id, todo_id, completed_date, completed_at)
                    VALUES (uuid_generate_v4(), uid, todo_gym, d, d + TIME '10:00' + INTERVAL '9 hours');
                END IF;
            END IF;
        END IF;

    END LOOP;

    RAISE NOTICE 'Inserted % todo completions', seq;
END $$;
