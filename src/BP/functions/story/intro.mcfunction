# === 古の森の物語 - イントロ ===
tellraw @p {"rawtext":[{"text":"§6=== 古の森の物語 ===§r"}]}
tellraw @p {"rawtext":[{"text":"勇者よ、北の塔を目指すのじゃ..."}]}
effect @p night_vision 30 0 true
give @p filled_map
playsound mob.wither.spawn @p
tag @p add story_started
