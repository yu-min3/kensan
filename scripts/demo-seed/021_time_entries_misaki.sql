-- ============================================================================
-- Demo Seed: Time Entries — 鈴木美咲 (~240件)
-- ============================================================================
-- 計画の約85%を実行。夜型なので夜のブロックは高完了率。
-- 週末の午前は寝坊でスキップすることがある。

DO $$
DECLARE
    base_date DATE := CURRENT_DATE - 56;
    d DATE;
    day_offset INT;
    dow INT;
    week_num INT;
    seq INT := 0;
    skip_weekend_morning BOOLEAN;
    skip_evening BOOLEAN;

    uid UUID := 'd1111111-1111-1111-1111-111111111111';

    g1_id UUID := 'd1000001-0000-0000-0000-000000000000';
    g1_name TEXT := 'フロントエンド力強化';
    g1_color TEXT := '#8B5CF6';
    g2_id UUID := 'd1000002-0000-0000-0000-000000000000';
    g2_name TEXT := '副業で個人開発';
    g2_color TEXT := '#EC4899';
    g3_id UUID := 'd1000003-0000-0000-0000-000000000000';
    g3_name TEXT := '技術ブログ月2本';
    g3_color TEXT := '#F97316';

    m_react UUID := 'd1010001-0000-0000-0000-000000000000';
    m_nextjs UUID := 'd1010002-0000-0000-0000-000000000000';
    m_test UUID := 'd1010003-0000-0000-0000-000000000000';
    m_portfolio UUID := 'd1020001-0000-0000-0000-000000000000';
    m_freelance UUID := 'd1020002-0000-0000-0000-000000000000';
    m_zenn4 UUID := 'd1030001-0000-0000-0000-000000000000';

    t_react_tut UUID := 'd1100001-0000-0000-0000-000000000000';
    t_hooks UUID := 'd1100002-0000-0000-0000-000000000000';
    t_zustand UUID := 'd1100003-0000-0000-0000-000000000000';
    t_approuter UUID := 'd1100004-0000-0000-0000-000000000000';
    t_sc UUID := 'd1100005-0000-0000-0000-000000000000';
    t_route UUID := 'd1100006-0000-0000-0000-000000000000';
    t_jest UUID := 'd1100007-0000-0000-0000-000000000000';
    t_rtl UUID := 'd1100008-0000-0000-0000-000000000000';
    t_pf_design UUID := 'd1100009-0000-0000-0000-000000000000';
    t_pf_impl UUID := 'd1100010-0000-0000-0000-000000000000';
    t_vercel UUID := 'd1100011-0000-0000-0000-000000000000';
    t_crowd UUID := 'd1100012-0000-0000-0000-000000000000';
    t_apply UUID := 'd1100013-0000-0000-0000-000000000000';
    t_zenn1 UUID := 'd1100014-0000-0000-0000-000000000000';
    t_zenn2 UUID := 'd1100015-0000-0000-0000-000000000000';

    tag_dev UUID := 'd10a0001-0000-0000-0000-000000000000';
    tag_learn UUID := 'd10a0002-0000-0000-0000-000000000000';
    tag_blog UUID := 'd10a0003-0000-0000-0000-000000000000';
    tag_freelance UUID := 'd10a0004-0000-0000-0000-000000000000';

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

        skip_weekend_morning := (day_offset % 5 = 0);
        skip_evening := (day_offset % 13 = 0);

        -- Pseudo-random jitter using multiple factors (-15 to +15 min range for start)
        jitter_start := ((day_offset * 7 + dow * 13 + week_num * 3) % 31) - 15;
        -- Independent end jitter (-10 to +25 min range)
        jitter_end := ((day_offset * 11 + dow * 7 + week_num * 17) % 36) - 10;

        -- ============================================================
        -- WEEKDAY ENTRIES
        -- ============================================================
        IF dow BETWEEN 1 AND 5 THEN

            -- === Lunch reading (90% completion) ===
            IF day_offset % 10 <> 0 THEN
                seq := seq + 1;

                desc_text := NULL;
                IF is_recent THEN
                    desc_text := CASE (day_offset % 5)
                        WHEN 0 THEN 'Zennのトレンド記事。RSCの解説が分かりやすかった'
                        WHEN 1 THEN 'QiitaのTailwind記事。clsxとtwMergeの組み合わせメモ'
                        WHEN 2 THEN 'uhyoさんのTypeScript記事。型パズル系は読むだけでも勉強になる'
                        WHEN 3 THEN 'Next.js公式ブログのApp Router更新情報チェック'
                        ELSE 'Dan AbramovのReact解説記事。英語だけど図が分かりやすい'
                    END;
                END IF;

                INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                    task_name, goal_id, goal_name, goal_color, tag_ids, description)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '03:15' + ((jitter_start/2) || ' minutes')::INTERVAL,
                    d + TIME '03:28' + ((jitter_end/2) || ' minutes')::INTERVAL,
                    'Zenn/Qiitaの記事読む', NULL, NULL, NULL,
                    ARRAY[tag_learn], desc_text
                );
            END IF;

            -- === Evening block 1: 22:00-23:30 JST (high completion ~90%) ===
            IF NOT skip_evening THEN
                seq := seq + 1;

                -- Recent descriptions for evening learning
                desc_text := NULL;
                IF is_recent THEN
                    IF week_num >= 7 AND dow <= 2 THEN
                        desc_text := CASE (day_offset % 5)
                            WHEN 0 THEN 'App Router入門記事の構成を整理'
                            WHEN 1 THEN 'コードブロックの説明文を推敲'
                            WHEN 2 THEN 'Zenn記事の下書きプレビュー確認。画像を追加'
                            WHEN 3 THEN 'App Routerのキャッシュ挙動について追記'
                            ELSE 'Zenn CLIでローカルプレビュー。レイアウト微調整'
                        END;
                    ELSIF week_num >= 7 AND dow <= 4 THEN
                        desc_text := CASE (day_offset % 4)
                            WHEN 0 THEN 'Conditional Typesが難しい'
                            WHEN 1 THEN 'Mapped Typesを理解した'
                            WHEN 2 THEN 'テストランナーの設定ファイルで10分ハマった'
                            ELSE 'RTLのfireEventとuserEventの違いを整理'
                        END;
                    ELSIF week_num = 6 THEN
                        desc_text := CASE (day_offset % 3)
                            WHEN 0 THEN 'ポートフォリオのHeroセクション実装完了'
                            WHEN 1 THEN 'レスポンシブ対応のブレークポイント調整'
                            ELSE '副業案件の最終修正。CSSアニメーション追加'
                        END;
                    END IF;
                END IF;

                IF week_num <= 2 THEN
                    IF day_offset % 2 = 0 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '13:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '14:28' + (jitter_end || ' minutes')::INTERVAL,
                            t_react_tut, 'React公式チュートリアル完走', m_react, 'React基礎固め', g1_id, g1_name, g1_color,
                            ARRAY[tag_learn], desc_text
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '13:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '14:25' + (jitter_end || ' minutes')::INTERVAL,
                            t_hooks, 'hooks徹底理解', m_react, 'React基礎固め', g1_id, g1_name, g1_color,
                            ARRAY[tag_learn], desc_text
                        );
                    END IF;
                ELSIF week_num <= 4 THEN
                    IF dow <= 3 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '13:03' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '14:30' + (jitter_end || ' minutes')::INTERVAL,
                            t_approuter, 'App Router基礎', m_nextjs, 'Next.js App Router習得', g1_id, g1_name, g1_color,
                            ARRAY[tag_learn], desc_text
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '13:03' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '14:28' + (jitter_end || ' minutes')::INTERVAL,
                            t_sc, 'Server Components vs Client Components', m_nextjs, 'Next.js App Router習得', g1_id, g1_name, g1_color,
                            ARRAY[tag_learn], desc_text
                        );
                    END IF;
                ELSIF week_num <= 6 THEN
                    IF dow <= 3 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '13:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '14:35' + (jitter_end || ' minutes')::INTERVAL,
                            t_pf_impl, 'ポートフォリオ実装', m_portfolio, 'ポートフォリオサイト完成', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev, tag_freelance], desc_text
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '13:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '14:20' + (jitter_end || ' minutes')::INTERVAL,
                            t_apply, '副業案件応募', m_freelance, '副業案件1件獲得', g2_id, g2_name, g2_color,
                            ARRAY[tag_freelance], desc_text
                        );
                    END IF;
                ELSE
                    IF dow <= 2 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '13:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '14:25' + (jitter_end || ' minutes')::INTERVAL,
                            t_zenn2, 'Zenn記事②: Next.js App Router入門', m_zenn4, 'Zenn 4記事公開', g3_id, g3_name, g3_color,
                            ARRAY[tag_blog], desc_text
                        );
                    ELSIF dow <= 4 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '13:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '14:22' + (jitter_end || ' minutes')::INTERVAL,
                            t_jest, 'Jest基礎', m_test, 'テスト駆動開発入門', g1_id, g1_name, g1_color,
                            ARRAY[tag_learn], desc_text
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '13:05' + (jitter_start || ' minutes')::INTERVAL,
                            d + TIME '14:20' + (jitter_end || ' minutes')::INTERVAL,
                            t_rtl, 'React Testing Library', m_test, 'テスト駆動開発入門', g1_id, g1_name, g1_color,
                            ARRAY[tag_learn], desc_text
                        );
                    END IF;
                END IF;
            END IF;

            -- === Evening block 2 (when planned) ===
            IF week_num <= 2 AND dow <= 3 AND NOT skip_evening THEN
                seq := seq + 1;
                INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                VALUES (
                    uuid_generate_v4(), uid,
                    d + TIME '14:32' + (jitter_start || ' minutes')::INTERVAL,
                    d + TIME '14:58' + (jitter_end || ' minutes')::INTERVAL,
                    t_zenn1, 'Zenn記事①: jQueryからReactへ', m_zenn4, 'Zenn 4記事公開', g3_id, g3_name, g3_color,
                    ARRAY[tag_blog], CASE WHEN is_recent THEN 'jQueryからReactへの移行体験を執筆中。コード例を追加' ELSE NULL END
                );
            ELSIF week_num BETWEEN 3 AND 4 AND dow <= 3 AND NOT skip_evening AND day_offset % 3 <> 0 THEN
                seq := seq + 1;
                IF dow <= 2 THEN
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '14:32' + (jitter_start || ' minutes')::INTERVAL,
                        d + TIME '14:55' + (jitter_end || ' minutes')::INTERVAL,
                        t_zustand, 'Zustand でグローバルstate管理', m_react, 'React基礎固め', g1_id, g1_name, g1_color,
                        ARRAY[tag_learn], CASE WHEN is_recent THEN 'useCallbackの使い所が分かってきた' ELSE NULL END
                    );
                ELSE
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '14:32' + (jitter_start || ' minutes')::INTERVAL,
                        d + TIME '14:55' + (jitter_end || ' minutes')::INTERVAL,
                        t_pf_design, 'ポートフォリオデザイン', m_portfolio, 'ポートフォリオサイト完成', g2_id, g2_name, g2_color,
                        ARRAY[tag_dev, tag_freelance], CASE WHEN is_recent THEN 'Figmaでワイヤーフレーム作成。shadcn/uiのコンポーネント選定' ELSE NULL END
                    );
                END IF;
            END IF;

        -- ============================================================
        -- WEEKEND ENTRIES
        -- ============================================================
        ELSE
            IF dow = 6 THEN
                -- Saturday morning (skip sometimes due to oversleeping)
                IF NOT skip_weekend_morning THEN
                    seq := seq + 1;
                    IF week_num <= 2 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '01:10', d + TIME '03:50',
                            t_react_tut, 'React公式チュートリアル完走', m_react, 'React基礎固め', g1_id, g1_name, g1_color,
                            ARRAY[tag_learn],
                            CASE WHEN is_recent THEN 'チュートリアル完走！三目並べゲームが動いた' ELSE NULL END
                        );
                    ELSIF week_num <= 6 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '01:10', d + TIME '03:55',
                            t_pf_impl, 'ポートフォリオ実装', m_portfolio, 'ポートフォリオサイト完成', g2_id, g2_name, g2_color,
                            ARRAY[tag_dev, tag_freelance],
                            CASE WHEN is_recent THEN 'ポートフォリオのProjectsセクション実装。カードUIいい感じ' ELSE NULL END
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '01:10', d + TIME '03:45',
                            t_zenn2, 'Zenn記事②: Next.js App Router入門', m_zenn4, 'Zenn 4記事公開', g3_id, g3_name, g3_color,
                            ARRAY[tag_blog],
                            CASE WHEN is_recent THEN 'App Router記事のServer Components解説セクション完成' ELSE NULL END
                        );
                    END IF;
                END IF;

                -- Saturday afternoon (when planned, Week 3+)
                IF week_num >= 3 THEN
                    seq := seq + 1;
                    IF week_num <= 6 THEN
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '05:10', d + TIME '06:20',
                            t_crowd, 'クラウドソーシング登録・案件探し', m_freelance, '副業案件1件獲得', g2_id, g2_name, g2_color,
                            ARRAY[tag_freelance],
                            CASE WHEN is_recent THEN 'LP案件の提案文を作成。実績にZenn記事リンクを添付' ELSE NULL END
                        );
                    ELSE
                        INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                            task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                        VALUES (
                            uuid_generate_v4(), uid,
                            d + TIME '05:10', d + TIME '06:15',
                            t_jest, 'Jest基礎', m_test, 'テスト駆動開発入門', g1_id, g1_name, g1_color,
                            ARRAY[tag_learn],
                            CASE WHEN is_recent THEN 'describe/it/expectの基本パターンを写経' ELSE NULL END
                        );
                    END IF;
                END IF;

            ELSE
                -- Sunday afternoon study
                seq := seq + 1;

                desc_text := NULL;
                IF is_recent THEN
                    desc_text := CASE
                        WHEN week_num <= 4 THEN 'useRefでDOM参照する方法を理解。inputにfocusを当てるパターン'
                        WHEN week_num <= 6 THEN 'Route HandlersでGET/POSTを書いてみた。Express風で分かりやすい'
                        ELSE 'RSCの境界で30分ハマった'
                    END;
                END IF;

                IF week_num <= 4 THEN
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '05:05', d + TIME '05:52',
                        t_hooks, 'hooks徹底理解', m_react, 'React基礎固め', g1_id, g1_name, g1_color,
                        ARRAY[tag_learn], desc_text
                    );
                ELSE
                    INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
                        task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
                    VALUES (
                        uuid_generate_v4(), uid,
                        d + TIME '05:05', d + TIME '05:50',
                        t_route, 'Route Handlers で API 実装', m_nextjs, 'Next.js App Router習得', g1_id, g1_name, g1_color,
                        ARRAY[tag_learn], desc_text
                    );
                END IF;
            END IF;
        END IF;

    END LOOP;

    RAISE NOTICE 'Misaki: Inserted % time entry operations', seq;
