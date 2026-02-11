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

    -- Time jitter (minutes) — start and end independent
    jitter_start INT;
    jitter_end INT;

    -- Description for recent entries
    desc_text TEXT;

    -- Recent threshold: day_offset >= 42 means within last 2 weeks
    is_recent BOOLEAN;

BEGIN
    FOR day_offset IN 0..55 LOOP
        d := base_date + day_offset;
        dow := EXTRACT(DOW FROM d)::INT;
        week_num := day_offset / 7 + 1;
        is_recent := (day_offset >= 42);

        -- Skip patterns: deterministic based on day_offset for reproducibility
        skip_morning := (day_offset % 7 = 2) OR (day_offset % 11 = 0);  -- ~15% skip
        skip_evening := (day_offset % 9 = 0);  -- ~11% skip (fell asleep)

        -- Pseudo-random jitter using multiple factors (-15 to +20 min range for start)
        jitter_start := ((day_offset * 7 + dow * 13 + week_num * 3) % 31) - 15;
        -- Independent end jitter (-10 to +25 min range)
        jitter_end := ((day_offset * 11 + dow * 7 + week_num * 17) % 36) - 10;

        -- ============================================================
        -- WEEKDAY ENTRIES
        -- ============================================================
        IF dow BETWEEN 1 AND 5 THEN

            -- === Morning: 06:00-06:45 JST (sometimes skipped) ===
            IF NOT skip_morning THEN
                seq := seq + 1;

                -- Recent descriptions for morning entries
                desc_text := NULL;
                IF is_recent THEN
                    desc_text := CASE
                        WHEN week_num >= 7 AND day_offset % 2 = 0 THEN
                            CASE (day_offset % 5)
                                WHEN 0 THEN 'Savings Plansの計算問題3問。正答率上がってきた'
                                WHEN 2 THEN 'Spot Instancesのユースケース整理。中断時のハンドリングが肝'
                                WHEN 4 THEN 'S3 Intelligent-Tieringのコスト比較表を作成'
                                ELSE 'RI購入戦略の過去問2問。Standard vs Convertibleの判断軸が掴めた'
                            END
                        WHEN week_num >= 7 AND day_offset % 2 = 1 THEN
                            CASE (day_offset % 4)
                                WHEN 1 THEN 'グラフ表示のRechartsが意外と使いやすい。Chartjsから乗り換えて正解'
                                WHEN 3 THEN 'Zenn記事の技術選定セクション、下書き800字くらい書けた'
                                ELSE 'CI/CDのGitHub Actions設定。キャッシュ戦略で悩み中'
                            END
                        WHEN week_num = 6 THEN
                            CASE (day_offset % 3)
                                WHEN 0 THEN 'useCallbackの使い所がやっと分かった'
                                WHEN 1 THEN 'Zustandのミドルウェア周りを調査'
                                ELSE 'ダッシュボード画面のレイアウト実装'
                            END
                        ELSE NULL
                    END;
                END IF;

                IF week_num <= 4 THEN
                    IF day_offset % 2 = 0 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '21:00' + (jitter_start || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:40' + (jitter_end || ' minutes')::INTERVAL,
                            t_wa, 'AWS Well-Architected学習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                            ARRAY[tag_cert], desc_text
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '21:00' + (jitter_start || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:42' + (jitter_end || ' minutes')::INTERVAL,
                            t_clean, 'Clean Architecture読了', m_design, '設計レビュー力向上', g1_id, g1_name, g1_color,
                            ARRAY[tag_learn, tag_read], desc_text
                        );
                    END IF;
                ELSIF week_num <= 6 THEN
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        (d - INTERVAL '1 day') + TIME '21:00' + (jitter_start || ' minutes')::INTERVAL,
                        (d - INTERVAL '1 day') + TIME '21:43' + (jitter_end || ' minutes')::INTERVAL,
                        t_react, 'React フロント実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev], desc_text
                    );
                ELSE
                    IF day_offset % 2 = 0 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '21:00' + (jitter_start || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:38' + (jitter_end || ' minutes')::INTERVAL,
                            t_weak, '弱点分野復習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                            ARRAY[tag_cert], desc_text
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '21:00' + (jitter_start || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:40' + (jitter_end || ' minutes')::INTERVAL,
                            t_react, 'React フロント実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev], desc_text
                        );
                    END IF;
                END IF;
            END IF;

            -- === Lunch: 12:15-12:45 JST (UTC: 03:15-03:45) — high completion ===
            IF day_offset % 10 <> 0 THEN  -- 90% completion
                seq := seq + 1;

                desc_text := NULL;
                IF is_recent THEN
                    desc_text := CASE
                        WHEN day_offset % 2 = 0 THEN
                            CASE (day_offset % 6)
                                WHEN 0 THEN 'Goの新しいiteratorパッケージが面白い'
                                WHEN 2 THEN 'Kubernetes 1.30のリリースノート。Gateway API安定版'
                                WHEN 4 THEN 'CloudflareのAI Gateway記事。エッジでLLMプロキシは筋良い'
                                ELSE NULL
                            END
                        ELSE
                            CASE (day_offset % 6)
                                WHEN 1 THEN 'Hacker Newsの英語記事2本。知らない単語3つメモ'
                                WHEN 3 THEN 'Martin Fowlerの新記事を途中まで。EventSourcingの話'
                                WHEN 5 THEN 'AWS公式ブログの英語版。リージョン追加の話'
                                ELSE NULL
                            END
                    END;
                END IF;

                INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                    task_name, goal_id, goal_name, goal_color, tag_ids, description)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '03:15' + ((jitter_start/2) || ' minutes')::INTERVAL,
                    d + TIME '03:42' + ((jitter_end/2) || ' minutes')::INTERVAL,
                    CASE WHEN day_offset % 2 = 0 THEN '技術ニュース読む' ELSE '英語リーディング' END,
                    NULL, NULL, NULL,
                    ARRAY[tag_learn], desc_text
                );
            END IF;

            -- === Evening: 21:00-22:30 JST (UTC: 12:00-13:30) (sometimes skipped) ===
            IF NOT skip_evening THEN
                seq := seq + 1;

                desc_text := NULL;
                IF is_recent THEN
                    desc_text := CASE
                        WHEN week_num >= 7 AND dow <= 2 THEN
                            CASE (day_offset % 5)
                                WHEN 0 THEN 'グラフ表示完成！Chart.js→Rechartsに変更して正解だった'
                                WHEN 1 THEN '取引一覧のフィルタ機能実装。useReducerでstate管理'
                                WHEN 2 THEN 'APIのエラーハンドリング統一。共通ErrorBoundary追加'
                                WHEN 3 THEN 'レスポンシブ対応。モバイルでも使える見た目に'
                                ELSE 'ダッシュボードの月次集計コンポーネント実装'
                            END
                        WHEN week_num >= 7 AND dow <= 4 THEN
                            CASE (day_offset % 4)
                                WHEN 0 THEN 'fly.ioのDockerfile最適化。マルチステージビルドでイメージ半分に'
                                WHEN 1 THEN 'GitHub Actionsでテスト→ビルド→デプロイのパイプライン構築'
                                WHEN 2 THEN 'E2Eテスト用のdocker-compose作成'
                                ELSE 'Zenn記事のClean Architectureセクション、コード例を追加'
                            END
                        WHEN week_num >= 7 THEN
                            CASE (day_offset % 3)
                                WHEN 0 THEN 'コスト最適化の問題集15問。Savings Plans計算が苦手'
                                WHEN 1 THEN 'Well-Architected Toolで自分のアプリを評価してみた'
                                ELSE 'Gravitonインスタンスの移行パターン整理'
                            END
                        WHEN week_num = 6 THEN
                            CASE (day_offset % 3)
                                WHEN 0 THEN 'React Router v6のloader機能を試した。SSRっぽくて面白い'
                                WHEN 1 THEN 'フォームバリデーション。react-hook-formが楽'
                                ELSE '取引入力フォームのUIが形になってきた'
                            END
                        ELSE NULL
                    END;
                END IF;

                IF week_num <= 2 THEN
                    IF week_num = 1 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '13:25' + (jitter_end || ' minutes')::INTERVAL,
                            t_db, 'DB設計', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev], desc_text
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '13:28' + (jitter_end || ' minutes')::INTERVAL,
                            t_api, 'API設計・実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev], desc_text
                        );
                    END IF;
                ELSIF week_num <= 4 THEN
                    IF dow <= 3 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:03' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '13:30' + (jitter_end || ' minutes')::INTERVAL,
                            t_api, 'API設計・実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev], desc_text
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:03' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '13:25' + (jitter_end || ' minutes')::INTERVAL,
                            t_go_concur, 'Go並行処理パターン整理', m_go, 'Go並行処理マスター', g1_id, g1_name, g1_color,
                            ARRAY[tag_learn], desc_text
                        );
                    END IF;
                ELSIF week_num <= 6 THEN
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '12:05' + (jitter_start || ' minutes')::INTERVAL,
                        d + TIME '13:35' + (jitter_end || ' minutes')::INTERVAL,
                        t_react, 'React フロント実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev], desc_text
                    );
                ELSE
                    IF dow <= 2 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '13:32' + (jitter_end || ' minutes')::INTERVAL,
                            t_react, 'React フロント実装', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev], desc_text
                        );
                    ELSIF dow <= 4 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '13:28' + (jitter_end || ' minutes')::INTERVAL,
                            t_cicd, 'CI/CD構築', m_mvp, 'MVP完成', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev], desc_text
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '13:20' + (jitter_end || ' minutes')::INTERVAL,
                            t_zenn, 'Zenn記事：技術選定編', m_zenn, 'Zennで技術記事公開', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev], desc_text
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
                    d + TIME '13:32' + (jitter_start || ' minutes')::INTERVAL,
                    d + TIME '13:58' + (jitter_end || ' minutes')::INTERVAL,
                    t_wa, 'AWS Well-Architected学習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                    ARRAY[tag_cert], CASE WHEN is_recent THEN 'IAMポリシー評価ロジックの暗記。明示的Deny最優先' ELSE NULL END
                );
            ELSIF week_num >= 7 AND dow <= 3 AND NOT skip_evening THEN
                seq := seq + 1;
                INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '13:32' + (jitter_start || ' minutes')::INTERVAL,
                    d + TIME '13:55' + (jitter_end || ' minutes')::INTERVAL,
                    t_weak, '弱点分野復習', m_mock, '模擬試験80%以上', g3_id, g3_name, g3_color,
                    ARRAY[tag_cert],
                    CASE WHEN is_recent THEN
                        CASE (day_offset % 4)
                            WHEN 0 THEN 'Compute Optimizerのレコメンデーション機能を検証'
                            WHEN 1 THEN 'S3ライフサイクルポリシーのコスト計算。Glacierの取り出し料金が罠'
                            WHEN 2 THEN 'Reserved InstanceのマーケットプレイスでのResale条件整理'
                            ELSE 'EBSボリュームタイプ比較。gp3 vs io2のIOPS単価'
                        END
                    ELSE NULL END
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
                        ARRAY[tag_exercise],
                        CASE WHEN is_recent THEN
                            CASE (day_offset % 3)
                                WHEN 0 THEN 'スクワット5x5。腰の調子良い'
                                WHEN 1 THEN 'ベンチプレス+懸垂。先週より1rep増えた'
                                ELSE 'デッドリフト+有酸素20分。汗だくだけど頭がスッキリ'
                            END
                        ELSE NULL END
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
                    d + TIME '13:35' + (jitter_start || ' minutes')::INTERVAL,
                    d + TIME '14:25' + (jitter_end || ' minutes')::INTERVAL,
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
                    d + TIME '13:35' + (jitter_start || ' minutes')::INTERVAL,
                    d + TIME '13:58' + (jitter_end || ' minutes')::INTERVAL,
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
                        ARRAY[tag_dev],
                        CASE WHEN is_recent THEN 'fly.ioへの初デプロイ成功！Dockerfileのマルチステージビルドでハマった' ELSE NULL END
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
                            ARRAY[tag_cert],
                            CASE WHEN is_recent THEN 'AWS Pricing Calculatorで実際にRI購入シミュレーション' ELSE NULL END
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
                        ARRAY[tag_exercise],
                        CASE WHEN is_recent THEN 'ランニング30分+ストレッチ。週末は軽めに' ELSE NULL END
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
                        ARRAY[tag_cert],
                        CASE WHEN is_recent THEN 'コスト最適化の模擬問題20問一気解き。正答率58%→もう少し' ELSE NULL END
                    );
                END IF;
            END IF;
        END IF;

    END LOOP;

    RAISE NOTICE 'Inserted % time entry operations (loop)', seq;
