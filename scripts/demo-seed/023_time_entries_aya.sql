-- ============================================================================
-- Demo Seed: Time Entries — 高橋彩 (~260件)
-- ============================================================================
-- 朝型で規律が高い。計画の約90%を実行。
-- たまに猫の通院で朝活をスキップ。

DO $$
DECLARE
    base_date DATE := CURRENT_DATE - 56;
    d DATE;
    day_offset INT;
    dow INT;
    week_num INT;
    seq INT := 0;
    skip_morning BOOLEAN;

    uid UUID := 'd3333333-3333-3333-3333-333333333333';

    g1_id UUID := 'd3000001-0000-0000-0000-000000000000';
    g1_name TEXT := '1on1スキル向上';
    g1_color TEXT := '#8B5CF6';
    g2_id UUID := 'd3000002-0000-0000-0000-000000000000';
    g2_name TEXT := 'チーム生産性20%向上';
    g2_color TEXT := '#3B82F6';
    g3_id UUID := 'd3000003-0000-0000-0000-000000000000';
    g3_name TEXT := '月2冊ビジネス書読書';
    g3_color TEXT := '#10B981';

    m_1on1 UUID := 'd3010001-0000-0000-0000-000000000000';
    m_coach UUID := 'd3010002-0000-0000-0000-000000000000';
    m_survey UUID := 'd3010003-0000-0000-0000-000000000000';
    m_velocity UUID := 'd3020001-0000-0000-0000-000000000000';
    m_process UUID := 'd3020002-0000-0000-0000-000000000000';
    m_go UUID := 'd3020003-0000-0000-0000-000000000000';
    m_read4 UUID := 'd3030001-0000-0000-0000-000000000000';
    m_blog UUID := 'd3030002-0000-0000-0000-000000000000';

    t_1on1_tmpl UUID := 'd3100001-0000-0000-0000-000000000000';
    t_1on1_memo UUID := 'd3100002-0000-0000-0000-000000000000';
    t_grow UUID := 'd3100003-0000-0000-0000-000000000000';
    t_sbi UUID := 'd3100004-0000-0000-0000-000000000000';
    t_survey UUID := 'd3100005-0000-0000-0000-000000000000';
    t_jira UUID := 'd3100006-0000-0000-0000-000000000000';
    t_velocity UUID := 'd3100007-0000-0000-0000-000000000000';
    t_pr_review UUID := 'd3100008-0000-0000-0000-000000000000';
    t_daily UUID := 'd3100009-0000-0000-0000-000000000000';
    t_test UUID := 'd3100010-0000-0000-0000-000000000000';
    t_go_tour UUID := 'd3100011-0000-0000-0000-000000000000';
    t_go_api UUID := 'd3100012-0000-0000-0000-000000000000';
    t_em_book UUID := 'd3100013-0000-0000-0000-000000000000';
    t_high_output UUID := 'd3100014-0000-0000-0000-000000000000';
    t_blog_post UUID := 'd3100015-0000-0000-0000-000000000000';

    tag_mgmt UUID := 'd30a0001-0000-0000-0000-000000000000';
    tag_learn UUID := 'd30a0002-0000-0000-0000-000000000000';
    tag_read UUID := 'd30a0003-0000-0000-0000-000000000000';
    tag_tech UUID := 'd30a0004-0000-0000-0000-000000000000';
    tag_yoga UUID := 'd30a0005-0000-0000-0000-000000000000';

    -- Time jitter (minutes) — start and end independent (tighter than other personas: disciplined)
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

        skip_morning := (day_offset % 9 = 0);  -- ~11% skip (cat vet etc.)

        -- Pseudo-random jitter: tighter range for disciplined persona (-10 to +10 start, -8 to +16 end)
        jitter_start := ((day_offset * 7 + dow * 13 + week_num * 3) % 21) - 10;
        jitter_end := ((day_offset * 11 + dow * 7 + week_num * 17) % 25) - 8;

        -- ============================================================
        -- WEEKDAY ENTRIES
        -- ============================================================
        IF dow BETWEEN 1 AND 5 THEN

            -- === Early morning: 5:30-6:30 JST ===
            IF NOT skip_morning THEN
                seq := seq + 1;

                -- Recent descriptions for morning entries (朝活: 1on1準備/マネジメント or Go学習)
                desc_text := NULL;
                IF is_recent THEN
                    IF week_num >= 7 AND dow <= 2 THEN
                        -- Go学習 descriptions
                        desc_text := CASE (day_offset % 5)
                            WHEN 0 THEN 'goroutineのfan-out/fan-inパターン'
                            WHEN 1 THEN 'chi routerでミドルウェアを実装'
                            WHEN 2 THEN 'pgxでDBアクセスのサンプル作成'
                            WHEN 3 THEN 'Go interfaceの暗黙的実装パターンを整理'
                            ELSE 'net/httpのHandlerFuncでルーティング実装'
                        END;
                    ELSIF week_num >= 7 AND dow <= 4 THEN
                        -- 1on1準備/マネジメント descriptions
                        desc_text := CASE (day_offset % 5)
                            WHEN 0 THEN '新人のAさんへのフィードバック準備。SBIで整理'
                            WHEN 1 THEN 'スプリントレトロの改善案を考えた'
                            WHEN 2 THEN '委譲の計画書を作成中'
                            WHEN 3 THEN 'メンバーBのキャリア面談の準備。次のステップを一緒に考えたい'
                            ELSE 'アンケート項目の最終調整。自由記述欄を追加'
                        END;
                    ELSE
                        desc_text := CASE (day_offset % 4)
                            WHEN 0 THEN '1on1メモの振り返り。前回のアクション進捗を確認'
                            WHEN 1 THEN 'GROWモデルで質問リストを更新'
                            WHEN 2 THEN 'PRレビューのメトリクスをJiraで確認'
                            ELSE 'HIGH OUTPUT MANAGEMENTのレバレッジ章を実践に落とし込み'
                        END;
                    END IF;
                END IF;

                IF week_num <= 2 THEN
                    IF dow <= 3 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '20:32' + (jitter_start || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:28' + (jitter_end || ' minutes')::INTERVAL,
                            t_1on1_tmpl, '1on1テンプレート作成', m_1on1, '1on1テンプレート確立', g1_id, g1_name, g1_color,
                            ARRAY[tag_mgmt], desc_text
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '20:32' + (jitter_start || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:25' + (jitter_end || ' minutes')::INTERVAL,
                            t_1on1_memo, 'メンバー5人分の1on1メモ整理', m_1on1, '1on1テンプレート確立', g1_id, g1_name, g1_color,
                            ARRAY[tag_mgmt], desc_text
                        );
                    END IF;
                ELSIF week_num <= 4 THEN
                    IF dow <= 2 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '20:32' + (jitter_start || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:28' + (jitter_end || ' minutes')::INTERVAL,
                            t_grow, 'GROWモデル学習', m_coach, 'コーチング手法の実践', g1_id, g1_name, g1_color,
                            ARRAY[tag_mgmt, tag_learn], desc_text
                        );
                    ELSIF dow <= 4 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '20:32' + (jitter_start || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:30' + (jitter_end || ' minutes')::INTERVAL,
                            t_jira, 'Jiraダッシュボード構築', m_velocity, 'ベロシティ可視化', g2_id, g2_name, g2_color,
                            ARRAY[tag_mgmt, tag_tech], desc_text
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '20:32' + (jitter_start || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:25' + (jitter_end || ' minutes')::INTERVAL,
                            t_pr_review, 'PR レビュー待ち時間の短縮施策', m_process, '開発プロセス改善3施策', g2_id, g2_name, g2_color,
                            ARRAY[tag_mgmt], desc_text
                        );
                    END IF;
                ELSIF week_num <= 6 THEN
                    IF dow <= 2 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '20:32' + (jitter_start || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:28' + (jitter_end || ' minutes')::INTERVAL,
                            t_daily, 'デイリースクラム改善', m_process, '開発プロセス改善3施策', g2_id, g2_name, g2_color,
                            ARRAY[tag_mgmt], desc_text
                        );
                    ELSIF dow <= 4 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '20:32' + (jitter_start || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:30' + (jitter_end || ' minutes')::INTERVAL,
                            t_go_tour, 'Go Tour完走', m_go, 'Go学習再開', g2_id, g2_name, g2_color,
                            ARRAY[tag_tech, tag_learn], desc_text
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '20:32' + (jitter_start || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:25' + (jitter_end || ' minutes')::INTERVAL,
                            t_sbi, 'SBIフィードバック実践', m_coach, 'コーチング手法の実践', g1_id, g1_name, g1_color,
                            ARRAY[tag_mgmt], desc_text
                        );
                    END IF;
                ELSE
                    IF dow <= 2 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '20:32' + (jitter_start || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:30' + (jitter_end || ' minutes')::INTERVAL,
                            t_go_api, 'Goで小さなAPIを作る', m_go, 'Go学習再開', g2_id, g2_name, g2_color,
                            ARRAY[tag_tech, tag_learn], desc_text
                        );
                    ELSIF dow <= 4 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '20:32' + (jitter_start || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:28' + (jitter_end || ' minutes')::INTERVAL,
                            t_survey, 'アンケート項目設計', m_survey, 'メンバー満足度調査実施', g1_id, g1_name, g1_color,
                            ARRAY[tag_mgmt], desc_text
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '20:32' + (jitter_start || ' minutes')::INTERVAL,
                            (d - INTERVAL '1 day') + TIME '21:25' + (jitter_end || ' minutes')::INTERVAL,
                            t_blog_post, '読書メモ記事1本目 公開', m_blog, '読書メモを社内ブログで共有', g3_id, g3_name, g3_color,
                            ARRAY[tag_read], desc_text
                        );
                    END IF;
                END IF;
            END IF;

            -- === Yoga Mon/Wed/Fri (85% completion) ===
            IF dow IN (1, 3, 5) AND NOT skip_morning AND day_offset % 7 <> 0 THEN
                seq := seq + 1;

                desc_text := NULL;
                IF is_recent THEN
                    desc_text := CASE (day_offset % 5)
                        WHEN 0 THEN '肩甲骨周りを重点的に'
                        WHEN 1 THEN '瞑想10分追加。頭がクリアに'
                        WHEN 2 THEN '股関節の柔軟性が上がってきた'
                        WHEN 3 THEN '太陽礼拝を丁寧に。呼吸を意識'
                        ELSE '体幹トレーニング多め。プランク2分達成'
                    END;
                END IF;

                INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                    task_name, goal_id, goal_name, goal_color, tag_ids, description)
                VALUES (
                    uuid_generate_v4(), uid,
                    (d - INTERVAL '1 day') + TIME '21:32' + (jitter_start || ' minutes')::INTERVAL,
                    (d - INTERVAL '1 day') + TIME '21:58' + (jitter_end || ' minutes')::INTERVAL,
                    'ヨガ', NULL, NULL, NULL,
                    ARRAY[tag_yoga], desc_text
                );
            END IF;

            -- === Lunch reading (95% completion) ===
            IF day_offset % 20 <> 0 THEN
                seq := seq + 1;

                desc_text := NULL;
                IF is_recent THEN
                    IF week_num <= 3 THEN
                        desc_text := CASE (day_offset % 4)
                            WHEN 0 THEN '委譲の章。マイクロマネジメントしない勇気'
                            WHEN 1 THEN '1on1の技術の章。アジェンダはメンバー主導'
                            WHEN 2 THEN 'チームの健康の章。心理的安全性が最優先'
                            ELSE 'キャリア面談の進め方。3年後のビジョンを聞く'
                        END;
                    ELSE
                        desc_text := CASE (day_offset % 5)
                            WHEN 0 THEN 'HIGH OUTPUT MANAGEMENTのミーティング章'
                            WHEN 1 THEN 'レバレッジの考え方が刺さった'
                            WHEN 2 THEN 'プロセス型とミッション型の使い分け'
                            WHEN 3 THEN 'マネージャーのアウトプット=チームのアウトプット'
                            ELSE '指標の選び方。先行指標と遅行指標'
                        END;
                    END IF;
                END IF;

                IF week_num <= 3 THEN
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '03:16' + ((jitter_start/2) || ' minutes')::INTERVAL,
                        d + TIME '03:44' + ((jitter_end/2) || ' minutes')::INTERVAL,
                        t_em_book, 'エンジニアリングマネージャーのしごと 読了', m_read4, '2ヶ月で4冊読了', g3_id, g3_name, g3_color,
                        ARRAY[tag_read], desc_text
                    );
                ELSE
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '03:16' + ((jitter_start/2) || ' minutes')::INTERVAL,
                        d + TIME '03:44' + ((jitter_end/2) || ' minutes')::INTERVAL,
                        t_high_output, 'HIGH OUTPUT MANAGEMENT 読了', m_read4, '2ヶ月で4冊読了', g3_id, g3_name, g3_color,
                        ARRAY[tag_read], desc_text
                    );
                END IF;
            END IF;

            -- === Evening reflection (recent weeks only, ~60% completion) ===
            IF is_recent AND dow IN (1, 3, 5) AND day_offset % 3 <> 0 THEN
                seq := seq + 1;

                desc_text := CASE (day_offset % 5)
                    WHEN 0 THEN 'メンバーBのPR品質が上がってきた'
                    WHEN 1 THEN '1on1の録音を聞き直して改善点を発見'
                    WHEN 2 THEN '今日のデイリーは全員2分以内で終わった。改善効果あり'
                    WHEN 3 THEN 'Cさんが自発的にテスト追加してくれた。委譲の成果？'
                    ELSE '今週のベロシティが先週比+15%。PRレビュー改善が効いてる'
                END;

                INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                    task_name, goal_id, goal_name, goal_color, tag_ids, description)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '11:30' + (jitter_start || ' minutes')::INTERVAL,
                    d + TIME '11:50' + (jitter_end || ' minutes')::INTERVAL,
                    '夜の振り返り', g2_id, g2_name, g2_color,
                    ARRAY[tag_mgmt], desc_text
                );
            END IF;

        -- ============================================================
        -- WEEKEND ENTRIES
        -- ============================================================
        ELSE
            IF dow = 6 THEN
                -- Saturday morning learning
                IF NOT skip_morning THEN
                    seq := seq + 1;
                    IF week_num <= 4 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '21:05', (d - INTERVAL '1 day') + TIME '22:55',
                            t_velocity, 'ベロシティレポート自動化', m_velocity, 'ベロシティ可視化', g2_id, g2_name, g2_color,
                            ARRAY[tag_mgmt, tag_tech], NULL
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            (d - INTERVAL '1 day') + TIME '21:05', (d - INTERVAL '1 day') + TIME '22:50',
                            CASE WHEN week_num <= 6 THEN t_go_tour ELSE t_go_api END,
                            CASE WHEN week_num <= 6 THEN 'Go Tour完走' ELSE 'Goで小さなAPIを作る' END,
                            m_go, 'Go学習再開', g2_id, g2_name, g2_color,
                            ARRAY[tag_tech, tag_learn], NULL
                        );
                    END IF;
                END IF;

            ELSE
                -- Sunday yoga + reading
                IF NOT skip_morning THEN
                    seq := seq + 1;
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        (d - INTERVAL '1 day') + TIME '21:05', (d - INTERVAL '1 day') + TIME '21:32',
                        'ヨガ', NULL, NULL, NULL,
                        ARRAY[tag_yoga], NULL
                    );
                END IF;

                seq := seq + 1;
                IF week_num <= 3 THEN
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        (d - INTERVAL '1 day') + TIME '21:35', (d - INTERVAL '1 day') + TIME '22:55',
                        t_em_book, 'エンジニアリングマネージャーのしごと 読了', m_read4, '2ヶ月で4冊読了', g3_id, g3_name, g3_color,
                        ARRAY[tag_read], NULL
                    );
                ELSE
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        (d - INTERVAL '1 day') + TIME '21:35', (d - INTERVAL '1 day') + TIME '22:50',
                        t_high_output, 'HIGH OUTPUT MANAGEMENT 読了', m_read4, '2ヶ月で4冊読了', g3_id, g3_name, g3_color,
                        ARRAY[tag_read], NULL
                    );
                END IF;
            END IF;
        END IF;

    END LOOP;

    RAISE NOTICE 'Aya: Inserted % time entry operations', seq;
