# === 継続的なエフェクト（夜でも映える） ===
# 火花エフェクト（星のようにキラキラ）
particle minecraft:totem_particle ~ ~10 ~ 5 5 5 0.2 40
particle minecraft:flame_particle ~ ~8 ~ 3 3 3 0.1 60
particle minecraft:lava_particle ~ ~12 ~ 2 2 2 0.05 30

# 煙エフェクト
particle minecraft:campfire_smoke_particle ~ ~15 ~ 8 5 8 0.01 80

# 星とキラキラエフェクト（夜に映える）
particle minecraft:end_rod ~ ~5 ~ 4 4 4 0.1 20
particle minecraft:enchanting_table_particle ~ ~8 ~ 6 6 6 0.3 30

# お祝いの音（小さな音）
playsound block.fire.ambient @a[r=20] ~ ~ ~ 0.3
playsound random.pop @a[r=15] ~ ~ ~ 0.2
