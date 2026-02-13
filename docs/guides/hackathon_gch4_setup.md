# Hackathon GCH4 セットアップガイド

第4回 Agentic AI Hackathon 提出用の設定手順。

ブランチ: `hackathon/gch4`

---

## 変更概要

Google Gemini を AI プロバイダーとして使用。

---

## 1. ローカル動作確認

### 1-1. Google API Key を取得

https://aistudio.google.com/apikey から取得。

### 1-2. 環境変数を設定

プロジェクトルートに `.env` を作成（または既存に追記）:

```bash
# 必須
GOOGLE_API_KEY=AIza...

# オプション（デフォルト値あり、変更不要なら省略可）
AI_PROVIDER=google              # デフォルト: google
GOOGLE_MODEL=gemini-2.0-flash   # デフォルト: gemini-2.0-flash
```

### 1-3. 起動

```bash
make up
```

### 1-4. 確認項目

| 確認内容 | 手順 |
|----------|------|
| サービス起動 | `make health` で全サービス OK |
| AI チャット | フロントからログイン → チャットで質問 |
| ツール実行 | 「今日のタスクは？」等でツール呼び出しが動くことを確認 |
| ファクト抽出 | 会話後に `docker exec -it kensan-postgres psql -U kensan -d kensan -c "SELECT * FROM user_facts ORDER BY created_at DESC LIMIT 5;"` |
| Observability | Grafana http://localhost:3000 でダッシュボード表示 |

---

## 2. GCE デプロイ

### 2-1. 前提条件

- `gcloud` CLI インストール・認証済み
- GCP プロジェクト選択済み
- Docker / Docker Compose がインストール済み（GCE上）

### 2-2. GCE インスタンス作成

```bash
gcloud compute instances create kensan-app \
  --zone=asia-northeast1-a \
  --machine-type=e2-standard-4 \
  --image-family=ubuntu-2404-lts-amd64 \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --tags=http-server,https-server
```

### 2-3. ファイアウォール設定

```bash
gcloud compute firewall-rules create allow-kensan \
  --allow tcp:80,tcp:443,tcp:3000,tcp:5173,tcp:8081-8091 \
  --target-tags=http-server
```

### 2-4. 外部 IP 確認

```bash
gcloud compute instances describe kensan-app \
  --zone=asia-northeast1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

### 2-5. GCE にデプロイ

```bash
# SSH 接続
gcloud compute ssh kensan-app --zone=asia-northeast1-a

# Docker インストール（初回のみ）
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
# 再ログインして docker グループを反映
exit
gcloud compute ssh kensan-app --zone=asia-northeast1-a

# リポジトリ取得
git clone <REPO_URL> kensan-mockup
cd kensan-mockup
git checkout hackathon/gch4
```

### 2-6. 本番用 .env を作成

```bash
cat > .env << 'EOF'
# 必須
GOOGLE_API_KEY=AIza...
JWT_SECRET=<ランダムな文字列を生成して設定>
GCE_IP=<2-4で確認した外部IP>

# オプション
GOOGLE_MODEL=gemini-2.0-flash
EOF
```

> `JWT_SECRET` の生成例: `openssl rand -base64 32`

### 2-7. 起動

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 2-8. 確認項目

| 確認内容 | 手順 |
|----------|------|
| 全サービス起動 | `docker compose ps` で全コンテナ running |
| フロント表示 | ブラウザで `http://<GCE_IP>:5173` |
| ログイン | テストユーザー `test@kensan.dev` / `password123` |
| AI チャット | ツール実行含むやり取り |
| Grafana | `http://<GCE_IP>:3000` でダッシュボード表示 |

---

## 環境変数一覧

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|-----------|------|
| `GOOGLE_API_KEY` | ローカル/本番 | (なし) | Google GenAI API キー |
| `AI_PROVIDER` | いいえ | `google` | AI プロバイダー |
| `GOOGLE_MODEL` | いいえ | `gemini-2.0-flash` | 使用する Gemini モデル |
| `JWT_SECRET` | 本番のみ | `dev-secret-key-...` | JWT 署名キー（本番は必ず変更） |
| `GCE_IP` | 本番のみ | `localhost` | フロントのビルド時 API URL に使用 |

---

## トラブルシューティング

### AI チャットが応答しない

```bash
# ai-service のログを確認
docker logs -f kensan-ai-service
```

- `GOOGLE_API_KEY` が未設定 → `google.genai.errors.APIError` が出る
- モデル名が間違っている → `404` エラー

### CORS エラー（GCE デプロイ時）

- `GCE_IP` が正しく設定されているか確認
- フロントの再ビルドが必要: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build frontend`

