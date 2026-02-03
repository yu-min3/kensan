-- ============================================================================
-- Demo Seed: Time Entries (実績データ ~240件)
-- ============================================================================
-- 計画の約85%を実行。朝活は週1-2回スキップ（子ども早起き）。
-- 夜は週1回寝落ち。実際の時間は±15分ずれる。
-- 全時刻はUTC。

DO $$
DECLARE
    base_date DATE := CURRENT_DATE - 56;
    d DATE;
    day_offset INT;
    dow INT;
    week_num INT;
    seq INT := 0;
    skip_morning BOOLEAN;
    skip_evening BOOLEAN;

    -- User
    uid UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd';

    -- Goals
    g1_id UUID := 'dd000001-0000-0000-0000-000000000000';
    g1_name TEXT := 'テックリード昇格';
    g1_color TEXT := '#3B82F6';
    g2_id UUID := 'dd000002-0000-0000-0000-000000000000';
    g2_name TEXT := '個人開発アプリリリース';
    g2_color TEXT := '#10B981';
    g3_id UUID := 'dd000003-0000-0000-0000-000000000000';
    g3_name TEXT := 'AWS SAP取得';
    g3_color TEXT := '#F59E0B';

    -- Milestones
    m_design UUID := 'dd010001-0000-0000-0000-000000000000';
    m_team UUID := 'dd010002-0000-0000-0000-000000000000';
    m_go UUID := 'dd010003-0000-0000-0000-000000000000';
    m_mvp UUID := 'dd020001-0000-0000-0000-000000000000';
    m_zenn UUID := 'dd020002-0000-0000-0000-000000000000';
    m_deploy UUID := 'dd020003-0000-0000-0000-000000000000';
    m_mock UUID := 'dd030001-0000-0000-0000-000000000000';

    -- Tasks
    t_clean UUID := 'dd100001-0000-0000-0000-000000000000';
    t_ddd UUID := 'dd100002-0000-0000-0000-000000000000';
    t_go_concur UUID := 'dd100003-0000-0000-0000-000000000000';
    t_context UUID := 'dd100004-0000-0000-0000-000000000000';
    t_ci UUID := 'dd100005-0000-0000-0000-000000000000';
    t_db UUID := 'dd100006-0000-0000-0000-000000000000';
    t_api UUID := 'dd100007-0000-0000-0000-000000000000';
    t_react UUID := 'dd100008-0000-0000-0000-000000000000';
    t_cicd UUID := 'dd100009-0000-0000-0000-000000000000';
    t_zenn UUID := 'dd100010-0000-0000-0000-000000000000';
    t_aws_env UUID := 'dd100011-0000-0000-0000-000000000000';
    t_wa UUID := 'dd100012-0000-0000-0000-000000000000';
    t_mock1 UUID := 'dd100013-0000-0000-0000-000000000000';
    t_weak UUID := 'dd100014-0000-0000-0000-000000000000';
    t_hooks UUID := 'dd100015-0000-0000-0000-000000000000';

    -- Tags
    tag_dev UUID := 'dd0a0001-0000-0000-0000-000000000000';
    tag_learn UUID := 'dd0a0002-0000-0000-0000-000000000000';
    tag_cert UUID := 'dd0a0003-0000-0000-0000-000000000000';
    tag_exercise UUID := 'dd0a0004-0000-0000-0000-000000000000';
    tag_read UUID := 'dd0a0005-0000-0000-0000-000000000000';

    -- Time jitter (minutes)
    jitter INT;

