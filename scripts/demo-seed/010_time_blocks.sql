-- ============================================================================
-- Demo Seed: Time Blocks (計画データ ~280件)
-- ============================================================================
-- 8週間分の計画データ。CURRENT_DATE基準の相対日付。
-- 平日: 4-6ブロック/日、週末: 2-4ブロック
-- 全時刻はUTC（Asia/Tokyo - 9h）
--
-- JST→UTC変換:
--   JST 06:00 = UTC 21:00 (前日)
--   JST 06:45 = UTC 21:45 (前日)
--   JST 12:15 = UTC 03:15
--   JST 12:45 = UTC 03:45
--   JST 18:00 = UTC 09:00
--   JST 19:00 = UTC 10:00
--   JST 21:00 = UTC 12:00
--   JST 22:00 = UTC 13:00
--   JST 23:00 = UTC 14:00

-- Helper: generate time blocks using generate_series
-- We use a DO block with PL/pgSQL for complex conditional logic

DO $$
DECLARE
    base_date DATE := CURRENT_DATE - 56;  -- 8 weeks ago
    d DATE;
    day_offset INT;
    dow INT;  -- 0=Sun ... 6=Sat
    week_num INT;
    block_id UUID;
    seq INT := 0;

    -- User ID
    uid UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd';

    -- Goal info (denormalized)
    g1_id UUID := 'dd000001-0000-0000-0000-000000000000';  -- テックリード
    g1_name TEXT := 'テックリード昇格';
    g1_color TEXT := '#3B82F6';
    g2_id UUID := 'dd000002-0000-0000-0000-000000000000';  -- 個人開発
    g2_name TEXT := '個人開発アプリリリース';
    g2_color TEXT := '#10B981';
    g3_id UUID := 'dd000003-0000-0000-0000-000000000000';  -- AWS SAP
    g3_name TEXT := 'AWS SAP取得';
    g3_color TEXT := '#F59E0B';

    -- Milestone info
    m_design UUID := 'dd010001-0000-0000-0000-000000000000';    -- 設計レビュー力向上
    m_team UUID := 'dd010002-0000-0000-0000-000000000000';      -- チーム改善提案
    m_go UUID := 'dd010003-0000-0000-0000-000000000000';        -- Go並行処理マスター
    m_mvp UUID := 'dd020001-0000-0000-0000-000000000000';       -- MVP完成
    m_zenn UUID := 'dd020002-0000-0000-0000-000000000000';      -- Zenn記事
    m_deploy UUID := 'dd020003-0000-0000-0000-000000000000';    -- 本番デプロイ
    m_mock UUID := 'dd030001-0000-0000-0000-000000000000';      -- 模擬試験80%
    m_exam UUID := 'dd030002-0000-0000-0000-000000000000';      -- 本番受験

    -- Task IDs
    t_clean UUID := 'dd100001-0000-0000-0000-000000000000';     -- Clean Architecture読了
    t_ddd UUID := 'dd100002-0000-0000-0000-000000000000';       -- DDD入門まとめ
    t_go_concur UUID := 'dd100003-0000-0000-0000-000000000000'; -- Go並行処理パターン整理
    t_context UUID := 'dd100004-0000-0000-0000-000000000000';   -- context記事
    t_ci UUID := 'dd100005-0000-0000-0000-000000000000';        -- CI/CD改善提案
    t_db UUID := 'dd100006-0000-0000-0000-000000000000';        -- DB設計
    t_api UUID := 'dd100007-0000-0000-0000-000000000000';       -- API設計・実装
    t_react UUID := 'dd100008-0000-0000-0000-000000000000';     -- React フロント実装
    t_cicd UUID := 'dd100009-0000-0000-0000-000000000000';      -- CI/CD構築
    t_zenn UUID := 'dd100010-0000-0000-0000-000000000000';      -- Zenn記事
    t_aws_env UUID := 'dd100011-0000-0000-0000-000000000000';   -- AWS環境構築
    t_wa UUID := 'dd100012-0000-0000-0000-000000000000';        -- Well-Architected学習
    t_mock1 UUID := 'dd100013-0000-0000-0000-000000000000';     -- 模擬試験1回目
    t_weak UUID := 'dd100014-0000-0000-0000-000000000000';      -- 弱点分野復習
    t_hooks UUID := 'dd100015-0000-0000-0000-000000000000';     -- React hooks理解

    -- Tag IDs
    tag_dev UUID := 'dd0a0001-0000-0000-0000-000000000000';
    tag_learn UUID := 'dd0a0002-0000-0000-0000-000000000000';
    tag_cert UUID := 'dd0a0003-0000-0000-0000-000000000000';
    tag_exercise UUID := 'dd0a0004-0000-0000-0000-000000000000';
    tag_read UUID := 'dd0a0005-0000-0000-0000-000000000000';

