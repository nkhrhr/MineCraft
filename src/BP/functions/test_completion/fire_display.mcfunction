# === ドラゴンが火の息で「テスト完了」を表示 ===
tellraw @a {"rawtext":[{"text":"§c§lドラゴンが火の息で文字を書いている！§r"}]}

# 現在のテスト完了ドラゴンに文字表示イベントを送信
event entity @e[type=story:test_completion_dragon,r=50] story:fire_text

# 追加の火花エフェクト
particle minecraft:flame_particle ~ ~18 ~8 20 4 2 0.1 300
particle minecraft:flame_particle ~ ~18 ~-8 20 4 2 0.1 300
particle minecraft:lava_particle ~ ~16 ~0 15 3 12 0.05 150
particle minecraft:campfire_smoke_particle ~ ~22 ~0 25 8 15 0.02 200

# 勝利の音
playsound ui.toast.challenge_complete @a
playsound random.levelup @a