END $$;


-- ============================================================================
-- 今日のエントリー（昼休み TypeScript型パズル）
-- ============================================================================
-- JST 12:20 = UTC 03:20, JST 12:48 = UTC 03:48
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime, description,
    task_name, goal_id, goal_name, goal_color, tag_ids)
VALUES (
    'd1e90001-0000-0000-0000-000000000000',
    'd1111111-1111-1111-1111-111111111111',
    CURRENT_DATE + INTERVAL '3 hours 20 minutes',
    CURRENT_DATE + INTERVAL '3 hours 48 minutes',
    'Utility Typesの復習。Partial<T>とRequired<T>の違いを整理',
    'TypeScript型パズル',
    'd1000001-0000-0000-0000-000000000000', 'フロントエンド力強化', '#8B5CF6',
    ARRAY['d10a0001-0000-0000-0000-000000000000', 'd10a0002-0000-0000-0000-000000000000']::uuid[]
);


-- ============================================================================
-- イレギュラーエントリー（計画外の人間味ある実績）
-- ============================================================================

-- 1. 副業クライアント急ぎ対応（CURRENT_DATE - 20, 平日夜）
-- LP修正の緊急依頼。計画はReact学習だったが急遽変更
-- JST 23:00-翌1:00 = UTC 14:00-16:00
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'd1111111-1111-1111-1111-111111111111',
    (CURRENT_DATE - 20) + TIME '14:00', (CURRENT_DATE - 20) + TIME '16:00',
    '副業LP修正（緊急）',
    'd1000002-0000-0000-0000-000000000000', '副業で個人開発', '#EC4899',
    ARRAY['d10a0001-0000-0000-0000-000000000000', 'd10a0004-0000-0000-0000-000000000000']::uuid[],
    'クライアントから「明日プレゼンなのでヘッダー画像を差し替えてほしい」と連絡。React学習を中断して対応。next/imageのサイズ指定でちょっとハマった'
);