END $$;


-- ============================================================================
-- イレギュラーエントリー（計画外の人間味ある実績）
-- ============================================================================

-- 1. 本番障害の原因調査（CURRENT_DATE - 1, 計画は個人開発だったが急遽対応）
-- JST 14:00-15:20 = UTC 05:00-06:20
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    (CURRENT_DATE - 1) + TIME '05:00', (CURRENT_DATE - 1) + TIME '06:20',
    '本番障害原因調査',
    'dd000001-0000-0000-0000-000000000000', 'テックリード昇格', '#3B82F6',
    ARRAY['dd0a0001-0000-0000-0000-000000000000']::uuid[],
    'goroutineリーク発見。context.WithTimeoutで解決。先月勉強した内容がそのまま活きた'
);

-- 2. フロー状態で延長（CURRENT_DATE - 3, React実装が23:30 JST = 14:30 UTC まで延長）
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    (CURRENT_DATE - 3) + TIME '12:10', (CURRENT_DATE - 3) + TIME '14:30',
    'dd100008-0000-0000-0000-000000000000', 'React フロント実装',
    'dd020001-0000-0000-0000-000000000000', 'MVP完成',
    'dd000002-0000-0000-0000-000000000000', '個人開発アプリリリース', '#10B981',
    ARRAY['dd0a0001-0000-0000-0000-000000000000']::uuid[],
    'グラフ表示完成！Rechartsのカスタマイズにハマって23:30まで。達成感すごい'
);