END $$;


-- ============================================================================
-- 今朝のエントリー
-- ============================================================================

-- 今朝の朝活: 1on1準備（JST 05:32-06:28 = UTC 前日20:32-21:28）
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
  uuid_generate_v4(),
  'd3333333-3333-3333-3333-333333333333',
  CURRENT_DATE - INTERVAL '1 day' + INTERVAL '20 hours 32 minutes',
  CURRENT_DATE - INTERVAL '1 day' + INTERVAL '21 hours 28 minutes',
  '1on1準備・振り返り',
  'd3000001-0000-0000-0000-000000000000', '1on1スキル向上', '#8B5CF6',
  ARRAY['d30a0001-0000-0000-0000-000000000000', 'd30a0002-0000-0000-0000-000000000000']::uuid[],
  'メンバー満足度調査のアンケート項目を最終確認。来週実施予定'
);

-- 今朝のヨガ（JST 06:30-06:58 = UTC 前日21:30-21:58）
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_name, tag_ids, description)
VALUES (
  uuid_generate_v4(),
  'd3333333-3333-3333-3333-333333333333',
  CURRENT_DATE - INTERVAL '1 day' + INTERVAL '21 hours 30 minutes',
  CURRENT_DATE - INTERVAL '1 day' + INTERVAL '21 hours 58 minutes',
  'ヨガ',
  ARRAY['d30a0005-0000-0000-0000-000000000000']::uuid[],
  '朝ヨガ。股関節の柔軟性が上がってきた'
);


