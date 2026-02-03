# GCE 開発ガイド

GCE (Google Compute Engine) 上での Kensan アプリケーションの運用・開発手順をまとめる。

---

## インスタンス情報

| 項目 | 値 |
|------|-----|
| インスタンス名 | `kensan-app` |
| ゾーン | `asia-northeast1-a` |
| マシンタイプ | `e2-standard-4` (4 vCPU / 16GB RAM) |
| OS | Ubuntu 24.04 LTS |
| ディスク | 50GB (使用 13GB / 空き 35GB) |
| 外部IP | `35.200.23.113` |
| GCP プロジェクト | `kensan-486212` |

---

## SSH 接続

```bash
gcloud compute ssh kensan-app --zone=asia-northeast1-a
```

コマンドをリモート実行する場合:

```bash
gcloud compute ssh kensan-app --zone=asia-northeast1-a --command="<コマンド>"
```

---

## リポジトリ構成 (GCE 上)

```
~/kensan-mockup/
├── docker-compose.yml          # ベース構成
├── docker-compose.prod.yml     # GCE用オーバーライド（API URL、JWT、AIプロバイダー設定）
├── .env                        # 環境変数（JWT_SECRET, GCE_IP, GOOGLE_API_KEY 等）
└── scripts/gce-deploy.sh       # 初回セットアップスクリプト
```

### .env の内容

```
JWT_SECRET=$(openssl rand -base64 32)
GCE_IP=35.200.23.113
GOOGLE_MODEL=gemini-2.0-flash
GOOGLE_API_KEY=<Gemini APIキー>
```

### docker-compose.prod.yml の役割

- フロントエンドのビルド引数に `GCE_IP` を注入（`VITE_*_SERVICE_URL`）
- 各バックエンドサービスに `JWT_SECRET` を注入
- AI サービスのプロバイダーを `google` (Gemini) に設定

---

## 基本オペレーション

### デプロイ（git pull → 再ビルド → 起動）

```bash
gcloud compute ssh kensan-app --zone=asia-northeast1-a --command="\
  cd kensan-mockup && \
  git pull && \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build"
```

**注意**: PostgreSQL の起動完了前に他サービスが接続を試みて失敗することがある。その場合はサービスを再起動する:

```bash
gcloud compute ssh kensan-app --zone=asia-northeast1-a --command="\
  cd kensan-mockup && \
  docker compose restart user-service task-service timeblock-service analytics-service memo-service"
```

### 停止

```bash
gcloud compute ssh kensan-app --zone=asia-northeast1-a --command="\
  cd kensan-mockup && docker compose down"
```

### ログ確認

```bash
# 全サービス
gcloud compute ssh kensan-app --zone=asia-northeast1-a --command="\
  cd kensan-mockup && docker compose logs --tail=50"

# 特定サービス
gcloud compute ssh kensan-app --zone=asia-northeast1-a --command="\
  cd kensan-mockup && docker compose logs --tail=50 ai-service"
```

### ヘルスチェック

```bash
gcloud compute ssh kensan-app --zone=asia-northeast1-a --command="\
  curl -s http://localhost:8081/health && echo '' && \
  curl -s http://localhost:8082/health && echo '' && \
  curl -s http://localhost:8084/health && echo '' && \
  curl -s http://localhost:8088/health && echo '' && \
  curl -s http://localhost:8089/health && echo '' && \
  curl -s http://localhost:8090/health && echo '' && \
  curl -s http://localhost:8091/health"
```

### コンテナ状態確認

```bash
gcloud compute ssh kensan-app --zone=asia-northeast1-a --command="\
  cd kensan-mockup && docker compose ps -a"
```

### DB 直接操作

```bash
gcloud compute ssh kensan-app --zone=asia-northeast1-a --command="\
  docker exec -i kensan-postgres psql -U kensan -d kensan -c '<SQL>'"
```

### デモデータ投入

```bash
gcloud compute ssh kensan-app --zone=asia-northeast1-a --command="\
  cd kensan-mockup && bash scripts/demo-seed/apply.sh"
```

---

## サービス一覧とポート

| サービス | ポート | ヘルスチェック |
|----------|--------|----------------|
| frontend | 5173 | `http://<GCE_IP>:5173` |
| user-service | 8081 | `/health` |
| task-service | 8082 | `/health` |
| timeblock-service | 8084 | `/health` |
| analytics-service | 8088 | `/health` |
| ai-service | 8089 | `/health` |
| memo-service | 8090 | `/health` |
| note-service | 8091 | `/health` |
| PostgreSQL | 5432 | 内部のみ |
| MinIO (API) | 9000 | 内部のみ |
| MinIO (Console) | 9001 | 内部のみ |
| Grafana | 3000 | `http://<GCE_IP>:3000` |
| Prometheus | 9090 | 内部のみ |
| Loki | 3100 | 内部のみ |
| Tempo | 3200 | 内部のみ |
| OTel Collector | 4317-4318 | 内部のみ |

---

## ネットワーク / ファイアウォール

ファイアウォールルール `allow-kensan` で以下を全IP (`0.0.0.0/0`) に公開:

| ポート | 用途 |
|--------|------|
| 80, 443 | HTTP / HTTPS |
| 3000 | Grafana |
| 5173 | フロントエンド |
| 8081-8091 | バックエンド API |

**セキュリティ上の注意**:
- バックエンド API は JWT 認証で保護。認証なしでアクセスできるのは `/health` のみ。
- DB (5432) は外部非公開。
- AI サービスは Gemini API (GOOGLE_API_KEY) を使用。コスト管理は Google Cloud コンソールの Quota で制限可能。
- デモ終了後はファイアウォールルールを削除すること:
  ```bash
  gcloud compute firewall-rules delete allow-kensan
  ```

---

## トラブルシューティング

### サービスが起動直後に Exited (1) になる

**原因**: PostgreSQL の起動完了前にサービスが接続を試みて失敗。docker-compose の `depends_on: condition: service_healthy` は設定済みだが、タイミングによっては間に合わないことがある。

**対処**: 落ちたサービスを再起動する:

```bash
gcloud compute ssh kensan-app --zone=asia-northeast1-a --command="\
  cd kensan-mockup && docker compose restart user-service task-service timeblock-service analytics-service memo-service"
```

### フロントエンドから API に接続できない

**原因**: フロントエンド (SPA) はブラウザから直接バックエンド API を呼ぶ。`docker-compose.prod.yml` のビルド引数 `VITE_*_SERVICE_URL` に正しい `GCE_IP` が設定されている必要がある。

**確認**: `.env` の `GCE_IP` が現在の外部 IP と一致しているか確認:

```bash
gcloud compute instances describe kensan-app --zone=asia-northeast1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

IP が変わった場合は `.env` を更新して再ビルドが必要。

### minio-init が Exited になっている

**正常**: minio-init は初期化ジョブであり、完了後に終了するのは想定通り。

---

## 初回セットアップ手順

新規にインスタンスを作成する場合は `scripts/gce-deploy.sh` を参照。概要:

1. `gcloud compute instances create` でインスタンス作成
2. ファイアウォールルール作成
3. SSH 接続して Docker インストール
4. リポジトリ clone
5. `.env` 作成
6. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`