BEGIN
    FOR day_offset IN 0..55 LOOP
        d := base_date + day_offset;
        dow := EXTRACT(DOW FROM d)::INT;
        week_num := day_offset / 7 + 1;

        -- Skip patterns: deterministic based on day_offset for reproducibility
        skip_morning := (day_offset % 7 = 2) OR (day_offset % 11 = 0);  -- ~15% skip
        skip_evening := (day_offset % 9 = 0);  -- ~11% skip (fell asleep)
        jitter := (day_offset % 5) * 3 - 6;  -- -6, -3, 0, 3, 6 minutes

        -- ============================================================
        -- WEEKDAY ENTRIES
        -- ============================================================
        IF dow BETWEEN 1 AND 5 THEN

            -- === Morning: 06:00-06:45 JST (sometimes skipped) ===
            IF NOT skip_morning THEN
                seq := seq + 1;
                IF week_num <= 4 THEN
                    IF day_offset % 2 = 0 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '21:00' + (jitter || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:40' + (jitter || ' minutes')::INTERVAL,
                            t_wa, 'AWS Well-Architected学習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                            ARRAY[tag_cert], NULL
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '21:00' + (jitter || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:42' + (jitter || ' minutes')::INTERVAL,
                            t_clean, 'Clean Architecture読了', m_design, '設計レビュー力向上', g1_id, g1_name, g1_color,
                            ARRAY[tag_learn, tag_read], NULL
                        );
                    END IF;
                ELSIF week_num <= 6 THEN
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        (d - INTERVAL '1 day') + TIME '21:00' + (jitter || ' minutes')::INTERVAL,
                        (d - INTERVAL '1 day') + TIME '21:43' + (jitter || ' minutes')::INTERVAL,
                        t_react, 'React フロント実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev], NULL
                    );
                ELSE
                    IF day_offset % 2 = 0 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '21:00' + (jitter || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:38' + (jitter || ' minutes')::INTERVAL,
                            t_weak, '弱点分野復習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                            ARRAY[tag_cert], NULL
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '21:00' + (jitter || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:40' + (jitter || ' minutes')::INTERVAL,
                            t_react, 'React フロント実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev], NULL
                        );
                    END IF;
                END IF;
            END IF;

            -- === Lunch: 12:15-12:45 JST (UTC: 03:15-03:45) — high completion ===
            IF day_offset % 10 <> 0 THEN  -- 90% completion
                seq := seq + 1;
                INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                    task_name, goal_id, goal_name, goal_color, tag_ids, description)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '03:15' + ((jitter/2) || ' minutes')::INTERVAL,
                    d + TIME '03:42' + ((jitter/2) || ' minutes')::INTERVAL,
                    CASE WHEN day_offset % 2 = 0 THEN '技術ニュース読む' ELSE '英語リーディング' END,
                    NULL, NULL, NULL,
                    ARRAY[tag_learn], NULL
                );
            END IF;

            -- === Evening: 21:00-22:30 JST (UTC: 12:00-13:30) (sometimes skipped) ===
            IF NOT skip_evening THEN
                seq := seq + 1;
                IF week_num <= 2 THEN
                    IF week_num = 1 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:05' + (jitter || ' minutes')::INTERVAL,
                            d + TIME '13:25' + (jitter || ' minutes')::INTERVAL,
                            t_db, 'DB設計', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev], NULL
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:05' + (jitter || ' minutes')::INTERVAL,
                            d + TIME '13:28' + (jitter || ' minutes')::INTERVAL,
                            t_api, 'API設計・実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev], NULL
                        );
                    END IF;
                ELSIF week_num <= 4 THEN
                    IF dow <= 3 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:03' + (jitter || ' minutes')::INTERVAL,
                            d + TIME '13:30' + (jitter || ' minutes')::INTERVAL,
                            t_api, 'API設計・実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev], NULL
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:03' + (jitter || ' minutes')::INTERVAL,
                            d + TIME '13:25' + (jitter || ' minutes')::INTERVAL,
                            t_go_concur, 'Go並行処理パターン整理', m_go, 'Go並行処理マスター', g1_id, g1_name, g1_color,
                            ARRAY[tag_learn], NULL
                        );
                    END IF;
                ELSIF week_num <= 6 THEN
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '12:05' + (jitter || ' minutes')::INTERVAL,
                        d + TIME '13:35' + (jitter || ' minutes')::INTERVAL,
                        t_react, 'React フロント実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev], NULL
                    );
                ELSE
                    IF dow <= 2 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:05' + (jitter || ' minutes')::INTERVAL,
                            d + TIME '13:32' + (jitter || ' minutes')::INTERVAL,
                            t_react, 'React フロント実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev], NULL
                        );
                    ELSIF dow <= 4 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:05' + (jitter || ' minutes')::INTERVAL,
                            d + TIME '13:28' + (jitter || ' minutes')::INTERVAL,
                            t_cicd, 'CI/CD構築', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev], NULL
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:05' + (jitter || ' minutes')::INTERVAL,
                            d + TIME '13:20' + (jitter || ' minutes')::INTERVAL,
                            t_zenn, 'Zenn記事：技術選定編', m_zenn, 'Zennで技術記事公開', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev], NULL
                        );
                    END IF;
                END IF;
            END IF;

            -- === Evening AWS block (when planned) ===
            IF week_num <= 4 AND dow <= 4 AND NOT skip_evening AND day_offset % 3 <> 0 THEN
                seq := seq + 1;
                INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '13:32' + (jitter || ' minutes')::INTERVAL,
                    d + TIME '13:58' + (jitter || ' minutes')::INTERVAL,
                    t_wa, 'AWS Well-Architected学習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                    ARRAY[tag_cert], NULL
                );
            ELSIF week_num >= 7 AND dow <= 3 AND NOT skip_evening THEN
                seq := seq + 1;
                INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '13:32' + (jitter || ' minutes')::INTERVAL,
                    d + TIME '13:55' + (jitter || ' minutes')::INTERVAL,
                    t_weak, '弱点分野復習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                    ARRAY[tag_cert], NULL
                );
            END IF;

            -- === Gym Tue/Thu (60% completion) ===
            IF dow IN (2, 4) AND (day_offset % 5 <> 0) THEN  -- skip ~20% + some kid-sick days
                IF NOT (week_num >= 5 AND day_offset % 3 = 0) THEN  -- extra skips in week 5+
                    seq := seq + 1;
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '09:00', d + TIME '09:55',
                        'ジム', NULL, NULL, NULL,
                        ARRAY[tag_exercise], NULL
                    );
                END IF;
            END IF;

            -- === DDD study Wed evenings Week 3-4 ===
            IF week_num BETWEEN 3 AND 4 AND dow = 3 AND NOT skip_evening THEN
                seq := seq + 1;
                INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '13:35' + (jitter || ' minutes')::INTERVAL,
                    d + TIME '14:25' + (jitter || ' minutes')::INTERVAL,
                    t_ddd, 'DDD入門まとめ', m_design, '設計レビュー力向上', g1_id, g1_name, g1_color,
                    ARRAY[tag_learn, tag_read], NULL
                );
            END IF;

            -- === React hooks Fri evenings Week 5-6 ===
            IF week_num BETWEEN 5 AND 6 AND dow = 5 AND NOT skip_evening THEN
                seq := seq + 1;
                INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '13:35' + (jitter || ' minutes')::INTERVAL,
                    d + TIME '13:58' + (jitter || ' minutes')::INTERVAL,
                    t_hooks, 'React hooks理解', m_design, '設計レビュー力向上', g1_id, g1_name, g1_color,
                    ARRAY[tag_learn], NULL
                );
            END IF;

        -- ============================================================
        -- WEEKEND ENTRIES
        -- ============================================================
        ELSE
            IF dow = 6 THEN
                -- Saturday morning dev
                seq := seq + 1;
                IF week_num <= 2 THEN
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '00:05', d + TIME '02:50',
                        t_db, 'DB設計', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev], NULL
                    );
                ELSIF week_num <= 4 THEN
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '00:05', d + TIME '02:55',
                        t_api, 'API設計・実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev], NULL
                    );
                ELSE
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '00:05', d + TIME '02:55',
                        t_react, 'React フロント実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev], NULL
                    );
                END IF;

                -- Saturday afternoon AWS (skip Week 5-6)
                IF week_num NOT BETWEEN 5 AND 6 THEN
                    seq := seq + 1;
                    IF week_num <= 4 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '05:10', d + TIME '06:25',
                            t_wa, 'AWS Well-Architected学習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                            ARRAY[tag_cert], NULL
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '05:10', d + TIME '06:20',
                            t_weak, '弱点分野復習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                            ARRAY[tag_cert], NULL
                        );
                    END IF;
                END IF;

                -- Mock exam on specific weeks
                IF week_num = 3 OR week_num = 7 THEN
                    seq := seq + 1;
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids,
                        description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '07:05', d + TIME '09:25',
                        t_mock1, '模擬試験1回目', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                        ARRAY[tag_cert],
                        CASE WHEN week_num = 3 THEN '結果: 60%。ネットワーク系とセキュリティが弱い'
                             ELSE '結果: 72%。前回より改善。コスト最適化がまだ弱い' END
                    );
                END IF;

            ELSE
                -- Sunday gym (skip some weeks)
                IF day_offset % 4 <> 0 THEN
                    seq := seq + 1;
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '01:05', d + TIME '01:55',
                        'ジム', NULL, NULL, NULL,
                        ARRAY[tag_exercise], NULL
                    );
                END IF;

                -- Sunday afternoon study
                seq := seq + 1;
                IF week_num <= 3 THEN
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '05:05', d + TIME '05:55',
                        t_clean, 'Clean Architecture読了', m_design, '設計レビュー力向上', g1_id, g1_name, g1_color,
                        ARRAY[tag_learn, tag_read], NULL
                    );
                ELSIF week_num <= 6 THEN
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '05:05', d + TIME '05:50',
                        t_hooks, 'React hooks理解', m_design, '設計レビュー力向上', g1_id, g1_name, g1_color,
                        ARRAY[tag_learn], NULL
                    );
                ELSE
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '05:05', d + TIME '05:52',
                        t_weak, '弱点分野復習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                        ARRAY[tag_cert], NULL
                    );
                END IF;
            END IF;
        END IF;

    END LOOP;

    RAISE NOTICE 'Inserted % time entry operations', seq;
END $$;
