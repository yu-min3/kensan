-- ============================================================================
-- Demo Seed: Time Entries — 山田拓也 (~180件)
-- ============================================================================
-- Week1-4: 計画の50%しか実行しない（サボりがち）
-- Week5-8: 先輩のアドバイスで改善、80%実行

DO $$
DECLARE
    base_date DATE := CURRENT_DATE - 56;
    d DATE;
    day_offset INT;
    dow INT;
    week_num INT;
    seq INT := 0;
    skip_block BOOLEAN;

    uid UUID := 'd2222222-2222-2222-2222-222222222222';

    g1_id UUID := 'd2000001-0000-0000-0000-000000000000';
    g1_name TEXT := 'AWS SAA取得';
    g1_color TEXT := '#F59E0B';
    g2_id UUID := 'd2000002-0000-0000-0000-000000000000';
    g2_name TEXT := 'Pythonで個人ツール';
    g2_color TEXT := '#10B981';
    g3_id UUID := 'd2000003-0000-0000-0000-000000000000';
    g3_name TEXT := '応用情報技術者取得';
    g3_color TEXT := '#3B82F6';

    m_aws_base UUID := 'd2010001-0000-0000-0000-000000000000';
    m_aws_mock UUID := 'd2010002-0000-0000-0000-000000000000';
    m_py_base UUID := 'd2020001-0000-0000-0000-000000000000';
    m_cli UUID := 'd2020002-0000-0000-0000-000000000000';
    m_ap_am UUID := 'd2030001-0000-0000-0000-000000000000';
    m_ap_pm UUID := 'd2030002-0000-0000-0000-000000000000';

    t_udemy1 UUID := 'd2100001-0000-0000-0000-000000000000';
    t_handson UUID := 'd2100002-0000-0000-0000-000000000000';
    t_udemy2 UUID := 'd2100003-0000-0000-0000-000000000000';
    t_mock1 UUID := 'd2100004-0000-0000-0000-000000000000';
    t_weak UUID := 'd2100005-0000-0000-0000-000000000000';
    t_py1 UUID := 'd2100006-0000-0000-0000-000000000000';
    t_py2 UUID := 'd2100007-0000-0000-0000-000000000000';
    t_click UUID := 'd2100008-0000-0000-0000-000000000000';
    t_cli_impl UUID := 'd2100009-0000-0000-0000-000000000000';
    t_ap_past UUID := 'd2100010-0000-0000-0000-000000000000';
    t_ap_text UUID := 'd2100011-0000-0000-0000-000000000000';
    t_algo UUID := 'd2100012-0000-0000-0000-000000000000';
    t_db UUID := 'd2100013-0000-0000-0000-000000000000';
    t_spring UUID := 'd2100014-0000-0000-0000-000000000000';
    t_git UUID := 'd2100015-0000-0000-0000-000000000000';

    tag_dev UUID := 'd20a0001-0000-0000-0000-000000000000';
    tag_learn UUID := 'd20a0002-0000-0000-0000-000000000000';
    tag_cert UUID := 'd20a0003-0000-0000-0000-000000000000';

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

        -- Pseudo-random jitter using multiple factors (-15 to +15 min range for start)
        jitter_start := ((day_offset * 7 + dow * 13 + week_num * 3) % 31) - 15;
        -- Independent end jitter (-10 to +25 min range)
        jitter_end := ((day_offset * 11 + dow * 7 + week_num * 17) % 36) - 10;

        -- Skip logic: Week1-4 skip ~50%, Week5-8 skip ~20%
        IF week_num <= 4 THEN
            skip_block := (day_offset % 2 = 0);
        ELSE
            skip_block := (day_offset % 5 = 0);
        END IF;

        -- ============================================================
        -- WEEKDAY ENTRIES
        -- ============================================================
        IF dow BETWEEN 1 AND 5 THEN

            -- === Morning (only when planned: Week3-4 first 3 days, Week6+) ===
            IF week_num BETWEEN 3 AND 4 AND day_offset % 7 < 3 THEN
                -- 3日坊主: execute only first 2 days (skip 3rd)
                IF day_offset % 7 < 2 THEN
                    seq := seq + 1;
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        (d - INTERVAL '1 day') + TIME '21:35' + (jitter_start || ' minutes')::INTERVAL,
                        (d - INTERVAL '1 day') + TIME '21:55' + (jitter_end || ' minutes')::INTERVAL,
                        t_udemy1, 'Udemy AWS SAA講座', m_aws_base, 'AWS基礎理解', g1_id, g1_name, g1_color,
                        ARRAY[tag_cert], NULL
                    );
                END IF;
            ELSIF week_num >= 6 AND NOT skip_block THEN
                seq := seq + 1;

                -- Recent descriptions for morning entries (朝活)
                desc_text := NULL;
                IF is_recent THEN
                    IF day_offset % 2 = 0 THEN
                        desc_text := CASE (day_offset % 5)
                            WHEN 0 THEN '午前問題5問。ネットワーク系が弱い'
                            WHEN 2 THEN 'セキュリティの問題3問。PKIの仕組みを復習'
                            WHEN 4 THEN 'データベースの正規化問題。第3正規形まで整理'
                            ELSE 'アルゴリズムの擬似コード問題2問。トレースが大事'
                        END;
                    ELSE
                        desc_text := CASE (day_offset % 4)
                            WHEN 1 THEN 'IAMポリシーの評価順序を復習'
                            WHEN 3 THEN 'S3ストレージクラスの比較表を作った'
                            ELSE 'RDSマルチAZの仕組みを理解'
                        END;
                    END IF;
                END IF;

                IF day_offset % 2 = 0 THEN
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        (d - INTERVAL '1 day') + TIME '21:33' + (jitter_start || ' minutes')::INTERVAL,
                        (d - INTERVAL '1 day') + TIME '21:58' + (jitter_end || ' minutes')::INTERVAL,
                        t_ap_past, '応用情報 過去問 午前', m_ap_am, '午前問題80%以上', g3_id, g3_name, g3_color,
                        ARRAY[tag_cert], desc_text
                    );
                ELSE
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        (d - INTERVAL '1 day') + TIME '21:33' + (jitter_start || ' minutes')::INTERVAL,
                        (d - INTERVAL '1 day') + TIME '21:56' + (jitter_end || ' minutes')::INTERVAL,
                        t_udemy2, 'Udemy AWS SAA講座 セクション6-10', m_aws_base, 'AWS基礎理解', g1_id, g1_name, g1_color,
                        ARRAY[tag_cert], desc_text
                    );
                END IF;
            END IF;

            -- === Evening block ===
            IF NOT skip_block THEN

                -- Recent descriptions for evening entries (AWS学習/Python/応用情報)
                desc_text := NULL;
                IF is_recent THEN
                    IF week_num >= 7 AND dow <= 2 THEN
                        desc_text := CASE (day_offset % 5)
                            WHEN 0 THEN 'S3ストレージクラスの比較表を作った'
                            WHEN 1 THEN 'RDSマルチAZの仕組みを理解'
                            WHEN 2 THEN 'IAMポリシーの評価順序を復習'
                            WHEN 3 THEN 'VPCエンドポイントのGateway型とInterface型の違い'
                            ELSE 'CloudFrontのキャッシュ戦略。TTL設定がポイント'
                        END;
                    ELSIF week_num >= 7 AND dow = 3 THEN
                        desc_text := CASE (day_offset % 3)
                            WHEN 0 THEN 'Clickのコマンド定義が直感的'
                            WHEN 1 THEN 'SQLiteとの接続を実装'
                            ELSE 'argparseとClickの違いを比較。Clickの方がモダン'
                        END;
                    ELSIF week_num >= 7 AND dow = 4 THEN
                        desc_text := CASE (day_offset % 3)
                            WHEN 0 THEN 'OSI参照モデルの各層の役割を整理'
                            WHEN 1 THEN 'SQLのサブクエリとJOINの使い分け問題'
                            ELSE 'セキュリティのCIA（機密性・完全性・可用性）'
                        END;
                    ELSIF week_num >= 7 AND dow = 5 THEN
                        desc_text := CASE (day_offset % 3)
                            WHEN 0 THEN 'ソートアルゴリズムの計算量比較表を作成'
                            WHEN 1 THEN 'スタックとキューの実装パターン'
                            ELSE '二分探索木のトラバース問題。再帰で解けた'
                        END;
                    ELSIF week_num = 6 THEN
                        desc_text := CASE (day_offset % 3)
                            WHEN 0 THEN 'Udemyのハンズオンでセキュリティグループ設定'
                            WHEN 1 THEN 'Python入門書の例外処理の章。try-except'
                            ELSE NULL
                        END;
                    END IF;
                END IF;

                IF week_num <= 2 THEN
                    IF dow IN (1, 3, 5) THEN
                        seq := seq + 1;
                        IF dow = 1 THEN
                            INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                                task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                            VALUES (
                                uuid_generate_v4(), uid,
                                d + TIME '12:10' + (jitter_start || ' minutes')::INTERVAL,
                                d + TIME '13:15' + (jitter_end || ' minutes')::INTERVAL,
                                t_udemy1, 'Udemy AWS SAA講座 セクション1-5', m_aws_base, 'AWS基礎理解', g1_id, g1_name, g1_color,
                                ARRAY[tag_cert], desc_text
                            );
                        ELSIF dow = 3 THEN
                            INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                                task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                            VALUES (
                                uuid_generate_v4(), uid,
                                d + TIME '12:10' + (jitter_start || ' minutes')::INTERVAL,
                                d + TIME '13:10' + (jitter_end || ' minutes')::INTERVAL,
                                t_py1, 'Python入門書 前半', m_py_base, 'Python基礎習得', g2_id, g2_name, g2_color,
                                ARRAY[tag_learn], desc_text
                            );
                        ELSE
                            INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                                task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                            VALUES (
                                uuid_generate_v4(), uid,
                                d + TIME '12:10' + (jitter_start || ' minutes')::INTERVAL,
                                d + TIME '13:05' + (jitter_end || ' minutes')::INTERVAL,
                                t_git, 'Git/GitHub使い方まとめ', m_py_base, 'Python基礎習得', g2_id, g2_name, g2_color,
                                ARRAY[tag_learn], desc_text
                            );
                        END IF;
                    END IF;
                ELSIF week_num <= 4 THEN
                    IF dow <= 4 THEN
                        seq := seq + 1;
                        IF dow <= 2 THEN
                            INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                                task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                            VALUES (
                                uuid_generate_v4(), uid,
                                d + TIME '12:08' + (jitter_start || ' minutes')::INTERVAL,
                                d + TIME '13:20' + (jitter_end || ' minutes')::INTERVAL,
                                t_udemy1, 'Udemy AWS SAA講座', m_aws_base, 'AWS基礎理解', g1_id, g1_name, g1_color,
                                ARRAY[tag_cert], desc_text
                            );
                        ELSE
                            INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                                task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                            VALUES (
                                uuid_generate_v4(), uid,
                                d + TIME '12:08' + (jitter_start || ' minutes')::INTERVAL,
                                d + TIME '13:15' + (jitter_end || ' minutes')::INTERVAL,
                                t_py1, 'Python入門書 前半', m_py_base, 'Python基礎習得', g2_id, g2_name, g2_color,
                                ARRAY[tag_learn], desc_text
                            );
                        END IF;
                    END IF;
                ELSE
                    -- Week 5-8: stable
                    seq := seq + 1;
                    IF dow <= 2 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '13:28' + (jitter_end || ' minutes')::INTERVAL,
                            CASE WHEN week_num <= 6 THEN t_udemy2 ELSE t_weak END,
                            CASE WHEN week_num <= 6 THEN 'Udemy AWS SAA講座 セクション6-10' ELSE '弱点分野復習' END,
                            CASE WHEN week_num <= 6 THEN m_aws_base ELSE m_aws_mock END,
                            CASE WHEN week_num <= 6 THEN 'AWS基礎理解' ELSE '模擬試験70%以上' END,
                            g1_id, g1_name, g1_color,
                            ARRAY[tag_cert], desc_text
                        );
                    ELSIF dow = 3 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '13:25' + (jitter_end || ' minutes')::INTERVAL,
                            CASE WHEN week_num <= 6 THEN t_py2 ELSE t_click END,
                            CASE WHEN week_num <= 6 THEN 'Python入門書 後半' ELSE 'Click ライブラリ調査' END,
                            CASE WHEN week_num <= 6 THEN m_py_base ELSE m_cli END,
                            CASE WHEN week_num <= 6 THEN 'Python基礎習得' ELSE 'CLIツールのMVP完成' END,
                            g2_id, g2_name, g2_color,
                            ARRAY[CASE WHEN week_num <= 6 THEN tag_learn ELSE tag_dev END], desc_text
                        );
                    ELSIF dow = 4 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '13:25' + (jitter_end || ' minutes')::INTERVAL,
                            t_ap_text, '応用情報テキスト読み込み', m_ap_am, '午前問題80%以上', g3_id, g3_name, g3_color,
                            ARRAY[tag_cert], desc_text
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '12:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '13:22' + (jitter_end || ' minutes')::INTERVAL,
                            t_algo, 'アルゴリズム問題演習', m_ap_pm, '午後問題対策', g3_id, g3_name, g3_color,
                            ARRAY[tag_cert], desc_text
                        );
                    END IF;
                END IF;
            END IF;

            -- === Running Wed (Week 5+) ===
            IF dow = 3 AND week_num >= 5 AND NOT skip_block THEN
                seq := seq + 1;

                desc_text := NULL;
                IF is_recent THEN
                    desc_text := CASE (day_offset % 4)
                        WHEN 0 THEN '3km走った。タイム18:30'
                        WHEN 1 THEN '坂道がきつい。でも走った後はスッキリ'
                        WHEN 2 THEN '2.5km。ちょっと短めだけどペースは良かった'
                        ELSE '3km完走。先週よりタイム30秒縮まった'
                    END;
                END IF;

                INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                    task_name, goal_id, goal_name, goal_color, tag_ids, description)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '10:05', d + TIME '10:28',
                    'ランニング', NULL, NULL, NULL,
                    NULL, desc_text
                );
            END IF;

        -- ============================================================
        -- WEEKEND ENTRIES
        -- ============================================================
        ELSE
            IF dow = 6 THEN
                IF week_num <= 4 THEN
                    -- Sporadic Saturday (skip some)
                    IF day_offset % 3 <> 0 AND NOT skip_block THEN
                        seq := seq + 1;
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '05:15', d + TIME '06:45',
                            t_handson, 'AWS ハンズオン（EC2 + VPC）', m_aws_base, 'AWS基礎理解', g1_id, g1_name, g1_color,
                            ARRAY[tag_cert], NULL
                        );
                    END IF;
                ELSE
                    -- Week 5-8: full Saturday
                    seq := seq + 1;

                    desc_text := NULL;
                    IF is_recent THEN
                        desc_text := CASE (day_offset % 3)
                            WHEN 0 THEN 'ELBの種類（ALB/NLB/CLB）の使い分けを整理'
                            WHEN 1 THEN 'Auto Scalingのステップスケーリングとターゲット追跡'
                            ELSE 'Lambda + API Gatewayのサーバーレスパターン'
                        END;
                    END IF;

                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '01:10', d + TIME '02:50',
                        CASE WHEN week_num <= 6 THEN t_udemy2 ELSE t_weak END,
                        CASE WHEN week_num <= 6 THEN 'Udemy AWS SAA講座' ELSE '弱点分野復習' END,
                        CASE WHEN week_num <= 6 THEN m_aws_base ELSE m_aws_mock END,
                        CASE WHEN week_num <= 6 THEN 'AWS基礎理解' ELSE '模擬試験70%以上' END,
                        g1_id, g1_name, g1_color,
                        ARRAY[tag_cert], desc_text
                    );
                    seq := seq + 1;

                    desc_text := NULL;
                    IF is_recent THEN
                        desc_text := CASE (day_offset % 3)
                            WHEN 0 THEN 'Click + SQLiteでCRUD実装。deleteコマンド完成'
                            WHEN 1 THEN 'リスト表示のフォーマットを改善。tabulate使った'
                            ELSE 'エラーハンドリング追加。ファイルが壊れた時の対応'
                        END;
                    END IF;

                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '05:10', d + TIME '06:50',
                        CASE WHEN week_num <= 6 THEN t_py2 ELSE t_cli_impl END,
                        CASE WHEN week_num <= 6 THEN 'Python入門書 後半' ELSE 'タスク管理CLI 実装' END,
                        CASE WHEN week_num <= 6 THEN m_py_base ELSE m_cli END,
                        CASE WHEN week_num <= 6 THEN 'Python基礎習得' ELSE 'CLIツールのMVP完成' END,
                        g2_id, g2_name, g2_color,
                        ARRAY[CASE WHEN week_num <= 6 THEN tag_learn ELSE tag_dev END], desc_text
                    );

                    -- Running Saturday
                    IF NOT skip_block THEN
                        seq := seq + 1;

                        desc_text := NULL;
                        IF is_recent THEN
                            desc_text := CASE (day_offset % 3)
                                WHEN 0 THEN '3.5km。土曜は距離を伸ばしてみた'
                                WHEN 1 THEN '3km。新しいコース発見。川沿いが気持ちいい'
                                ELSE '2.5km。昨日の筋肉痛が残ってて短めに'
                            END;
                        END IF;

                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '08:05', d + TIME '08:28',
                            'ランニング', NULL, NULL, NULL, NULL, desc_text
                        );
                    END IF;
                END IF;

                -- Mock exam
                IF week_num = 4 OR week_num = 7 THEN
                    seq := seq + 1;
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '08:10', d + TIME '09:20',
                        t_mock1, 'SAA模擬試験', m_aws_mock, '模擬試験70%以上', g1_id, g1_name, g1_color,
                        ARRAY[tag_cert],
                        CASE WHEN week_num = 4 THEN '結果: 52%。全然ダメだった...IAMとVPCが壊滅的'
                             ELSE '結果: 68%。かなり改善！あと少しで70%' END
                    );
                END IF;

            ELSE
                -- Sunday: mostly gaming, but Week 5+ adds study
                IF week_num >= 5 AND NOT skip_block THEN
                    seq := seq + 1;

                    desc_text := NULL;
                    IF is_recent THEN
                        desc_text := CASE (day_offset % 3)
                            WHEN 0 THEN 'TCP/IPの4層モデルを整理。OSIとの対応表作った'
                            WHEN 1 THEN 'SQLの結合（INNER JOIN, LEFT JOIN）問題3問'
                            ELSE 'プロジェクトマネジメントの問題。WBSとガントチャート'
                        END;
                    END IF;

                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '05:10', d + TIME '05:55',
                        t_ap_text, '応用情報テキスト読み込み', m_ap_am, '午前問題80%以上', g3_id, g3_name, g3_color,
                        ARRAY[tag_cert], desc_text
                    );
                END IF;
            END IF;
        END IF;

    END LOOP;

    RAISE NOTICE 'Takuya: Inserted % time entry operations', seq;