-- 2. 推し活延長で開始遅延（CURRENT_DATE - 12, 金曜夜）
-- 推しの配信が延長して22:30スタート→23:45まで（短縮）
-- JST 22:30-23:45 = UTC 13:30-14:45
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'd1111111-1111-1111-1111-111111111111',
    (CURRENT_DATE - 12) + TIME '13:30', (CURRENT_DATE - 12) + TIME '14:45',
    'd1100007-0000-0000-0000-000000000000', 'Jest基礎',
    'd1010003-0000-0000-0000-000000000000', 'テスト駆動開発入門',
    'd1000001-0000-0000-0000-000000000000', 'フロントエンド力強化', '#8B5CF6',
    ARRAY['d10a0002-0000-0000-0000-000000000000']::uuid[],
    '推しの配信が30分延長して22:30スタートに。時間短めだけどdescribeの書き方は理解できた'
);

-- 3. フロー状態でZenn記事一気書き（CURRENT_DATE - 8, 週末）
-- 土曜22:00-翌2:00の4時間ぶっ通し
-- JST 22:00-翌2:00 = UTC 13:00-17:00
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'd1111111-1111-1111-1111-111111111111',
    (CURRENT_DATE - 8) + TIME '13:00', (CURRENT_DATE - 8) + TIME '17:00',
    'd1100015-0000-0000-0000-000000000000', 'Zenn記事②: Next.js App Router入門',
    'd1030001-0000-0000-0000-000000000000', 'Zenn 4記事公開',
    'd1000003-0000-0000-0000-000000000000', '技術ブログ月2本', '#F97316',
    ARRAY['d10a0003-0000-0000-0000-000000000000']::uuid[],
    '22時に書き始めたら止まらなくなって翌2時まで。App Routerの解説4000字。フロー状態すごい。でも明日起きられる気がしない'
);