-- 3. 子ども夜泣きで中断（CURRENT_DATE - 5, 21:30 JST = 12:30 UTC で終了。計画は23:00まで）
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    (CURRENT_DATE - 5) + TIME '12:08', (CURRENT_DATE - 5) + TIME '12:30',
    'dd100009-0000-0000-0000-000000000000', 'CI/CD構築',
    'dd020001-0000-0000-0000-000000000000', 'MVP完成',
    'dd000002-0000-0000-0000-000000000000', '個人開発アプリリリース', '#10B981',
    ARRAY['dd0a0001-0000-0000-0000-000000000000']::uuid[],
    '子どもが夜泣きで21:30中断。GitHub Actionsのyamlだけ途中まで書いた'
);

-- 4. 朝の失敗（CURRENT_DATE - 4, アラーム聞こえず6:20スタート→6:45終了の短縮朝活）
-- JST 06:20-06:45 = UTC 前日21:20-21:45
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    (CURRENT_DATE - 5) + TIME '21:20', (CURRENT_DATE - 5) + TIME '21:45',
    'dd100014-0000-0000-0000-000000000000', '弱点分野復習',
    'dd030001-0000-0000-0000-000000000000', '模擬試験80%以上',
    'dd000003-0000-0000-0000-000000000000', 'AWS SAP取得', '#F59E0B',
    ARRAY['dd0a0003-0000-0000-0000-000000000000']::uuid[],
    'アラーム聞こえず20分遅刻。コスト最適化の問題1問だけ。悔しい'
);

