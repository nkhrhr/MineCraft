# === ドラゴンが火の息で「テスト完了」を表示 ===
tellraw @a {"rawtext":[{"text":"§c§lドラゴンが火の息で「テスト完了」の文字を書いている！§r"}]}
tellraw @a {"rawtext":[{"text":"§e装飾斧を振りながら空中に炎の文字を描いている...§r"}]}

# 現在のテスト完了ドラゴンに文字表示イベントを送信
event entity @e[type=story:test_completion_dragon,r=50] story:fire_text

# 追加の火花エフェクト（文字を形作るように）
particle minecraft:flame_particle ~ ~18 ~8 20 4 2 0.1 300
particle minecraft:flame_particle ~ ~18 ~-8 20 4 2 0.1 300
particle minecraft:lava_particle ~ ~16 ~0 15 3 12 0.05 150
particle minecraft:campfire_smoke_particle ~ ~22 ~0 25 8 15 0.02 200

# 星とキラキラの追加エフェクト
particle minecraft:end_rod ~ ~20 ~0 12 5 8 0.2 100
particle minecraft:totem_particle ~ ~18 ~0 10 6 10 0.3 80

# 勝利の音（チャイムのような音）
playsound ui.toast.challenge_complete @a
playsound random.levelup @a
playsound note.chime @a ~ ~ ~ 1.0 1.2
