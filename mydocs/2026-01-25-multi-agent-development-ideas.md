# マルチエージェント開発アイデア

**作成日**: 2026-01-25
**ステータス**: アイデア段階

---

## 概要

Claude Codeの機能を活用して、実装エージェントとテストエージェントを分離・連携させる開発ワークフローのアイデア。

---

## 1. セッション間タスク共有

### 設定方法

`~/.claude/settings.json` に以下を追加:

```json
{
  "env": {
    "CLAUDE_CODE_TASK_LIST_ID": "shared"
  }
}
```

### 効果

- タスクが `~/.claude/tasks/shared/` に保存される
- 別セッションでもタスクを引き継げる
- コンテキスト圧縮後も保持される

---

## 2. 実装Agent + テストAgent 連携

### 基本構成

```
┌─────────────────────────────────────────────────────────────┐
│                    ~/.claude/tasks/shared/                  │
└─────────────────────────────────────────────────────────────┘
         ↑ TaskUpdate                      ↑ TaskUpdate
         │                                 │
┌────────┴────────┐               ┌────────┴────────┐
│   実装 Agent    │               │  テスト Agent   │
│                 │               │                 │
│  claude         │               │  claude         │
│  (通常起動)     │               │  --chrome       │
│                 │               │  --sandbox      │
│  - コード編集   │               │  - localhost    │
│  - ビルド       │               │    アクセス     │
│  - タスク更新   │               │  - UI検証       │
└─────────────────┘               │  - 結果報告     │
                                  └─────────────────┘
```

### ワークフロー例

| 順番 | Agent | 操作 |
|------|-------|------|
| 1 | 実装 | TaskCreate「ログインフォーム実装」→ 実装 → completed |
| 2 | テスト | TaskList確認 → localhost:5173でUI検証 → 結果をTaskCreate |
| 3 | 実装 | 修正依頼を確認 → 修正 → completed |
| 4 | テスト | 再検証 → Pass → completed |

### 起動コマンド

```bash
# ターミナル1: 実装agent
cd ~/Repositories/kensan-mockup && claude

# ターミナル2: テストagent（専用プロファイル）
google-chrome --profile-directory="Claude-Test" &
cd ~/Repositories/kensan-mockup && claude --chrome --sandbox
```

---

## 3. Chrome連携のセキュリティ考慮

### 現状の制限

| 項目 | 状況 |
|------|------|
| プロファイル指定 | 未実装（Issue #15125） |
| URL制限 | Chrome操作には適用されない |
| 複数プロファイル | どちらに接続されるか不確定 |

### 安全に使うための対策

1. **専用Chromeプロファイル**
   ```bash
   google-chrome --profile-directory="Claude-Test" &
   ```
   - 個人用Chromeは閉じてから起動

2. **Sandbox併用**
   ```bash
   claude --chrome --sandbox
   ```
   - Bash経由のネットワークアクセスは制限される
   - ただしChrome操作は対象外

3. **操作ごとの許可制御**
   - "Allow this action" - 1回だけ許可（最も安全）
   - "Decline" - 拒否

---

## 4. 仮想環境による完全隔離（発展案）

### 構成

```
┌─────────────────────────────────────────────────────────────┐
│  Host (実装Agent)                                           │
│  claude                                                     │
│  - コード編集                                               │
│  - npm run dev (localhost:5173)                            │
│                                                             │
│  ~/.claude/tasks/shared/ ←──┐                              │
└─────────────────────────────│──────────────────────────────┘
                              │ mount
┌─────────────────────────────│──────────────────────────────┐
│  Container/VM (テストAgent) │                               │
│  claude --chrome            │                               │
│                             ↓                               │
│  ~/.claude/tasks/shared/                                    │
│  - Chrome操作                                               │
│  - host.docker.internal:5173 にアクセス                     │
└─────────────────────────────────────────────────────────────┘
```

### 実現方法

**Devcontainer（Claude Code対応済み）**

```json
// .devcontainer/devcontainer.json
{
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "mounts": [
    "source=${localEnv:HOME}/.claude/tasks/shared,target=/root/.claude/tasks/shared,type=bind"
  ],
  "features": {
    "ghcr.io/devcontainers/features/desktop-lite:1": {}
  }
}
```

### 考慮点

| 項目 | 対応 |
|------|------|
| localhostアクセス | `host.docker.internal:5173` を使う |
| Chrome表示 | VNC or X11転送 |
| Claude Code | コンテナ内にもインストール必要 |

---

## 5. 関連設定

### CLAUDE.md への追記済み

`~/CLAUDE.md` のセクション5に Agent Guidelines を追加済み:
- 3ステップ以上の作業ではタスク機能を使用
- TaskCreate, TaskList, TaskGet, TaskUpdate の使い方

### settings.json

```json
// ~/.claude/settings.json
{
  "enabledPlugins": {
    "gopls-lsp@claude-plugins-official": true,
    "superpowers@claude-plugins-official": true
  },
  "env": {
    "CLAUDE_CODE_TASK_LIST_ID": "shared"
  }
}
```

---

## 参考リンク

- [Claude Code Chrome Integration (Beta)](https://code.claude.com/docs/en/chrome.md)
- [Claude Code Sandboxing](https://code.claude.com/docs/en/sandboxing.md)
- [GitHub Issue #15125 - Chrome profile support](https://github.com/anthropics/claude-code/issues/15125)
- [GitHub Issue #19740 - Multi-profile support](https://github.com/anthropics/claude-code/issues/19740)
