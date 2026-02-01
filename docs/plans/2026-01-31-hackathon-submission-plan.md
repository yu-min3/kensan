# 第4回 Agentic AI Hackathon with Google Cloud 出場計画

## 判断基準

**1-2日で完了できるなら出す。できないなら出さない。**

Kensanは元々ポートフォリオ目的のプロジェクト。ハッカソンはあくまでボーナス機会であり、入賞のためにアーキテクチャの一貫性を崩すことはしない。

---

## ハッカソン概要

| 項目 | 内容 |
|------|------|
| 名称 | 第4回 Agentic AI Hackathon with Google Cloud |
| URL | https://zenn.dev/hackathons/google-cloud-japan-ai-hackathon-vol4 |
| 提出期限 | **2026年2月15日** |
| 1次審査 | 2月16日〜23日 |
| 2次審査 | 2月24日〜3月2日 |
| 最終ピッチ | 3月19日（Google Cloud Agentic AI Summit'26 Spring） |
| 賞金 | 最優秀賞50万、優秀賞25万x3、奨励賞10万x5 |
| クレジット | Google Cloud $300/チーム |

## 必須要件

1. **Google Cloud コンピュートプロダクト** 1つ以上: Compute Engine（GCE）
2. **Google Cloud AI技術** 1つ以上: Gemini API + ADK
3. **提出物**:
   - 公開GitHubリポジトリ
   - デプロイ済みURL（Google Cloud上）
   - Zenn記事（カテゴリ: Idea、トピック: gch4）+ アーキテクチャ図 + 3分YouTubeデモ動画

---

## 競合分析サマリ

### 過去の受賞作品の技術水準

| プロジェクト | 賞 | 構成 | テスト | DB設計 |
|---|---|---|---|---|
| フクシア（第3回最優秀） | 50万 | モノレポ（Next.js + FastAPI） | なし | 記載なし |
| RouteKeeperAI（第3回優秀） | 25万 | Next.js + Cloud Functions/Hono | なし | キャッシュのみ |
| 添削AI 言の葉（第3回優秀） | 25万 | React + FastAPI | なし | 記載なし |

### Kensanの技術的優位性

- Go 6マイクロサービス + Python AIサービス（受賞作は全てモノリス/サーバーレス）
- PostgreSQL + マイグレーション管理 + UUID主キー + pgcrypto暗号化
- レイヤードアーキテクチャ（handler → service → repository）の一貫した適用
- ユニットテスト + e2eテスト（受賞作はテストなし）
- JWT認証 + ミドルウェアチェーン
- ARCHITECTURE.md x3（backend/frontend/AI）

### Kensanの弱点

- **課題の新規性**: 「個人の生産性管理」は既存ツールが多い領域
- 受賞作品は社会福祉・教育・防災など「明確な社会課題」を解決している
- 技術力ではなく課題設定とストーリーテリングが審査の差になる

### 入賞見込み

- **奨励賞（10万、5枠）**: 狙える可能性あり
- **優秀賞以上**: 課題のフレーミング次第

---

## 実装方針

### 原則

- **既存アーキテクチャを汚さない**
- Claude API → Geminiの全面移行はしない
- ADKベースのGeminiエージェントを**追加**する形にする

### やること

| タスク | 内容 | 工数目安 |
|--------|------|----------|
| ADKエージェント追加 | 週次レビュー等をGemini + ADKで実装（既存kensan-aiと共存） | 半日 |
| GCEデプロイ | e2-medium 1台にdocker-compose up | 数時間 |
| nginx追加 | パスベースのリバースプロキシでサービスを束ねる | 1時間 |
| Zenn記事 | 設計思想 + アーキテクチャ図 + デモ紹介 | 半日 |
| 3分デモ動画 | 画面録画（OBS/SimpleScreenRecorder） + Vrewでナレーション | 1時間 |

### やらないこと

- Claude → Geminiの全面移行
- フロントエンドの大幅変更
- 新しいUIの追加
- Cloud Run個別デプロイ（8サービス分の通信設定で時間が溶ける）
- GKE（論外）

---

## デプロイ構成

```
ユーザー → GCE (e2-medium, 1台)
              ├── nginx (80/443)  ← パスベースで振り分け
              │     ├── /              → frontend:5173
              │     ├── /api/v1/users/ → user-service:8081
              │     ├── /api/v1/tasks/ → task-service:8082
              │     └── ...（各サービスへプロキシ）
              ├── postgres:5432
              └── docker network (内部通信)
```

- Observabilityスタック（otel, tempo, loki, prometheus, grafana）はデモ用には外す
- フロントエンドのVITE_*_URLは相対パス（`/api/v1/...`）に統一
- SSL: Let's Encrypt on nginx、またはCloudflare前段

### Google Cloud要件の充足

| 要件 | 使用サービス |
|------|-------------|
| コンピュートプロダクト | **Compute Engine**（GCE） |
| AI技術 | **Gemini API + ADK**（新規エージェント） |

---

## デモ動画の作り方

1. OBS or SimpleScreenRecorderで実際の操作を3分録画（無言）
2. Vrewに動画をインポート
3. 台本テキストを入力 → AI音声ナレーション自動生成
4. 字幕も自動付与
5. YouTubeにアップロード

---

## Zenn記事の構成案

記事のフォーカスは「実装品質と拡張性」。ポートフォリオ説明資料としても再利用可能な内容にする。

1. **課題設定**: エンジニアの目標管理・学習継続の難しさ
2. **アーキテクチャ概要**: マイクロサービス構成図
3. **設計のこだわり**:
   - レイヤードアーキテクチャの一貫適用
   - 認証・認可の共通化
   - DB設計（マルチテナンシー、暗号化）
4. **AIエージェント**: ADK + Geminiによるエージェント機能
5. **デモ**: YouTube動画埋め込み
6. **技術スタック一覧**

---

## リスクと判断ポイント

| リスク | 対策 |
|--------|------|
| ADK習熟に時間がかかる | 半日触ってみて無理そうなら撤退 |
| GCEデプロイでハマる | docker-compose upがそのまま動くので低リスク |
| 記事・動画に時間がかかる | 記事はポートフォリオ兼用で書く。動画はVrewで最小工数 |
| 入賞しない | 損失は作業時間のみ。記事とデプロイ実績は残る |
