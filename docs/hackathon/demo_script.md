# デモ動画 台本（3分）

## 0:00-0:30 アーキテクチャ概要

**画面**: Mermaid図（記事のシステムアーキテクチャ図）

**ナレーション**:
> Kensanは、エンジニアの自己研鑽を支援するAIエージェント搭載アプリケーションです。
> React + Go マイクロサービス + Python AIサービスの構成で、
> AIエージェントは40種類のDirect Toolsを通じてタスク・目標・時間計画すべてのデータにアクセスできます。
> AIプロバイダーはGemini 2.0 Flashを使用しており、環境変数1つで切り替え可能です。
> 全サービスにOpenTelemetryを組み込み、Grafanaで可視化しています。

## 0:30-1:30 ライブデモ: AIチャット

**画面**: Kensanアプリのチャット画面

### シーン1: ログイン (0:30-0:40)
- `http://<GCE_IP>:5173` にアクセス
- `test@kensan.dev` / `password123` でログイン

### シーン2: 読み取りツール実行 (0:40-1:00)
**入力**: 「今週の進捗を教えて」

**見せるポイント**:
- SSEストリーミングでテキストが逐次表示される
- `get_tasks`、`get_analytics_summary` などのツール呼び出しがUIに表示される
- Readonlyツールは即座に実行される

### シーン3: 書き込みツール + 承認フロー (1:00-1:30)
**入力**: 「明日の午前中にCKA試験対策のタイムブロックを作って」

**見せるポイント**:
- `create_time_block` がaction_proposalとして提案される
- UIに承認ボタンが表示される
- 承認すると実行される
- → Read/Write分離の実例

## 1:30-2:20 Grafanaダッシュボード

**画面**: `http://<GCE_IP>:3000`

### シーン1: Service Overview (1:30-1:50)
- ダッシュボード「Kensan Service Overview」を表示
- リクエストレート、エラーレート、レイテンシを確認
- ai-serviceのメトリクスにフォーカス

### シーン2: Request Explorer でトレース追跡 (1:50-2:20)
- ダッシュボード「Kensan Request Explorer」に切替
- 直前のAIチャットリクエストを選択
- トレース表示: agent.stream → gen_ai.turn → agent.tool_execution のスパン階層
- スパンからログにジャンプ: トークン数、ツール呼び出し詳細が見える
- → Three Pillarsの相関を実演

## 2:20-3:00 コードウォークスルー

**画面**: エディタ（VS Code）

### シーン1: ツールデコレータ (2:20-2:35)
- `kensan-ai/src/kensan_ai/tools/db_tools.py` を開く
- `@tool(name="get_tasks", ...)` デコレータを見せる
- 「デコレータでスキーマ定義とハンドラを一体管理」

### シーン2: エージェントループ (2:35-2:50)
- `kensan-ai/src/kensan_ai/agents/gemini_runner.py` を開く
- `stream_sse()` メソッドのループ部分を見せる
- 「ストリーミング + Function Call検出 + ツール実行のループ」

### シーン3: プロバイダー切替 (2:50-3:00)
- `kensan-ai/src/kensan_ai/agents/__init__.py` を開く
- `create_agent_runner()` のif分岐を見せる
- 「AI_PROVIDER環境変数1つで切り替え。既存コードは一切変更なし」

---

## 撮影メモ

- **解像度**: 1920x1080
- **ツール**: OBS Studio or QuickTime
- **ブラウザ**: フォントサイズを大きめに（Cmd+で拡大）
- **エディタ**: フォントサイズ16以上
- **録音**: 静かな環境で。後からナレーション追加もOK
- **編集**: 待ち時間（ビルド、APIレスポンス待ち）はカットまたは早送り
