"""Chat Agent - General conversation with access to user data."""

SYSTEM_PROMPT = """あなたはKensanアプリのAIアシスタントです。
ユーザーのタスク管理・時間計画・目標管理・学習記録・振り返りを支援します。

## 現在の日時
{current_datetime}

## ユーザー情報
{user_memory}

## 未完了タスク
{pending_tasks}

## 直近のやりとり
{recent_context}

## 思考プロセス（最重要）

ユーザーの発言を受けたら、以下の順序で考えること：

1. **意図を推測する**
   - 名詞句（「期限が厳しいタスク」「今日の予定」）→ 既存データの照会
   - 動詞句（「タスク作って」「予定入れて」）→ 新規作成の依頼
   - 疑問形（「〜どうなってる？」「〜ある？」）→ 状態確認
   - 希望表現（「〜したいんだけど」）→ 実行の依頼
   - 判断に迷ったらデータ取得を優先する。作成は取り消せないが、検索は無害

2. **データを取得する** — 行動前に必ず現状を把握する
   - 書き込み操作の前に、関連する読み取りツールで既存データを確認する
   - 「タスク作って」→ まず get_tasks で類似タスクがないか確認
   - 「予定立てて」→ まず get_tasks + get_time_blocks で既存状況を確認

3. **判断して応答する** — データに基づいて最適な対応をする

## 日本語の解釈ガイド

以下のような表現は新規作成ではなく、既存データの操作・参照を意味する：
- 「期限が厳しいタスク」→ 期限が近い既存タスクを検索
- 「来週の予定」→ 来週のタイムブロックを取得
- 「CKAの進捗」→ CKA関連の目標・タスクの完了状況を確認
- 「終わったタスク」→ completed=true のタスクを取得

新規作成を示す表現：
- 「〜を作って」「〜を追加して」「〜を入れて」

## ツール連携パターン

- 関連するreadツールは1回のターンで同時に呼び出すこと
- **予定を立てる**: get_tasks + get_time_blocks(同日) → create_time_block
- **タスクの状況確認**: get_tasks(completed=false) → 分析
- **進捗レポート**: get_goals_and_milestones + get_analytics_summary → 分析
- **振り返り**: get_daily_summary → 計画vs実績を比較分析
- **情報を探す**: hybrid_search → 該当データを報告

## ルール
- 日本語で応答する
- 書き込み操作はツール呼び出しで提案する。UIが承認フローを表示するので、テキストで「実行してよいですか？」と聞かない
- 読み取り操作は即実行してよい
- 日付は JST 基準。「今日」「明日」等は JST で解釈する
- 曖昧な時間: 朝→08:00-09:00、昼→12:00-13:00、午後→14:00-15:00、夕方→17:00-18:00
- 簡潔に応答する。単純な操作は短く、分析依頼には詳しく
- ユーザーにIDや技術的情報を聞かない。必要な情報はツールで取得する
- 意図が明確ならそのまま実行する。本当に曖昧な場合のみ短く確認する
"""

ALLOWED_TOOLS = [
    # Read tools
    "get_goals_and_milestones",
    "get_tasks",
    "get_time_blocks",
    "get_time_entries",
    "get_memos",
    "get_notes",
    "get_reviews",
    "get_review",
    "get_analytics_summary",
    "get_daily_summary",
    "get_user_memory",
    "get_user_facts",
    "get_recent_interactions",
    "semantic_search",
    "keyword_search",
    "hybrid_search",
    # File tools
    "upload_file",
    "get_file",
    "delete_file",
    "get_upload_url",
    # Write tools
    "create_task",
    "update_task",
    "delete_task",
    "create_time_block",
    "update_time_block",
    "delete_time_block",
    "create_memo",
    "create_note",
    "update_note",
    "create_goal",
    "update_goal",
    "delete_goal",
    "create_milestone",
    "update_milestone",
    "delete_milestone",
    "add_user_fact",
    "generate_weekly_review",
]

# =========================================================================
# Dynamic Tool Selection
# =========================================================================

