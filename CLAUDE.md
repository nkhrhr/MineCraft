# Arlt Story — Minecraft Bedrock アドオン

## プロジェクト概要

10歳の晄希（Koki）と父親で作る Minecraft Bedrock Edition の物語アドオン。
晄希が「創造・言語化・ディレクション能力」を育てるための仕組み。

## 教育思想

プログラミングを教えるプロジェクトではない。目的は：
- **創造**: 頭の中のイメージを物語として構想する
- **言語化**: そのイメージを他者（Claude）が実行できる精度で言葉にする
- **ディレクション**: 実装結果と自分のビジョンの差分を認識し、改善指示を出す

晄希が GitHub Issue にアイデアを書く → Claude が実装する → 結果を見て次の Issue を書く。
このサイクルの中で「仕様を書く力」が自然に育つ。

## PDCA ループ

```
🌙 夜: 晄希が iDoraPad でアイデアを書く（ダッシュボード or GitHub Issue）
🤖 Claude Code が読んで実装 → push
⚙️ GitHub Actions が毎晩 0時 JST に自動ビルド（.mcworld + .mcaddon）
📱 夕方: iDoraPad で DL → Minecraft にインポート → Realm アップロード
🎮 Switch で Realms 参加して遊ぶ
```

## デバイス構成

| デバイス | 役割 |
|---|---|
| Mac | Claude Code で開発 |
| iPad (iDoraPad) | テスト・Realm アップロード・アイデア入力 |
| Nintendo Switch | 晄希がプレイ |

Switch は .mcaddon を直接インストールできない（Nintendo ポリシー）。
iPad 経由 Realms が唯一の実用解。

## リポジトリ構造

```
src/
├── BP/                    # Behavior Pack
│   ├── manifest.json      # UUID: d46eac87... (module: f9189dce...)
│   ├── dialogue/          # NPC 会話 JSON
│   ├── functions/story/   # mcfunction（物語進行コマンド）
│   ├── items/             # カスタムアイテム
│   ├── entities/          # カスタムエンティティ
│   └── texts/ja_JP.lang   # 日本語テキスト（晄希が編集する場所）
└── RP/                    # Resource Pack
    ├── manifest.json      # UUID: d68eb447... (module: 8f1e0109...)
    └── texts/             # 言語ファイル

scripts/                   # ビルド・バリデーション
.github/workflows/         # CI: validate / release / nightly-build
docs/                      # インストール手順・ストーリー設計・ダッシュボード
```

BP の dependency は RP header UUID (d68eb447...) を指す。この関係を壊さないこと。

## コマンド

```bash
npm run validate           # JSON 構文チェック（全 src/ 内 .json）
npm run check-uuids        # UUID 整合性チェック（BP↔RP dependency）
npm run pack               # .mcpack + .mcaddon ビルド → dist/
npm run create-world       # .mcworld ビルド → dist/
npm run bump-version patch # バージョンインクリメント（manifest 自動同期）
npm run release            # validate + pack + create-world
```

## 開発ルール

### アドオン変更時
1. `src/BP/` または `src/RP/` 配下のファイルを編集
2. `npm run validate` で JSON チェック
3. `npm run check-uuids` で UUID 整合性確認
4. コミット → push（nightly-build.yml が毎晩自動ビルド）

### バージョンルール
- `version.json` が master、`npm run bump-version` で manifest も同期される
- 手動で manifest.json の version を編集しない

### 新しい物語要素を追加する時
- NPC 会話: `src/BP/dialogue/` に JSON 追加
- ゲームロジック: `src/BP/functions/story/` に .mcfunction 追加
- アイテム: `src/BP/items/` に JSON 追加
- エンティティ: `src/BP/entities/` に JSON 追加
- 日本語テキスト: `src/BP/texts/ja_JP.lang` と `src/RP/texts/ja_JP.lang` に追記
- ストーリー設計メモ: `docs/story/` に .md 追加

### JSON フォーマット
- Bedrock Edition の format_version に注意（manifest: 2, entity: "1.20.0", dialogue: "1.17.0"）
- NPC ダイアログの commands 内は `/command` 形式（先頭スラッシュ必須）
- ダイアログの対象プレイヤーは `@initiator`（`@p` ではない）

### コミットメッセージ
```
feat(chapter3): 古代遺跡ダンジョン追加
fix(dialogue): NPCの会話が表示されない問題を修正
docs: ストーリー設計メモ更新
chore: バージョン 1.1.0 に更新
```

## リリースフロー

### 自動（nightly）
master に push → 毎晩 0時 JST に GitHub Actions が自動ビルド → prerelease 作成

### 手動（正式リリース）
```bash
npm run bump-version minor
git add -A && git commit -m "chore: バージョン x.y.0"
git tag vx.y.0
git push origin master --tags
```
→ release.yml が正式 Release 作成

## 今後の予定

- [ ] Cloudflare Pages + Workers + D1 で晄希専用ダッシュボード構築
  - アイデア入力フォーム → GitHub Issue 自動作成
  - 最新ビルド DL ボタン
  - 成長記録ログ（過去のアイデア一覧）
  - 冒険者レベルシステム
- [ ] iOS Shortcuts で .mcworld 自動ダウンロード通知
