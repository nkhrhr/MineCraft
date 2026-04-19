# MineCraft - 物語アドオン

マインクラフト Bedrock Edition 用のストーリー体験アドオンです。

## 構成

```
MineCraft/
├── BP/                          # Behavior Pack
│   ├── manifest.json
│   ├── entities/
│   │   └── story_npc.json       # NPCキャラクター
│   ├── dialogue/
│   │   ├── story_dialogue_1.json # 第一章ダイアログ
│   │   ├── story_dialogue_2.json # 第二章ダイアログ
│   │   └── story_dialogue_3.json # 第三章ダイアログ
│   ├── items/
│   │   └── story_item.json      # 古代の鍵
│   ├── functions/
│   │   ├── story_start.mcfunction         # 物語開始
│   │   └── story_chapter_progress.mcfunction # チャプター進行
│   └── texts/
│       └── ja_JP.lang           # 日本語テキスト
└── RP/                          # Resource Pack
    ├── manifest.json
    ├── entity/
    │   └── story_npc.entity.json # NPCクライアント定義
    └── textures/
        ├── items/               # アイテムテクスチャ
        └── entity/              # エンティティテクスチャ
```

## 使い方

1. `BP` フォルダを `com.mojang/development_behavior_packs/` にコピー
2. `RP` フォルダを `com.mojang/development_resource_packs/` にコピー
3. ワールド設定でアドオンを有効化
4. ゲーム内で `/function story_start` を実行して物語を開始

## 動作要件

- Minecraft Bedrock Edition 1.20.0 以上
