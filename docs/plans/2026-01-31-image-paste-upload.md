# 画像ペーストアップロード実装計画

## 概要

MarkdownEditor上でCtrl+V（ペースト）した画像をMinIOにアップロードし、
Markdown画像記法 `![image](url)` としてエディタに挿入する。

**方式**: A案（先に下書き保存してからアップロード）

## フロー

```
ユーザーが画像をCtrl+V
  → TipTap paste event で clipboardData.files を検知
  → noteId がない（新規ノート）場合:
      → 自動で下書きノートをPOST（createNote）して noteId を取得
  → notesApi.createContentWithFile(noteId, file, 'image')
      → POST /notes/{noteId}/contents/upload-url（presigned URL取得）
      → PUT presigned URL（MinIOに直接アップロード）
      → POST /notes/{noteId}/contents（DB登録）
  → notesApi.getDownloadURL(noteId, contentId)
      → presigned download URL を取得
  → editor に ![image](downloadUrl) を挿入
```

## 変更ファイル一覧

### 1. パッケージ追加

```bash
npm install @tiptap/extension-image
```

### 2. `src/components/editor/MarkdownEditor.tsx`

**変更内容**: 画像ペースト対応

- props に `onImageUpload` コールバックを追加
- `@tiptap/extension-image` を TipTap extension に追加
- `editor.setOptions({ editorProps: { handlePaste } })` でペーストフック
- ペースト時に `clipboardData.files` から画像を検知
- アップロード中はプレースホルダー `![Uploading...]()` を表示
- アップロード完了後にプレースホルダーを実際のURLに差し替え

```typescript
// 追加する props
interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onImageUpload?: (file: File) => Promise<string>  // 追加: URL を返す
}
```

**TipTap extension 設定**:
```typescript
import Image from '@tiptap/extension-image'

// extensions に追加
Image.configure({
  inline: true,
  allowBase64: false,
})
```

**ペーストハンドラ**:
```typescript
handlePaste: (view, event) => {
  const files = event.clipboardData?.files
  if (!files?.length || !onImageUpload) return false

  const imageFile = Array.from(files).find(f => f.type.startsWith('image/'))
  if (!imageFile) return false

  event.preventDefault()

  // プレースホルダー挿入
  const placeholderId = `upload-${Date.now()}`
  editor.chain().focus().setImage({
    src: '',
    alt: placeholderId,  // 差し替え用ID
  }).run()

  // アップロード実行
  onImageUpload(imageFile).then(url => {
    // プレースホルダーをURLに差し替え
    // editor の content から placeholderId を探して src を更新
    const { doc } = editor.state
    doc.descendants((node, pos) => {
      if (node.type.name === 'image' && node.attrs.alt === placeholderId) {
        const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          src: url,
          alt: imageFile.name,
        })
        editor.view.dispatch(tr)
      }
    })
  }).catch(() => {
    // 失敗時はプレースホルダーを削除
    // ...
  })

  return true
}
```

### 3. `src/components/note/NoteEditor.tsx`

**変更内容**: `onImageUpload` コールバックを MarkdownEditor に渡す

- props に `noteId` と `onEnsureNoteId` を追加
- `onEnsureNoteId`: noteId がない場合に下書き保存して noteId を返すコールバック
- 画像アップロードロジック:

```typescript
interface NoteEditorProps {
  // ...既存 props
  noteId?: string
  onEnsureNoteId?: () => Promise<string>  // 追加
}

const handleImageUpload = async (file: File): Promise<string> => {
  // 1. noteId を確保（新規なら下書き保存）
  const id = noteId ?? await onEnsureNoteId?.()
  if (!id) throw new Error('Note ID is required for image upload')

  // 2. アップロード
  const content = await notesApi.createContentWithFile(id, file, 'image')

  // 3. download URL を取得して返す
  const url = await notesApi.getDownloadURL(id, content.id)
  return url
}
```

