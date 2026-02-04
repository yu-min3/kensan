"""Chat Agent - General conversation with access to user data."""

SYSTEM_PROMPT = """あなたはKensanアプリのAIアシスタントです。
ユーザーのタスク管理・時間計画・目標管理・学習記録・振り返りを支援します。

## 現在の日時
{current_datetime}

## ユーザー情報
{user_memory}

## 目標と進捗（最新データ）
{goal_progress}

## 未完了タスク（最新データ）
{pending_tasks}

## 直近のやりとり
{recent_context}

## 思考プロセス（最重要）

ユーザーの発言を受けたら、**必ず以下の手順で考えること**：

1. **上記データを確認する** — 「目標と進捗」「未完了タスク」セクションには最新データが含まれている。このデータで回答できる質問にはツールを使わない
2. **不足データだけを特定する** — 上記にない情報（例: 特定日のタイムブロック、完了済みタスク、詳細な分析）が必要な場合のみツールを使う
3. **ツールが必要なら1回で全て呼ぶ** — 複数のツールが必要なら必ず同じターンでまとめて呼ぶ

**例:**
- 「目標達成できそう？」→ 上記データで回答可能。ツール不要
- 「来週の予定は？」→ 上記にない → get_time_blocks を1回呼ぶ
- 「予定立てて」→ get_time_blocks を呼ぶ → create_time_block（タスクは上記にある）

## 日本語の解釈ガイド

以下のような表現は新規作成ではなく、既存データの操作・参照を意味する：
- 「期限が厳しいタスク」→ 期限が近い既存タスクを検索
- 「来週の予定」→ 来週のタイムブロックを取得
- 「CKAの進捗」→ CKA関連の目標・タスクの完了状況を確認
- 「終わったタスク」→ completed=true のタスクを取得

新規作成を示す表現：
- 「〜を作って」「〜を追加して」「〜を入れて」

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
    # External tools
    "web_search",
    "web_fetch",
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
        "reindex_notes",
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
    "web": [  # Web検索・取得
        "web_search",
        "web_fetch",
    ],
}

SITUATION_TOOL_GROUPS: dict[str, list[str]] = {
    # 明示指定された situation → 必要なグループを静的に定義
    # weekly: {weekly_summary} が VariableReplacer で既に埋め込まれるため analytics 不要
    "weekly": ["core", "review", "notes_read", "goals_read", "search"],
    "evening": ["core", "analytics", "notes_read", "notes_write", "memory"],
    "briefing": ["core", "planning", "task", "goals_read", "analytics"],
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

# システムプロンプトの変数 → 対応するツールを除外
# 変数でデータが注入済みなら、同じデータを返すツールは不要
VARIABLE_EXCLUDES_TOOLS: dict[str, list[str]] = {
    "pending_tasks": ["get_tasks"],
    "goal_progress": ["get_goals_and_milestones"],
    "today_schedule": ["get_time_blocks"],
    "today_entries": ["get_time_entries"],
}

# 参照系: 常にマッチするとreadグループを追加
INTENT_READ_PATTERNS: list[tuple[list[str], list[str]]] = [
    (["予定", "スケジュール", "タイムブロック"], ["goals_read"]),
    (["タスク", "やること", "TODO"], []),  # core に get_tasks 含む
    (["目標", "ゴール", "マイルストーン", "達成"], ["goals_read", "analytics"]),
    (["ノート", "メモ", "日記", "記録"], ["notes_read"]),
    (["分析", "進捗", "レポート", "サマリー", "振り返り"], ["analytics", "review"]),
    (["検索", "探して", "調べて", "どこ"], ["search"]),
    (["レビュー", "週次", "ウィークリー"], ["review", "analytics"]),
    (["ウェブ", "Web", "web", "ググって", "最新", "ニュース", "公式", "URL", "サイト", "ページ"], ["web"]),
]

# 変更系: 明示的な書き込み意図があるときだけ追加
WRITE_KEYWORDS: list[str] = [
    "作って", "追加して", "入れて", "入れといて", "登録して",
    "変更して", "更新して", "修正して", "編集して",
    "削除して", "消して", "取り消して",
    "書いて", "メモして", "記録して",
    "立てて",  # 予定を立てて
]

# 書き込みキーワード × ドメインキーワード → writeグループ
INTENT_WRITE_PATTERNS: list[tuple[list[str], list[str]]] = [
    (["予定", "スケジュール", "タイムブロック"], ["planning"]),
    (["タスク", "やること", "TODO"], ["task"]),
    (["目標", "ゴール", "マイルストーン"], ["goals_write"]),
    (["ノート", "メモ", "日記", "記録"], ["notes_write"]),
]


def _has_write_intent(message: str) -> bool:
    """メッセージに書き込み意図があるかを判定する。"""
    return any(kw in message for kw in WRITE_KEYWORDS)


def select_tools(
    message: str,
    base_tools: list[str],
    situation: str = "auto",
    context_keys: list[str] | None = None,
    prompt_variables: list[str] | None = None,
) -> list[str]:
    """situation とメッセージ意図からツールグループを選択し、必要なツールだけを返す。

    Args:
        message: ユーザーのメッセージテキスト
        base_tools: DBで許可されたツールのリスト（上限）
        situation: リクエストの situation（"auto" の場合はキーワードベースで選択）
        context_keys: フロントから渡された context のキー。対応ツールを除外する。
        prompt_variables: システムプロンプトに含まれる変数名。対応ツールを除外する。

    Returns:
        選択されたツールのリスト
    """
    selected_groups: set[str] = {"core"}  # 常に含む

    if situation in SITUATION_TOOL_GROUPS:
        # 明示 situation → 静的グループ
        selected_groups.update(SITUATION_TOOL_GROUPS[situation])
    else:
        # auto / chat → キーワードベース
        matched_read = False
        for keywords, groups in INTENT_READ_PATTERNS:
            if any(kw in message for kw in keywords):
                selected_groups.update(groups)
                matched_read = True

        # 書き込み意図がある場合のみ write グループを追加
        if _has_write_intent(message):
            for keywords, groups in INTENT_WRITE_PATTERNS:
                if any(kw in message for kw in keywords):
                    selected_groups.update(groups)
                    matched_read = True  # ドメインマッチあり

            # 書き込み意図あるが特定ドメインにマッチしない → デフォルト write
            if not any(
                any(kw in message for kw in keywords)
                for keywords, _ in INTENT_WRITE_PATTERNS
            ):
                selected_groups.update(["planning", "task"])

        # 読み書きどちらにもマッチなし → デフォルトセット（read only）
        if not matched_read and selected_groups == {"core"}:
            selected_groups.add("goals_read")

    # グループからツール名リストに展開
    selected: set[str] = set()
    for group in selected_groups:
        selected.update(TOOL_GROUPS.get(group, []))

    # context で提供済みのデータに対応するツールを除外
    if context_keys:
        for key in context_keys:
            for tool_name in CONTEXT_EXCLUDES_TOOLS.get(key, []):
                selected.discard(tool_name)

    # プロンプト変数で注入済みのデータに対応するツールを除外
    if prompt_variables:
        for var in prompt_variables:
            for tool_name in VARIABLE_EXCLUDES_TOOLS.get(var, []):
                selected.discard(tool_name)

    # base_tools（許可リスト）とのANDで返す
    return [t for t in base_tools if t in selected]
