# === ファイアドラゴンのスポーン ===
tellraw @p {"rawtext":[{"text":"§c§l警告！巨大なドラゴンが接近中！§r"}]}
tellraw @p {"rawtext":[{"text":"§7空から炎を吐くドラゴンが現れる...準備はいいか？§r"}]}

# ドラゴンをスポーン（少し上空に）
summon story:fire_dragon ~ ~10 ~

# 効��音とエフェクト
playsound mob.enderdragon.growl @a[r=30]
playsound ambient.weather.thunder @a[r=30]

# プレイヤーに警告メッセージ
title @p title §c§l危険！
title @p subtitle §rドラゴンから逃げろ！

# 炎のパーティクルエフェクト
particle minecraft:lava_particle ~ ~8 ~ 3 3 3 0.1 50
particle minecraft:flame_particle ~ ~8 ~ 2 2 2 0.1 30

# 夜にして雰囲気を演出
time set night
weather thunder
