# Bedrock JSON スキーマ（vendored snapshot）

Blockception の [Minecraft-bedrock-json-schemas](https://github.com/Blockception/Minecraft-bedrock-json-schemas)
から snapshot した JSON Schema。`scripts/validate.js` が AJV 経由で使う。

## 使い方

```bash
npm run validate           # スキーマ警告は exit 0（デフォルト）
STRICT=1 npm run validate  # スキーマ違反でも exit 1
```

JSON parse エラーは常に hard fail（STRICT 無しでも落ちる）。

## ファイル

| ファイル | 対象 | 検証対象パス |
|---|---|---|
| `manifest.schema.json` | Pack manifest | `src/BP/manifest.json`, `src/RP/manifest.json` |
| `entity.schema.json`   | エンティティ定義 | `src/BP/entities/*.json` |
| `dialogue.schema.json` | NPC ダイアログ | `src/BP/dialogue/*.json` |
| `items.schema.json`    | カスタムアイテム | `src/BP/items/*.json` |

それ以外のファイル（loot_tables, functions/tick.json など）は JSON parse のみ。

## 更新方法

Blockception 側で修正が入った時は `.source-sha` を書き換えて再取得：

```bash
NEW_SHA=$(curl -s https://api.github.com/repos/Blockception/Minecraft-bedrock-json-schemas/commits/main | jq -r .sha)
for pair in "general/manifest.json:schemas/manifest.schema.json" \
            "behavior/entities/entities.json:schemas/entity.schema.json" \
            "behavior/dialogue/dialogue.json:schemas/dialogue.schema.json" \
            "behavior/items/items.json:schemas/items.schema.json"; do
  src="${pair%%:*}"; dst="${pair##*:}"
  curl -sf "https://raw.githubusercontent.com/Blockception/Minecraft-bedrock-json-schemas/$NEW_SHA/$src" -o "$dst"
done
echo "$NEW_SHA" > schemas/.source-sha
npm run validate   # 既存ファイルで false positive が出ないか確認
```

## なぜ警告で済ませるか

Blockception のスキーマは公式の Vanilla 追従が遅れることがある。`minecraft:pushable` のような新コンポーネントや、`deals_damage` の型変更（bool → enum）で **実装は正しいのにスキーマが追い付いていない** ケースが出る。

Parse エラー（=JSON 自体が壊れている）は Claude が生成ミスしている証拠なので hard fail。スキーマ違反は「一旦警告」で開発を止めず、気になる警告は STRICT で個別検証する運用。