TOOL_GROUPS: dict[str, list[str]] = {
    "core": [  # 常に読み込む
        "get_tasks",
        "get_time_blocks",
        "get_time_entries",
        "get_memos",
    ],
    "planning": [  # 予定・スケジュール関連
        "create_time_block",
        "update_time_block",
        "delete_time_block",
    ],
    "task": [  # タスク作成・編集
        "create_task",
        "update_task",
        "delete_task",
    ],
    "goals_read": [  # 目標・マイルストーン（参照のみ）
        "get_goals_and_milestones",
    ],
    "goals_write": [  # 目標・マイルストーン（変更）
        "create_goal",
        "update_goal",
        "delete_goal",
        "create_milestone",
        "update_milestone",
        "delete_milestone",
    ],
    "notes_read": [  # ノート（参照のみ）
        "get_notes",
    ],
    "notes_write": [  # ノート・メモ（作成・編集）
        "create_note",
        "update_note",
        "create_memo",
    ],
    "analytics": [  # 分析・振り返り
        "get_analytics_summary",
        "get_daily_summary",
        "get_goals_and_milestones",
    ],
    "search": [  # 検索
        "semantic_search",
        "keyword_search",
        "hybrid_search",
    ],
    "review": [  # レビュー
        "get_reviews",
        "get_review",
        "generate_weekly_review",
    ],
    "memory": [  # ユーザー記憶
        "get_user_memory",
        "get_user_facts",
        "get_recent_interactions",
        "add_user_fact",
    ],
    "files": [  # ファイル操作
        "upload_file",
        "get_file",
        "delete_file",
        "get_upload_url",
    ],
}

SITUATION_TOOL_GROUPS: dict[str, list[str]] = {
    # 明示指定された situation → 必要なグループを静的に定義
    # weekly: {weekly_summary} が VariableReplacer で既に埋め込まれるため analytics 不要
    "weekly": ["core", "review", "notes_read", "goals_read", "search"],
    "morning": ["core", "planning", "task", "goals_read", "goals_write"],
    "evening": ["core", "analytics", "notes_read", "notes_write", "memory"],
}

# フロントから渡された context キー → 除外するツール
# context にデータが含まれていれば、対応するツールを allowed_tools から除外し
# エージェントがツールで再取得するのを防ぐ
CONTEXT_EXCLUDES_TOOLS: dict[str, list[str]] = {
    "週間サマリー": ["get_analytics_summary", "get_daily_summary"],
    "日別稼働": ["get_time_entries"],
    "目標進捗": ["get_goals_and_milestones"],
    "タスク一覧": ["get_tasks"],
}

INTENT_PATTERNS: list[tuple[list[str], list[str]]] = [
    # chat (auto) 用: キーワード → 読み込むグループ群
    (["予定", "スケジュール", "タイムブロック", "入れて", "入れといて"], ["planning", "task"]),
    (["タスク", "やること", "TODO"], ["task"]),
    (["目標", "ゴール", "マイルストーン", "達成"], ["goals_read", "goals_write", "analytics"]),
    (["ノート", "メモ", "日記", "記録", "書いて"], ["notes_read", "notes_write"]),
    (["分析", "進捗", "レポート", "サマリー", "振り返り"], ["analytics", "review"]),
    (["検索", "探して", "調べて", "どこ"], ["search"]),
    (["レビュー", "週次", "ウィークリー"], ["review", "analytics"]),
    (["ファイル", "アップロード", "画像"], ["files"]),
]


def select_tools(
    message: str,
    base_tools: list[str],
    situation: str = "auto",
    context_keys: list[str] | None = None,
) -> list[str]:
    """situation とメッセージ意図からツールグループを選択し、必要なツールだけを返す。

    Args:
        message: ユーザーのメッセージテキスト
        base_tools: DBで許可されたツールのリスト（上限）
        situation: リクエストの situation（"auto" の場合はキーワードベースで選択）
        context_keys: フロントから渡された context のキー。対応ツールを除外する。

    Returns:
        選択されたツールのリスト
    """
    selected_groups: set[str] = {"core"}  # 常に含む

    if situation in SITUATION_TOOL_GROUPS:
        # 明示 situation → 静的グループ
        selected_groups.update(SITUATION_TOOL_GROUPS[situation])
    else:
        # auto / chat → キーワードベース
        for keywords, groups in INTENT_PATTERNS:
            if any(kw in message for kw in keywords):
                selected_groups.update(groups)

        # マッチなし → デフォルトセット（最もよく使うパターン）
        if selected_groups == {"core"}:
            selected_groups.update(["planning", "task"])

    # グループからツール名リストに展開
    selected: set[str] = set()
    for group in selected_groups:
        selected.update(TOOL_GROUPS.get(group, []))

    # context で提供済みのデータに対応するツールを除外
    if context_keys:
        for key in context_keys:
            for tool_name in CONTEXT_EXCLUDES_TOOLS.get(key, []):
                selected.discard(tool_name)

    # base_tools（許可リスト）とのANDで返す
    return [t for t in base_tools if t in selected]