### 4. `src/pages/N02_NoteEdit.tsx`

**変更内容**: `noteId` と `onEnsureNoteId` を NoteEditor に渡す

- 新規ノートの場合、画像ペースト時に下書き保存する関数を定義
- 下書き保存後は isNew を false にし、URL を `/notes/{id}` に replace

```typescript
const [currentNoteId, setCurrentNoteId] = useState<string | undefined>(id)

const handleEnsureNoteId = async (): Promise<string> => {
  // 最小限のデータで下書きを作成
  const note = await createNote({
    type: editorValue.type,
    title: editorValue.title || '無題',
    content: editorValue.content || '',
    format: editorValue.format,
    date: editorValue.date,
  })
  setCurrentNoteId(note.id)
  // URLを差し替え（ブラウザ履歴はreplace）
  navigate(`/notes/${note.id}`, { replace: true })
  return note.id
}
```

## 画像の表示（読み込み時）

既存ノートを開いたとき、Markdown内の画像URLはpresigned URLなので有効期限がある。
現状は1時間有効なので問題ないが、長時間編集時の対応は今回のスコープ外とする。

## MinIOの presigned URL のCORS設定

MinIOにブラウザから直接PUT（presigned upload）するにはCORS設定が必要。

### docker-compose.yml にMinIO初期化を追加

```yaml
minio:
  # ...既存設定
  environment:
    MINIO_ROOT_USER: kensan
    MINIO_ROOT_PASSWORD: kensan-minio
```

### MinIO CORS設定（起動後にmc CLIで設定、または環境変数）

```bash
# コンテナ内で実行（初期化スクリプトに追加）
mc alias set local http://localhost:9000 kensan kensan-minio
mc anonymous set download local/kensan-notes  # 公開ダウンロード（presigned不要にする場合）

# CORS ポリシー
cat > /tmp/cors.json << 'EOF'
{
  "CORSRules": [{
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }]
}
EOF
mc cors set local/kensan-notes /tmp/cors.json
```

**代替案**: フロントからMinIOに直接PUTせず、バックエンド経由でアップロードする。
この場合 presigned URL は不要で CORS も不要。ただしバックエンドにファイルが経由するので
大きいファイルではメモリ使用量が増える。

→ **現状は presigned URL + CORS 設定で進める**。
  CORS 設定は MinIO コンテナの起動スクリプトに含める。

## 補足: MinIO初期化コンテナ

docker-compose.yml にCORS設定用の初期化コンテナを追加:

```yaml
minio-init:
  image: minio/mc:latest
  depends_on:
    minio:
      condition: service_healthy
  entrypoint: >
    /bin/sh -c "
    mc alias set local http://minio:9000 kensan kensan-minio &&
    mc mb --ignore-existing local/kensan-notes &&
    echo '{\"CORSRules\":[{\"AllowedOrigins\":[\"http://localhost:5173\"],\"AllowedMethods\":[\"GET\",\"PUT\"],\"AllowedHeaders\":[\"*\"],\"MaxAgeSeconds\":3600}]}' | mc cors set local/kensan-notes /dev/stdin
    "
  networks:
    - kensan-network
```

## テスト方法

1. `make up` で全サービス起動
2. ブラウザで `/notes/new?type=learning` を開く
3. スクリーンショットをCtrl+Vで貼り付け
4. エディタに `![Uploading...]()` が表示される
5. アップロード完了後に画像が表示される
6. ノートを保存
7. ノートを再度開いて画像が表示されることを確認

## 実装順序

1. `npm install @tiptap/extension-image`
2. MinIO CORS設定（docker-compose.yml に minio-init 追加）
3. MarkdownEditor.tsx に画像ペーストハンドラ追加
4. NoteEditor.tsx に `onImageUpload` + `noteId` props追加
5. N02_NoteEdit.tsx に `onEnsureNoteId` 実装
6. 動作確認
