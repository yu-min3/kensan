"""Tests for chat.py select_tools function."""

import pytest
from kensan_ai.agents.chat import select_tools, ALLOWED_TOOLS


# Use ALLOWED_TOOLS as base_tools for all tests (simulates DB config)
BASE = ALLOWED_TOOLS


class TestSelectToolsReadIntent:
    """参照系キーワードではwriteツールが含まれないことを確認。"""

    def test_goal_query_no_write_tools(self):
        """「目標達成できそう？」→ read only, no create/update/delete
        (prompt_variablesなしの場合はget_goals_and_milestonesが含まれる)"""
        result = select_tools("このままで目標達成できそう？", BASE)
        assert "get_goals_and_milestones" in result
        assert "create_goal" not in result
        assert "update_goal" not in result
        assert "delete_goal" not in result
        assert "create_milestone" not in result

    def test_task_query_no_write_tools(self):
        """「タスクの状況は？」→ get_tasks のみ (core)"""
        result = select_tools("タスクの状況は？", BASE)
        assert "get_tasks" in result
        assert "create_task" not in result
        assert "update_task" not in result
        assert "delete_task" not in result

    def test_schedule_query_no_write_tools(self):
        """「今日の予定は？」→ read only"""
        result = select_tools("今日の予定は？", BASE)
        assert "get_time_blocks" in result
        assert "create_time_block" not in result

    def test_analytics_query(self):
        """「進捗を教えて」→ analytics + review (read only)"""
        result = select_tools("進捗を教えて", BASE)
        assert "get_analytics_summary" in result or "get_daily_summary" in result
        assert "create_task" not in result

    def test_note_query_no_write(self):
        """「ノートを見せて」→ get_notes のみ"""
        result = select_tools("ノートを見せて", BASE)
        assert "get_notes" in result
        assert "create_note" not in result
        assert "update_note" not in result

    def test_no_match_defaults_read_only(self):
        """マッチなし → core + goals_read のみ (write含まない)"""
        result = select_tools("こんにちは", BASE)
        # core tools always included
        assert "get_tasks" in result
        assert "get_time_blocks" in result
        # No write tools
        assert "create_task" not in result
        assert "create_time_block" not in result


class TestSelectToolsWriteIntent:
    """書き込み意図があるときはwriteツールが含まれることを確認。"""

    def test_create_task(self):
        """「タスク作って」→ task write グループ含む"""
        result = select_tools("新しいタスク作って", BASE)
        assert "create_task" in result

    def test_create_schedule(self):
        """「予定入れて」→ planning write グループ含む"""
        result = select_tools("明日の午前に予定入れて", BASE)
        assert "create_time_block" in result

    def test_create_goal(self):
        """「目標追加して」→ goals_write グループ含む"""
        result = select_tools("新しい目標追加して", BASE)
        assert "create_goal" in result

    def test_update_task(self):
        """「タスク更新して」→ task write"""
        result = select_tools("このタスク更新して", BASE)
        assert "update_task" in result

    def test_delete_task(self):
        """「タスク削除して」→ task write"""
        result = select_tools("このタスク削除して", BASE)
        assert "delete_task" in result

    def test_write_note(self):
        """「メモ書いて」→ notes_write 含む"""
        result = select_tools("今日のメモ書いて", BASE)
        assert "create_memo" in result or "create_note" in result

    def test_generic_write_defaults(self):
        """「作って」だけ（ドメインなし）→ デフォルト planning + task"""
        result = select_tools("これ作って", BASE)
        assert "create_time_block" in result or "create_task" in result

    def test_schedule_plan(self):
        """「予定立てて」→ planning write"""
        result = select_tools("明日の予定立てて", BASE)
        assert "create_time_block" in result


class TestSelectToolsSituation:
    """situation指定時のテスト。"""

    def test_weekly_situation(self):
        """weekly → review, search, read系のみ"""
        result = select_tools("振り返りをお願い", BASE, situation="weekly")
        assert "get_reviews" in result
        assert "create_task" not in result

    def test_briefing_situation(self):
        """briefing → planning + task + goals_read + analytics"""
        result = select_tools("今日の計画", BASE, situation="briefing")
        assert "create_time_block" in result
        assert "create_task" in result
        assert "get_analytics_summary" in result

    def test_evening_situation(self):
        """evening → analytics + notes + memory"""
        result = select_tools("今日の振り返り", BASE, situation="evening")
        assert "get_analytics_summary" in result
        assert "create_note" in result


class TestSelectToolsContextExclusion:
    """context_keysによるツール除外テスト。"""

    def test_exclude_analytics_when_provided(self):
        """週間サマリーが渡されていればanalyticsツールを除外"""
        result = select_tools(
            "進捗を教えて", BASE, context_keys=["週間サマリー"]
        )
        assert "get_analytics_summary" not in result
        assert "get_daily_summary" not in result


