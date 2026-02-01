# Weekly Review トークン分析 (trace: 440f2e1ea00f...)

## サマリー

| 指標 | 値 |
|------|-----|
| 合計時間 | 99.8s |
| 合計 input tokens | 54,097 |
| 合計 output tokens | 1,719 |
| ターン数 | 5 |
| 429 エラー | 2回 (Turn 4, 5) |
| 429 待ち時間 | ~63s (19s + 44s) |
| 実質 API + ツール時間 | ~12s |

## 1日の合計 Usage (2026-01-31)

| 指標 | 値 |
|------|-----|
| input tokens | 1,265,688 |
| output tokens | 14,895 |

→ このレビュー1回（54,097 input）は1日の約4.3%。
  複数回テストしていれば相当なトークン消費。

---

## ターン別トークン推移

| Turn | input | output | ツール | 時間 | 備考 |
|------|-------|--------|--------|------|------|
| 1 | 7,830 | 143 | get_analytics_summary | 2.8s | |
| 2 | 8,280 | 86 | get_time_entries | 2.4s | |
| 3 | 11,309 | 71 | get_tasks | 2.3s | |
| 4 | 12,347 | 70 | get_notes | 22.0s | 429 → 19s 待ち |
| 5 | 14,331 | 1,349 | (出力のみ) | 70.3s | 429 → 44s 待ち |

**入力トークンがターンごとに増加**: 会話履歴にツール結果が蓄積されるため。
Turn 5 の 14,331 tokens は Turn 1 の 7,830 の約1.8倍。

---

## システムプロンプト内容 (Turn 1 時点: ~7,830 tokens の一部)

```
あなたはKensanアプリのAIアシスタントです。
ユーザーのタスク管理・時間計画・目標管理・学習記録・振り返りを支援します。

## 現在の日時
2026-01-31（土）22:19 JST

## ユーザー情報
（ユーザー情報なし）

## 今週のサマリー
期間: 2026-01-26 〜 2026-02-01
総稼働: 10.5h
目標別:
- Kensanリリース: 8.6h
- KubeCon登壇: 1.4h
- 健康: 0.5h

## 目標進捗
【Kensanリリース】
  ○ Dockerで利用できるようにする (2/5) 期限:2026-02-01
  ○ k8sにデプロイする 期限:2026-02-08
  ○ lakehouse設計、ai連携含む 期限:2026-02-15
  ○ レイクハウス構築 期限:2026-02-22
  ○ AIが全機能を使えるようにする 期限:2026-03-01
  ○ 通知連携、ニュース集め機能 期限:2026-03-08
  ○ Kensanリリース 期限:2026-03-15
【健康】
  ○ 定期的なジム通い (0/1)
... (以下略、500文字で切れている)
```

→ `{weekly_summary}` と `{goal_progress}` が VariableReplacer で
   既にシステムプロンプトに埋め込まれている。

---

## ユーザーメッセージ

```
2026-01-26〜2026-02-01の振り返りレビューを生成してください。以下のJSON形式で出力してください:
```json
{
  "weekStart": "2026-01-26",
  "weekEnd": "2026-02-01",
  "taskEvaluations": [{"taskName": "タスク名", "status": "achieved|good|partial|missed", "comment": "コメント"}],
  "timeEvaluations": [{"goalName": "目標名", "goalColor": "#色コード", "actualMinutes": 数値, "targetMinutes": 数値, "comment": "コメント"}],
  "learningSummary": "学習記録の要約テキスト",
  "goodPoints": ["よかった点1", "よかった点2"],
  "improvementPoints": ["改善点1", "改善点2"],
  "advice": ["アドバイス1", "アドバイス2"],
  "summary": "全体サマリー"
}
```
```

---

## 各ターンでのツール呼び出し結果（会話履歴に蓄積される）

### Turn 1: get_analytics_summary
Input: `{"period": "weekly", "start_date": "2026-01-26", "end_date": "2026-02-01"}`
Output (要約):
- totalHours: 10.5
- goalBreakdown: Kensanリリース 8.6h, KubeCon登壇 0.9h+0.5h, 健康 0.5h
→ **システムプロンプトの {weekly_summary} とほぼ同じデータ**

### Turn 2: get_time_entries
Input: `{"start_date": "2026-01-26", "end_date": "2026-02-01"}`
Output (要約):
- 個別の time entry レコード（タスク名、開始/終了時刻、目標名等）
- 推定: 10+ エントリ × 各200-300文字 = 2,000-3,000文字
→ **明細データ。フロントの dailyStudyHours に一部含まれるが、詳細は新規**

### Turn 3: get_tasks
Input: `{"milestone_id": "11110000-0001-0000-0000-000000000000"}`
Output (要約):
- Dockerマイルストーン配下のタスク一覧
- Telemetry実装、利用とフィードバック、等
→ **フロントからは渡していないデータ**

### Turn 4: get_notes
Input: `{"type": "learning", "limit": 10}`
Output (要約):
- 学習ノート10件の全文（Kubernetes meetup, Iceburg vs snowflake 等）
- **ノートの content が全文含まれるため、これが最大のトークン消費源**
→ **フロントからは渡していないデータ**

---

## トークン肥大の原因分析

### 1. 会話履歴の累積（最大要因）
毎ターン、過去のツール結果が全て再送される。
- Turn 1: system_prompt + user_msg = ~7,830 tokens
- Turn 5: 上記 + 4回のツール結果の全蓄積 = 14,331 tokens
- 差分 6,501 tokens がツール結果の蓄積分

### 2. システムプロンプト内の重複データ
VariableReplacer が埋め込む `{weekly_summary}` と、
Turn 1 で取得する `get_analytics_summary` の結果がほぼ同一。
→ 同じデータが2重に存在

### 3. get_notes の全文取得
学習ノート10件の content が全文返される。
ノート1件あたり数百〜数千文字あるため、これだけで数千トークン。

### 4. 1ツール/1ターンの非効率
4ツールを4ターンに分けて呼ぶため、
ターンごとに system_prompt + 蓄積履歴が再送される。
仮に1ターンで4ツール同時呼びすれば、
input tokens は 7,830 + 6,501 = ~14,331 で済む（現状の合計 54,097 の約26%）。

---

## 改善案

| 施策 | 推定削減 | 備考 |
|------|---------|------|
| context注入でget_analytics_summary除外 | -8,280 tokens (Turn 2丸ごと) | {weekly_summary}と重複 |
| 1ターン複数ツール呼び出し | -25,000+ tokens | 履歴再送の削減 |
| get_notes の content を要約/タイトルのみに | -3,000+ tokens | 全文は不要な場合が多い |
| weekly の max_turns を 3 に | 429リスク削減 | ターン数自体の上限 |
