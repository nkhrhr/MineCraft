# === 空飛ぶ馬のスポーン ===
tellraw @p {"rawtext":[{"text":"§6空飛ぶ馬が現れた！§r"}]}
tellraw @p {"rawtext":[{"text":"§7この馬に乗って雲の上の秘密の村を探そう...§r"}]}
summon story:flying_horse ~ ~ ~
playsound mob.horse.breathe @p
effect @p night_vision 60 0 true