class TestSelectToolsPromptVariableExclusion:
    """prompt_variablesによるツール除外テスト。"""

    def test_exclude_tasks_when_pending_tasks_injected(self):
        """pending_tasks変数があればget_tasksを除外"""
        result = select_tools(
            "タスクの状況は？", BASE, prompt_variables=["pending_tasks"]
        )
        assert "get_tasks" not in result

    def test_exclude_goals_when_goal_progress_injected(self):
        """goal_progress変数があればget_goals_and_milestonesを除外"""
        result = select_tools(
            "目標達成できそう？", BASE, prompt_variables=["goal_progress"]
        )
        assert "get_goals_and_milestones" not in result

    def test_exclude_time_blocks_when_today_schedule_injected(self):
        """today_schedule変数があればget_time_blocksを除外"""
        result = select_tools(
            "今日の予定は？", BASE, prompt_variables=["today_schedule"]
        )
        assert "get_time_blocks" not in result

    def test_exclude_time_entries_when_today_entries_injected(self):
        """today_entries変数があればget_time_entriesを除外"""
        result = select_tools(
            "今日の実績は？", BASE, prompt_variables=["today_entries"]
        )
        assert "get_time_entries" not in result

    def test_multiple_variable_exclusions(self):
        """複数変数の同時除外"""
        result = select_tools(
            "目標達成できそう？", BASE,
            prompt_variables=["pending_tasks", "goal_progress"],
        )
        assert "get_tasks" not in result
        assert "get_goals_and_milestones" not in result

    def test_chat_prompt_excludes_goals_and_tasks(self):
        """chatプロンプトの変数構成で目標達成クエリ → ツール不要"""
        # chat prompt has: current_datetime, user_memory, goal_progress, pending_tasks, recent_context
        chat_vars = ["current_datetime", "user_memory", "goal_progress", "pending_tasks", "recent_context"]
        result = select_tools(
            "このままで目標達成できそう？", BASE,
            prompt_variables=chat_vars,
        )
        assert "get_goals_and_milestones" not in result
        assert "get_tasks" not in result
        # core tools minus excluded ones
        assert "get_time_blocks" in result  # still available for schedule queries

    def test_write_tools_not_excluded_by_variables(self):
        """変数注入はread系ツールのみ除外、write系は影響しない"""
        result = select_tools(
            "タスク作って", BASE,
            prompt_variables=["pending_tasks"],
        )
        assert "get_tasks" not in result  # read excluded
        assert "create_task" in result     # write still available


class TestToolCount:
    """ツール数が妥当な範囲に収まることを確認。"""

    def test_read_query_tool_count(self):
        """参照系クエリではツール数が少ない"""
        result = select_tools("このままで目標達成できそう？", BASE)
        assert len(result) <= 8, f"Too many tools for read query: {len(result)} tools: {result}"

    def test_read_query_with_variables_tool_count(self):
        """変数注入時はさらにツール数が減る"""
        chat_vars = ["current_datetime", "user_memory", "goal_progress", "pending_tasks", "recent_context"]
        result = select_tools(
            "このままで目標達成できそう？", BASE,
            prompt_variables=chat_vars,
        )
        assert len(result) <= 5, f"Too many tools with variables: {len(result)} tools: {result}"

    def test_write_query_tool_count(self):
        """書き込み系でも合理的な範囲"""
        result = select_tools("タスク作って", BASE)
        assert len(result) <= 10, f"Too many tools: {len(result)} tools: {result}"

    def test_no_match_tool_count(self):
        """マッチなしでもツールは最小限"""
        result = select_tools("こんにちは", BASE)
        assert len(result) <= 6, f"Too many tools for greeting: {len(result)} tools: {result}"


class TestSelectToolsSearch:
    """検索グループのツール選択テスト。"""

    def test_search_keyword_includes_search_group(self):
        """「検索して」→ search グループ含む"""
        result = select_tools("ノートを検索して", BASE)
        assert "semantic_search" in result
        assert "keyword_search" in result
        assert "hybrid_search" in result

    def test_reindex_not_in_allowed_tools(self):
        """reindex_notesはALLOWED_TOOLSに含まれない → select_toolsから除外"""
        from kensan_ai.agents.chat import TOOL_GROUPS
        # reindex_notes is in search group
        assert "reindex_notes" in TOOL_GROUPS["search"]
        # but not in ALLOWED_TOOLS
        assert "reindex_notes" not in ALLOWED_TOOLS
        # so it won't appear in result
        result = select_tools("検索して", BASE)
        assert "reindex_notes" not in result

    def test_explore_keyword_includes_search(self):
        """「探して」→ search グループ含む"""
        result = select_tools("資格について探して", BASE)
        assert "semantic_search" in result

    def test_investigate_keyword_includes_search(self):
        """「調べて」→ search グループ含む"""
        result = select_tools("サービスメッシュについて調べて", BASE)
        assert "semantic_search" in result


class TestSelectToolsNoFiles:
    """ファイル関連ツールが存在しないことのテスト。"""

    def test_no_upload_file_in_allowed_tools(self):
        """upload_fileがALLOWED_TOOLSに含まれない"""
        assert "upload_file" not in ALLOWED_TOOLS

    def test_no_download_file_in_allowed_tools(self):
        """download_fileがALLOWED_TOOLSに含まれない"""
        assert "download_file" not in ALLOWED_TOOLS

    def test_no_files_tool_group(self):
        """filesツールグループが存在しない"""
        from kensan_ai.agents.chat import TOOL_GROUPS
        assert "files" not in TOOL_GROUPS
