# === 最終祝福エフェクト ===
tellraw @a {"rawtext":[{"text":"§6§l🎉 テスト完了！おめでとう！ 🎉§r"}]}
tellraw @a {"rawtext":[{"text":"§e装飾斧を持ったドラゴンが勇者を称えている...§r"}]}

# 大規模なお祝いエフェクト
particle minecraft:totem_particle ~ ~10 ~ 10 10 10 0.5 200
particle minecraft:flame_particle ~ ~15 ~ 8 8 8 0.3 150
particle minecraft:end_rod ~ ~8 ~ 6 6 6 0.2 100

# 全プレイヤーに特別な効果
effect @a regeneration 30 2 true
effect @a hero_of_the_village 300 1 true
effect @a night_vision 120 0 true

# 勝利の音楽
playsound ui.toast.challenge_complete @a
playsound random.levelup @a
playsound mob.enderdragon.growl @a ~ ~ ~ 0.5

# 天候を元に戻す
schedule function test_completion/cleanup 100

# 特別なタグ付与
tag @a add test_completed
