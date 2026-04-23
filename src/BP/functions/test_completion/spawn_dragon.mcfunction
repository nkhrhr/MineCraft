# === テスト完了ドラゴンのスポーン ===
tellraw @p {"rawtext":[{"text":"§6§l装飾斧を持った勝利のドラゴンが現れる！§r"}]}
tellraw @p {"rawtext":[{"text":"§7大きな両刃の斧を持ち、テスト完了を祝福してくれる...§r"}]}

# ドラゴンを上空にスポーン
summon story:test_completion_dragon ~ ~15 ~

# 初期エフェクト
playsound mob.enderdragon.growl @a[r=30]
particle minecraft:totem_particle ~ ~15 ~ 5 5 5 0.3 100
