#!/bin/bash
set -euo pipefail

# === 設定 ===
INSTANCE_NAME="kensan-app"
ZONE="asia-northeast1-a"
MACHINE_TYPE="e2-standard-4"

# === Step 1: GCEインスタンス作成 ===
echo "=== Step 1: インスタンス作成 ==="
gcloud compute instances create "$INSTANCE_NAME" \
  --zone="$ZONE" \
  --machine-type="$MACHINE_TYPE" \
  --image-family=ubuntu-2404-lts-amd64 \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --tags=http-server,https-server

# === Step 2: ファイアウォール設定 ===
echo "=== Step 2: ファイアウォール設定 ==="
gcloud compute firewall-rules create allow-kensan \
  --allow tcp:80,tcp:443,tcp:3000,tcp:5173,tcp:8081-8091 \
  --target-tags=http-server || echo "ファイアウォールルールは既に存在します"

# === Step 3: 外部IP確認 ===
echo "=== Step 3: 外部IP ==="
GCE_IP=$(gcloud compute instances describe "$INSTANCE_NAME" \
  --zone="$ZONE" \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
echo "外部IP: $GCE_IP"

echo ""
echo "=== 次のステップ ==="
echo "1. SSH接続:  gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo "2. GCE上でDockerインストール・リポジトリ取得・.env作成・起動"
echo "3. 確認: http://$GCE_IP:5173"