-- ============================================================================
-- イレギュラーエントリー（計画外の人間味ある実績）
-- ============================================================================

-- 1. 猫の通院で朝活スキップ（CURRENT_DATE - 15）
-- 朝活なし、代わりに昼休み延長して1on1準備
-- JST 12:00-12:50 = UTC 03:00-03:50
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'd3333333-3333-3333-3333-333333333333',
    (CURRENT_DATE - 15) + TIME '03:00', (CURRENT_DATE - 15) + TIME '03:50',
    '1on1準備（昼休み延長）',
    'd3000001-0000-0000-0000-000000000000', '1on1スキル向上', '#8B5CF6',
    ARRAY['d30a0001-0000-0000-0000-000000000000']::uuid[],
    'ミケの通院で朝活スキップ。昼休みを延長して1on1準備。メンバーDのフィードバック整理'
);

-- 2. メンバーの相談で夜延長（CURRENT_DATE - 11, 平日夜）
-- 計画にない1on1。メンバーが悩んでいて JST 21:00-22:30 = UTC 12:00-13:30
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'd3333333-3333-3333-3333-333333333333',
    (CURRENT_DATE - 11) + TIME '12:00', (CURRENT_DATE - 11) + TIME '13:30',
    '臨時1on1（メンバーEの相談）',
    'd3000001-0000-0000-0000-000000000000', '1on1スキル向上', '#8B5CF6',
    ARRAY['d30a0001-0000-0000-0000-000000000000']::uuid[],
    'メンバーEがキャリアで悩んでいてZoomで相談。GROWモデルで話を聞いた。「話せてよかった」と言ってもらえた'
);