END $$;

-- ============================================================================
-- 今朝のエントリー（朝活）
-- ============================================================================

-- 今日の朝活: JST 06:35-07:08 = UTC 前日21:35-22:08
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
  uuid_generate_v4(),
  'd2222222-2222-2222-2222-222222222222',
  CURRENT_DATE - INTERVAL '1 day' + INTERVAL '21 hours 35 minutes',
  CURRENT_DATE - INTERVAL '1 day' + INTERVAL '22 hours 8 minutes',
  '朝活',
  'd2000003-0000-0000-0000-000000000000', '応用情報技術者取得', '#3B82F6',
  ARRAY['d20a0002-0000-0000-0000-000000000000', 'd20a0003-0000-0000-0000-000000000000']::uuid[],
  '応用情報の午前問題4問。データベースの正規化で1問ミス'
);

-- ============================================================================
-- イレギュラーエントリー（計画外の人間味ある実績）
-- ============================================================================

-- 1. ゲームしすぎて勉強ほぼ0分（CURRENT_DATE - 25, 平日夜）
-- 新シーズン始まってゲームに負けた日。21:00開始予定が22:30開始→22:45で力尽き
-- JST 22:30-22:45 = UTC 13:30-13:45
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'd2222222-2222-2222-2222-222222222222',
    (CURRENT_DATE - 25) + TIME '13:30', (CURRENT_DATE - 25) + TIME '13:45',
    'd2100003-0000-0000-0000-000000000000', 'Udemy AWS SAA講座 セクション6-10',
    'd2010001-0000-0000-0000-000000000000', 'AWS基礎理解',
    'd2000001-0000-0000-0000-000000000000', 'AWS SAA取得', '#F59E0B',
    ARRAY['d20a0003-0000-0000-0000-000000000000']::uuid[],
    'ゲームしすぎた反省。22:30から始めたけど15分で力尽きた。昨日分も取り返す'
);

