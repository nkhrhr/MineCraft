# === 第一章：失われた遺跡 ===
title @p title §6第一章
title @p subtitle §r失われた遺跡
tellraw @p {"rawtext":[{"text":"§e老賢者アルト：§r 古代の遺跡を探し、三つの秘宝を見つけるのじゃ。"}]}
tellraw @p {"rawtext":[{"text":"§7ヒント：北の森の奥に遺跡の入口がある...§r"}]}
playsound random.levelup @p
tag @p add quest_chapter1
scoreboard objectives add story_progress dummy "物語進行度"
scoreboard players set @p story_progress 0
