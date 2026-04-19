# インストール手順

## PC (開発用)

### 1. シンボリックリンク（推奨）
```powershell
# 管理者権限の PowerShell で実行
.\scripts\link-to-minecraft.ps1
```

### 2. 手動コピー
- `src/BP` → `com.mojang/development_behavior_packs/arlt_story_BP/`
- `src/RP` → `com.mojang/development_resource_packs/arlt_story_RP/`

### 3. ワールド設定
- 新規ワールド作成
- 「実験的ゲームプレイ」ON
- Behavior Pack / Resource Pack を有効化

## Nintendo Switch (Realms 経由)

1. PC でワールドを開く
2. メニュー → Realm にワールドをアップロード
3. Switch → Minecraft → Play → Realms タブ → 参加
4. アドオンは自動でダウンロードされる

## .mcaddon からインストール (PC)

1. [Releases](../../releases) から `.mcaddon` をダウンロード
2. ダブルクリック → Minecraft が自動インポート