-- 2. 先輩勉強会が盛り上がって延長（CURRENT_DATE - 16, 土曜）
-- 予定1時間→2.5時間に延長。S3とRDSの設計パターンをみっちり
-- JST 14:00-16:30 = UTC 05:00-07:30
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'd2222222-2222-2222-2222-222222222222',
    (CURRENT_DATE - 16) + TIME '05:00', (CURRENT_DATE - 16) + TIME '07:30',
    '先輩勉強会',
    'd2000001-0000-0000-0000-000000000000', 'AWS SAA取得', '#F59E0B',
    ARRAY['d20a0002-0000-0000-0000-000000000000', 'd20a0003-0000-0000-0000-000000000000']::uuid[],
    'VPCの設計パターンを教えてもらった。S3のライフサイクルポリシーを一緒に整理。予定1時間が2.5時間に'
);

-- 3. 模擬試験集中日（CURRENT_DATE - 10, 日曜）
-- 日曜午後に模擬試験2回目。JST 13:00-16:30 = UTC 04:00-07:30
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'd2222222-2222-2222-2222-222222222222',
    (CURRENT_DATE - 10) + TIME '04:00', (CURRENT_DATE - 10) + TIME '07:30',
    'd2100004-0000-0000-0000-000000000000', 'SAA模擬試験',
    'd2010002-0000-0000-0000-000000000000', '模擬試験70%以上',
    'd2000001-0000-0000-0000-000000000000', 'AWS SAA取得', '#F59E0B',
    ARRAY['d20a0003-0000-0000-0000-000000000000']::uuid[],
    '模擬試験2回目68%！前回52%から16ポイント改善。S3とRDSがまだ弱い。見直しに1時間かけた'
);

