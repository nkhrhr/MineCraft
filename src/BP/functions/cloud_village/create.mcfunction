# === 雲の上の秘密の村を作成 ===
tellraw @p {"rawtext":[{"text":"§b雲の上の秘密の村に到着！§r"}]}
title @p title §b雲の上の村
title @p subtitle §r秘密の場所を発見した

# 雲のブロックで地面を作る
fill ~-10 ~ ~-10 ~10 ~ ~10 white_wool
fill ~-8 ~1 ~-8 ~8 ~1 ~8 light_blue_wool

# 村人をスポーン
summon story:cloud_villager ~3 ~2 ~3
summon story:cloud_villager ~-3 ~2 ~-3
summon story:cloud_villager ~0 ~2 ~5

# 簡単な家を建てる
fill ~-5 ~2 ~-5 ~-2 ~5 ~-2 quartz_block
fill ~-4 ~2 ~-4 ~-3 ~4 ~-3 air
fill ~2 ~2 ~2 ~5 ~5 ~5 quartz_block
fill ~3 ~2 ~3 ~4 ~4 ~4 air

# 効果音とエフェクト
playsound mob.villager.haggle @p
effect @p regeneration 10 1 true