BEGIN
    FOR day_offset IN 0..55 LOOP
        d := base_date + day_offset;
        dow := EXTRACT(DOW FROM d)::INT;  -- 0=Sun, 1=Mon, ...6=Sat
        week_num := day_offset / 7 + 1;    -- 1-8

        -- ============================================================
        -- WEEKDAY BLOCKS (Mon-Fri)
        -- ============================================================
        IF dow BETWEEN 1 AND 5 THEN

            -- === Morning block: 06:00-06:45 JST (UTC: previous day 21:00-21:45) ===
            seq := seq + 1;
            IF week_num <= 4 THEN
                -- Week 1-4: AWS or Clean Architecture
                IF day_offset % 2 = 0 THEN
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        (d - INTERVAL '1 day') + TIME '21:00', (d - INTERVAL '1 day') + TIME '21:45',
                        t_wa, 'AWS Well-Architected学習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                        ARRAY[tag_cert]
                    );
                ELSE
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        (d - INTERVAL '1 day') + TIME '21:00', (d - INTERVAL '1 day') + TIME '21:45',
                        t_clean, 'Clean Architecture読了', m_design, '設計レビュー力向上', g1_id, g1_name, g1_color,
                        ARRAY[tag_learn, tag_read]
                    );
                END IF;
            ELSIF week_num <= 6 THEN
                -- Week 5-6: Mostly personal dev morning
                INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                VALUES (
                    uuid_generate_v4(), uid,
                    (d - INTERVAL '1 day') + TIME '21:00', (d - INTERVAL '1 day') + TIME '21:45',
                    t_react, 'React フロント実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                    ARRAY[tag_dev]
                );
            ELSE
                -- Week 7-8: Mix of AWS catch-up and dev
                IF day_offset % 2 = 0 THEN
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        (d - INTERVAL '1 day') + TIME '21:00', (d - INTERVAL '1 day') + TIME '21:45',
                        t_weak, '弱点分野復習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                        ARRAY[tag_cert]
                    );
                ELSE
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        (d - INTERVAL '1 day') + TIME '21:00', (d - INTERVAL '1 day') + TIME '21:45',
                        t_react, 'React フロント実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev]
                    );
                END IF;
            END IF;

            -- === Lunch block: 12:15-12:45 JST (UTC: 03:15-03:45) ===
            seq := seq + 1;
            INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                task_id, task_name, goal_id, goal_name, goal_color, tag_ids, is_routine)
            VALUES (
                uuid_generate_v4(), uid,
                d + TIME '03:15', d + TIME '03:45',
                NULL, CASE WHEN day_offset % 2 = 0 THEN '技術ニュース読む' ELSE '英語リーディング' END,
                NULL, NULL, NULL,
                ARRAY[tag_learn], true
            );

            -- === Evening block 1: 21:00-22:30 JST (UTC: 12:00-13:30) ===
            seq := seq + 1;
            IF week_num <= 2 THEN
                -- Week 1-2: DB設計 → API設計
                IF week_num = 1 THEN
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '12:00', d + TIME '13:30',
                        t_db, 'DB設計', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev]
                    );
                ELSE
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '12:00', d + TIME '13:30',
                        t_api, 'API設計・実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev]
                    );
                END IF;
            ELSIF week_num <= 4 THEN
                -- Week 3-4: API実装 + Go並行処理
                IF dow <= 3 THEN
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '12:00', d + TIME '13:30',
                        t_api, 'API設計・実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev]
                    );
                ELSE
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '12:00', d + TIME '13:30',
                        t_go_concur, 'Go並行処理パターン整理', m_go, 'Go並行処理マスター', g1_id, g1_name, g1_color,
                        ARRAY[tag_learn]
                    );
                END IF;
            ELSIF week_num <= 6 THEN
                -- Week 5-6: React実装に没頭
                INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '12:00', d + TIME '13:30',
                    t_react, 'React フロント実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                    ARRAY[tag_dev]
                );
            ELSE
                -- Week 7-8: 追い込み（React + CI/CD + Zenn記事）
                IF dow <= 2 THEN
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '12:00', d + TIME '13:30',
                        t_react, 'React フロント実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev]
                    );
                ELSIF dow <= 4 THEN
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '12:00', d + TIME '13:30',
                        t_cicd, 'CI/CD構築', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev]
                    );
                ELSE
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '12:00', d + TIME '13:30',
                        t_zenn, 'Zenn記事：技術選定編', m_zenn, 'Zennで技術記事公開', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev]
                    );
                END IF;
            END IF;

            -- === Evening block 2: 22:30-23:00 JST (UTC: 13:30-14:00) ===
            -- AWS study on some evenings (less frequent in Week 5-6)
            IF week_num <= 4 AND dow <= 4 THEN
                seq := seq + 1;
                INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '13:30', d + TIME '14:00',
                    t_wa, 'AWS Well-Architected学習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                    ARRAY[tag_cert]
                );
            ELSIF week_num >= 7 AND dow <= 3 THEN
                -- Week 7-8: AWS catch-up evenings
                seq := seq + 1;
                INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '13:30', d + TIME '14:00',
                    t_weak, '弱点分野復習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                    ARRAY[tag_cert]
                );
            END IF;

            -- === Gym blocks: Tue/Thu 18:00-19:00 JST (UTC: 09:00-10:00) ===
            IF dow IN (2, 4) THEN
                seq := seq + 1;
                INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                    task_name, goal_id, goal_name, goal_color, tag_ids, is_routine)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '09:00', d + TIME '10:00',
                    'ジム', NULL, NULL, NULL,
                    ARRAY[tag_exercise], true
                );
            END IF;

            -- === DDD study on Wed evenings Week 3-4: 22:30-23:30 JST (UTC: 13:30-14:30) ===
            IF week_num BETWEEN 3 AND 4 AND dow = 3 THEN
                seq := seq + 1;
                INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '13:30', d + TIME '14:30',
                    t_ddd, 'DDD入門まとめ', m_design, '設計レビュー力向上', g1_id, g1_name, g1_color,
                    ARRAY[tag_learn, tag_read]
                );
            END IF;

            -- === React hooks study: Fri evenings Week 5-6: 22:30-23:00 JST ===
            IF week_num BETWEEN 5 AND 6 AND dow = 5 THEN
                seq := seq + 1;
                INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '13:30', d + TIME '14:00',
                    t_hooks, 'React hooks理解', m_design, '設計レビュー力向上', g1_id, g1_name, g1_color,
                    ARRAY[tag_learn]
                );
            END IF;

        -- ============================================================
        -- WEEKEND BLOCKS (Sat=6, Sun=0)
        -- ============================================================
        ELSE
            IF dow = 6 THEN
                -- Saturday: まとまった開発時間 09:00-12:00 JST (UTC: 00:00-03:00)
                seq := seq + 1;
                IF week_num <= 2 THEN
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '00:00', d + TIME '03:00',
                        t_db, 'DB設計', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev]
                    );
                ELSIF week_num <= 4 THEN
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '00:00', d + TIME '03:00',
                        t_api, 'API設計・実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev]
                    );
                ELSE
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '00:00', d + TIME '03:00',
                        t_react, 'React フロント実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev]
                    );
                END IF;

                -- Saturday afternoon: AWS 14:00-15:30 JST (UTC: 05:00-06:30)
                IF week_num NOT BETWEEN 5 AND 6 THEN
                    seq := seq + 1;
                    IF week_num <= 4 THEN
                        INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '05:00', d + TIME '06:30',
                            t_wa, 'AWS Well-Architected学習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                            ARRAY[tag_cert]
                        );
                    ELSE
                        INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '05:00', d + TIME '06:30',
                            t_weak, '弱点分野復習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                            ARRAY[tag_cert]
                        );
                    END IF;
                END IF;

                -- Saturday: mock exam on specific weeks
                IF week_num = 3 OR week_num = 7 THEN
                    seq := seq + 1;
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '07:00', d + TIME '09:30',
                        t_mock1, '模擬試験1回目', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                        ARRAY[tag_cert]
                    );
                END IF;

            ELSE
                -- Sunday: ジム 10:00-11:00 JST (UTC: 01:00-02:00)
                seq := seq + 1;
                INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                    task_name, goal_id, goal_name, goal_color, tag_ids, is_routine)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '01:00', d + TIME '02:00',
                    'ジム', NULL, NULL, NULL,
                    ARRAY[tag_exercise], true
                );

                -- Sunday: 軽い学習 14:00-15:00 JST (UTC: 05:00-06:00)
                seq := seq + 1;
                IF week_num <= 3 THEN
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '05:00', d + TIME '06:00',
                        t_clean, 'Clean Architecture読了', m_design, '設計レビュー力向上', g1_id, g1_name, g1_color,
                        ARRAY[tag_learn, tag_read]
                    );
                ELSIF week_num <= 6 THEN
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '05:00', d + TIME '06:00',
                        t_hooks, 'React hooks理解', m_design, '設計レビュー力向上', g1_id, g1_name, g1_color,
                        ARRAY[tag_learn]
                    );
                ELSE
                    INSERT INTO time_blocks (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '05:00', d + TIME '06:00',
                        t_weak, '弱点分野復習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                        ARRAY[tag_cert]
                    );
                END IF;
            END IF;
        END IF;

    END LOOP;

    RAISE NOTICE 'Inserted % time block operations', seq;
END $$;
