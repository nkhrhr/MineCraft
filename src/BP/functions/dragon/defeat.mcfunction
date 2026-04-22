# === ドラゴン撃破時の演出 ===
tellraw @a {"rawtext":[{"text":"§6§l=== 偉大なる勝利 ===§r"}]}
tellraw @a {"rawtext":[{"text":"§b恐ろしいファイアドラゴンが倒された！§r"}]}
tellraw @a {"rawtext":[{"text":"§e勇者の名は永遠に語り継がれるだろう...§r"}]}

# 勝利の効果音
playsound ui.toast.challenge_complete @a
playsound random.levelup @a

# 勝利のエフェクト
particle minecraft:totem_particle ~ ~ ~ 5 5 5 0.5 100
effect @a[r=20] regeneration 30 2 true
effect @a[r=20] hero_of_the_village 600 1 true

# 天気を晴れに戻す
weather clear
time set day

# 特別なタグを付与
tag @a[r=20] add dragon_slayer
