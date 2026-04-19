# Arlt Story — Minecraft Bedrock アドオン

晄希（Koki）のためのマインクラフト物語アドオン。Nintendo Switch で遊べます。

## PDCA ループ

```
🌙 夜：晄希がアイデアを音声入力 → Claude Code が実装・push
🤖 GitHub Actions が自動で .mcaddon ビルド
🏠 夕方：PC で Release DL → Realm アップロード → Switch で即プレイ
```

## 構成

```
src/
├── BP/                          # Behavior Pack
│   ├── manifest.json
│   ├── dialogue/narrator.json   # NPC会話（老賢者アルト）
│   ├── functions/story/         # mcfunction（物語進行）
│   └── texts/ja_JP.lang         # ← 晄希が物語テキスト編集
└── RP/                          # Resource Pack
    ├── manifest.json
    └── texts/
scripts/                         # ビルド・リンク用スクリプト
.github/workflows/               # CI: JSON検証 + 自動リリース
docs/story/                      # ストーリー設計メモ
```

## クイックスタート

### PC 開発
```powershell
# シンボリックリンク作成（管理者 PowerShell）
.\scripts\link-to-minecraft.ps1

# ゲーム内で
/function story/intro
```

### Switch で遊ぶ
1. PC で Realm にワールドをアップロード
2. Switch → Realms タブ → 参加（同じ Microsoft アカウント）

### リリース作成
```bash
npm install
npm run validate          # JSON 検証
npm run pack              # .mcaddon ビルド
git tag v1.0.0 && git push --tags   # → GitHub Actions が Release 作成
```

## 動作要件

- Minecraft Bedrock Edition 1.21.0+
- Nintendo Switch は Realms 経由で参加