-- 4. テスト挫折→30分で切り上げ（CURRENT_DATE - 6）
-- Jest理解できず30分でやめた
-- JST 22:00-22:30 = UTC 13:00-13:30
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'd1111111-1111-1111-1111-111111111111',
    (CURRENT_DATE - 6) + TIME '13:00', (CURRENT_DATE - 6) + TIME '13:30',
    'd1100007-0000-0000-0000-000000000000', 'Jest基礎',
    'd1010003-0000-0000-0000-000000000000', 'テスト駆動開発入門',
    'd1000001-0000-0000-0000-000000000000', 'フロントエンド力強化', '#8B5CF6',
    ARRAY['d10a0002-0000-0000-0000-000000000000']::uuid[],
    'モックの概念が全然入ってこない。jest.fnとjest.mockの違いが分からなくて30分で心折れた。明日またやる...'
);

-- 5. 週末カフェ作業（CURRENT_DATE - 3, 土曜昼）
-- スタバでポートフォリオ実装 3時間
-- JST 13:00-16:00 = UTC 04:00-07:00
INSERT INTO time_entries (id, user_id, start_datetime, end_datetime,
    task_id, task_name, milestone_id, milestone_name, goal_id, goal_name, goal_color, tag_ids, description)
VALUES (
    uuid_generate_v4(), 'd1111111-1111-1111-1111-111111111111',
    (CURRENT_DATE - 3) + TIME '04:00', (CURRENT_DATE - 3) + TIME '07:00',
    'd1100010-0000-0000-0000-000000000000', 'ポートフォリオ実装',
    'd1020001-0000-0000-0000-000000000000', 'ポートフォリオサイト完成',
    'd1000002-0000-0000-0000-000000000000', '副業で個人開発', '#EC4899',
    ARRAY['d10a0001-0000-0000-0000-000000000000', 'd10a0004-0000-0000-0000-000000000000']::uuid[],
    'スタバで3時間集中。カフェだと捗る。SkillsセクションとContactフォームが完成。あとはVercelデプロイだけ'
);