-- 3. Go学習フロー状態（CURRENT_DATE - 6, 週末土曜朝）
-- GoのAPI実装が楽しくて3時間ぶっ通し JST 06:05-09:10 = UTC 前日21:05-00:10
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'd3333333-3333-3333-3333-333333333333',
    (CURRENT_DATE - 7) + TIME '21:05', (CURRENT_DATE - 6) + TIME '00:10',
    'd3100012-0000-0000-0000-000000000000', 'Goで小さなAPIを作る',
    'd3020003-0000-0000-0000-000000000000', 'Go学習再開',
    'd3000002-0000-0000-0000-000000000000', 'チーム生産性20%向上', '#3B82F6',
    ARRAY['d30a0004-0000-0000-0000-000000000000', 'd30a0002-0000-0000-0000-000000000000']::uuid[],
    'chi routerでCRUD API実装が楽しくて3時間。ミドルウェアチェーンの仕組みが腑に落ちた'
);

-- 4. 採用面接対応（CURRENT_DATE - 3, 平日）
-- 急な採用面接が入って朝活が15分に短縮 JST 05:30-05:45 = UTC 前日20:30-20:45
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'd3333333-3333-3333-3333-333333333333',
    (CURRENT_DATE - 4) + TIME '20:30', (CURRENT_DATE - 4) + TIME '20:45',
    'アンケート項目確認（短縮版）',
    'd3000001-0000-0000-0000-000000000000', '1on1スキル向上', '#8B5CF6',
    ARRAY['d30a0001-0000-0000-0000-000000000000']::uuid[],
    '急な採用面接が入って朝活15分に短縮。アンケートの質問文だけ見直した'
);

-- 5. パートナーとの朝食で遅延（CURRENT_DATE - 9）
-- パートナーの誕生日で朝食を一緒に。朝活開始が6:15に。短縮版30分
-- JST 06:15-06:45 = UTC 前日21:15-21:45
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'd3333333-3333-3333-3333-333333333333',
    (CURRENT_DATE - 10) + TIME '21:15', (CURRENT_DATE - 10) + TIME '21:45',
    'd3100012-0000-0000-0000-000000000000', 'Goで小さなAPIを作る',
    'd3020003-0000-0000-0000-000000000000', 'Go学習再開',
    'd3000002-0000-0000-0000-000000000000', 'チーム生産性20%向上', '#3B82F6',
    ARRAY['d30a0004-0000-0000-0000-000000000000', 'd30a0002-0000-0000-0000-000000000000']::uuid[],
    'パートナーの誕生日で朝食を一緒に。朝活6:15開始の短縮版。Goのerrorハンドリングだけ復習'
);
