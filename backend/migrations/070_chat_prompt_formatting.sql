-- 070: Improve information mode formatting rules in chat prompt
-- Adds emoji headings, conciseness rules for analysis/review responses.
-- Source of truth: kensan-ai/src/kensan_ai/agents/chat.py

UPDATE ai_contexts
SET system_prompt = REPLACE(
    system_prompt,
    E'1. **情報提供モード**（分析・振り返り・質問への回答）→ 見出し（##, ###）で構成OK',
    E'1. **情報提供モード**（分析・振り返り・質問への回答）→ 以下のフォーマットルールに従う:\n   - 見出しにはトピックに合った絵文字を先頭に付ける（例: 📊 分析, 🎯 目標, ⏰ スケジュール, 💡 洞察, 📈 進捗, ✅ 達成, ⚠️ 注意点, 📝 まとめ）\n   - 各セクションは2-3文以内。長い段落は書かない\n   - **重要な数値や結論は太字にする**\n   - 情報量が多い場合は箇条書き（短い項目）で整理する\n   - 全体で3-5セクションを目安にし、冗長にしない'
)
WHERE situation = 'chat'
  AND system_prompt LIKE '%情報提供モード%'
  AND system_prompt LIKE '%見出し（##, ###）で構成OK%';
