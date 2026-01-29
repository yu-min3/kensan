# Claude Code 効率化レポート

**日付**: 2026-01-28
**対象セッション**: フローティングメモ改善 + 確認ダイアログのカスタム化

---

## 実施した作業

### 概要
- FloatingMemoButtonの改善（一覧/入力の同時表示）
- ConfirmPopover / InputPopover コンポーネントの新規作成
- 11箇所の `window.confirm/prompt` をカスタムコンポーネントに置換

### 主要な変更ファイル
| ファイル | 行数 | 操作 |
|---------|------|------|
| T01_TaskManagement.tsx | ~1250行 | 複数回Read + 多数のEdit |
| FloatingMemoButton.tsx | ~250行 | Read + Edit |
| TimeBlockTimeline.tsx | ~450行 | Read + Edit |
| その他10ファイル | - | Read + Edit |

---

## 非効率だった点

### 1. 同一ファイルの複数回読み込み

```
T01_TaskManagement.tsx を6回以上Read
├─ 初回: 全体把握
├─ 編集後: linterによる変更で再Read
├─ 別箇所編集: offsetで部分Read
└─ 繰り返し...
```

**原因**:
- Editツールの「File has been modified since read」エラー
- linterが自動実行され、読み込んだ内容と実ファイルが不一致

### 2. 編集の細切れ実行

同じファイル内の複数箇所を1つずつ編集。その度にファイル変更検知が走り再読み込みが必要に。

### 3. パターン検索の活用不足

ファイル全体を読んでから編集箇所を探すより、Grepで先に特定すべきだった。

---

## 改善策

### 1. Subagentへの委譲

**探索フェーズ**:
```
Task(Explore) で調査
→ 要約だけメインコンテキストに返る
→ 途中の試行錯誤がメインを汚さない
```

**大規模編集**:
```
Task(general-purpose) で編集を委譲
→ subagent内で Read/Edit の試行錯誤
→ 完了報告だけメインに返る
```

### 2. 一括読み込み + 一括編集

```typescript
// 悪い例: 1つずつ読んで編集
Read(file1) → Edit(file1) → Read(file2) → Edit(file2)

// 良い例: 並列読み込み後にまとめて編集
Read(file1) + Read(file2) + Read(file3)  // 並列
→ Edit(file1) + Edit(file2) + Edit(file3)  // 並列または連続
→ 最後にビルド確認
```

### 3. replace_all の活用

同じパターンが複数箇所にある場合は `replace_all: true` で一括置換。
今回は途中から気づいて使用したが、最初から意識すべきだった。

### 4. Grepでの事前調査

```bash
# 編集前に全箇所を把握
Grep("window.confirm") → 13箇所特定
→ 計画的に編集
```

### 5. linter対策

- 編集前に `.eslintrc` や lint設定を把握
- まとめて編集してから一度だけビルド確認
- 細切れ編集を避ける

---

## 推奨ワークフロー

### 大規模リファクタリング時

```
1. Task(Explore) で現状調査・影響範囲把握
   └─ メインコンテキストには要約のみ

2. 編集計画を立てる（何をどの順で変更するか）

3. 関連ファイルを並列で一括Read

4. 編集を連続実行（途中でReadしない）
   - replace_all活用
   - 長めのコンテキストで一意特定

5. 最後にビルド確認

6. エラーがあれば該当箇所のみ修正
```

### 単純な修正時

```
1. Grepで対象箇所を特定

2. 必要な部分だけRead（offset/limit活用）

3. Edit

4. ビルド確認
```

---

## 今後の検討事項

1. **subagent活用の判断基準**
   - 3ファイル以上に跨る変更 → subagent検討
   - 探索が必要 → Task(Explore)
   - 単一ファイルの局所変更 → 直接Edit

2. **コンテキスト消費の見積もり**
   - 1000行超のファイルは部分Readを優先
   - 全体把握が必要な場合はsubagentに委譲

3. **linterとの共存**
   - 自動フォーマットの挙動を事前把握
   - 編集をバッチ化してlinter実行回数を減らす