-- 5. 週末バースト（CURRENT_DATE - 2 が日曜想定, Zenn記事書きが乗って4時間連続）
-- JST 09:00-13:00 = UTC 00:00-04:00
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    (CURRENT_DATE - 2) + TIME '00:00', (CURRENT_DATE - 2) + TIME '04:00',
    'dd100010-0000-0000-0000-000000000000', 'Zenn記事：技術選定編',
    'dd020002-0000-0000-0000-000000000000', 'Zennで技術記事公開',
    'dd000002-0000-0000-0000-000000000000', '個人開発アプリリリース', '#10B981',
    ARRAY['dd0a0001-0000-0000-0000-000000000000']::uuid[],
    'Zenn記事が乗って4時間連続。技術選定とClean Architectureのセクション完成。3000字'
);

-- 6. 即興コードレビュー（CURRENT_DATE - 6, 計画にないが同僚のPRレビューを30分）
-- JST 20:00-20:30 = UTC 11:00-11:30
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    (CURRENT_DATE - 6) + TIME '11:00', (CURRENT_DATE - 6) + TIME '11:30',
    '同僚のPRレビュー',
    'dd000001-0000-0000-0000-000000000000', 'テックリード昇格', '#3B82F6',
    ARRAY['dd0a0001-0000-0000-0000-000000000000']::uuid[],
    '後輩のGo PR。エラーハンドリングのパターンをフィードバック。自分の提案が効いてる'
);

-- 7. 今朝の朝活（CURRENT_DATE, 06:05-06:42 JST = 前日21:05-21:42 UTC）
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    (CURRENT_DATE - 1) + TIME '21:05', (CURRENT_DATE - 1) + TIME '21:42',
    'dd100014-0000-0000-0000-000000000000', '弱点分野復習',
    'dd030001-0000-0000-0000-000000000000', '模擬試験80%以上',
    'dd000003-0000-0000-0000-000000000000', 'AWS SAP取得', '#F59E0B',
    ARRAY['dd0a0003-0000-0000-0000-000000000000']::uuid[],
    'Savings Plansの計算問題3問。Compute vs EC2の使い分けが見えてきた'
);