-- 4. ランニング後の超集中（CURRENT_DATE - 7, 水曜）
-- ランニング後にAWS勉強。普段30分のところ1.5時間やった
-- JST 21:00-22:30 = UTC 12:00-13:30
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'd2222222-2222-2222-2222-222222222222',
    (CURRENT_DATE - 7) + TIME '12:00', (CURRENT_DATE - 7) + TIME '13:30',
    'd2100005-0000-0000-0000-000000000000', '弱点分野復習',
    'd2010002-0000-0000-0000-000000000000', '模擬試験70%以上',
    'd2000001-0000-0000-0000-000000000000', 'AWS SAA取得', '#F59E0B',
    ARRAY['d20a0003-0000-0000-0000-000000000000']::uuid[],
    'ランニング後にゾーン入った。S3ストレージクラス全部覚えた。普段30分が1.5時間に'
);

-- 5. 朝寝坊リカバリー（CURRENT_DATE - 4）
-- アラーム聞こえず朝活失敗。夜に30分延長して対応
-- JST 22:00-22:35 = UTC 13:00-13:35
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'd2222222-2222-2222-2222-222222222222',
    (CURRENT_DATE - 4) + TIME '13:00', (CURRENT_DATE - 4) + TIME '13:35',
    'd2100010-0000-0000-0000-000000000000', '応用情報 過去問 午前',
    'd2030001-0000-0000-0000-000000000000', '午前問題80%以上',
    'd2000003-0000-0000-0000-000000000000', '応用情報技術者取得', '#3B82F6',
    ARRAY['d20a0002-0000-0000-0000-000000000000', 'd20a0003-0000-0000-0000-000000000000']::uuid[],
    'アラーム聞こえず朝活失敗。夜に30分延長してリカバリー。午前問題3問解いた'
);
