# 晄希のアイデアを実装する

GitHub Issue から最新のアイデアを読み取り、アドオンに実装する。

## 手順

1. `gh issue list --repo nkhrhr/MineCraft --label story --state open` で未実装のアイデアを取得
2. 最新の Issue を読み、何を実装すべきか把握する
3. 以下のファイルを必要に応じて追加・編集:
   - `src/BP/dialogue/` — NPC 会話
   - `src/BP/functions/story/` — mcfunction コマンド
   - `src/BP/items/` — カスタムアイテム
   - `src/BP/entities/` — カスタムエンティティ
   - `src/BP/texts/ja_JP.lang` — 日本語テキスト
   - `src/RP/texts/ja_JP.lang` — RP側テキスト
   - `docs/story/` — ストーリー設計メモ
4. `npm run validate` と `npm run check-uuids` で検証
5. コミット → push（コミットメッセージに `Closes #Issue番号` を含める）
6. Issue をクローズ
7. 実装内容のサマリーを日本語で報告

## 注意

- NPC ダイアログの commands は `/command` 形式（先頭スラッシュ必須）
- ダイアログ内の対象は `@initiator`
- 新しい UUID が必要な場合は `uuidgen` で生成
- 晄希のアイデアの意図を汲み取って、言語化が足りない部分は補完する（10歳の文章なので）
- ただし勝手にアイデアを変えない。足りない部分を補うだけ
