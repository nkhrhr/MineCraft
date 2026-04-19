# ストーリー状況確認

現在の物語アドオンの状態を一覧表示する。

## やること

1. `src/BP/dialogue/` 内のシーン一覧を取得（scene_tag と npc_name）
2. `src/BP/functions/story/` 内の mcfunction 一覧
3. `src/BP/items/` 内のカスタムアイテム一覧
4. `src/BP/entities/` 内のカスタムエンティティ一覧
5. `docs/story/` 内のストーリー設計メモ一覧
6. `gh issue list --repo nkhrhr/MineCraft --label story --state open` で未実装アイデア一覧
7. `gh issue list --repo nkhrhr/MineCraft --label story --state closed` で実装済みアイデア数
8. `version.json` から現在のバージョン
9. 最新の GitHub Release 情報

## 出力フォーマット

以下の形式で日本語レポート:

```
📖 Arlt Story — 現在の状態

バージョン: x.y.z
最新リリース: (日時)

📜 ストーリー構成:
  - (シーン一覧)

⚔️ アイテム:
  - (アイテム一覧)

👤 キャラクター:
  - (エンティティ一覧)

📝 未実装アイデア: N件
  - #xx: (タイトル)

✅ 実装済み: N件
```
