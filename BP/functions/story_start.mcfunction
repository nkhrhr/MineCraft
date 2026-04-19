# 物語開始
say §6§l=== 物語の始まり ===
title @a title §6第一章
title @a subtitle §r失われた遺跡
playsound mob.guardian.curse @a ~ ~ ~ 1 0.8

# プレイヤーにタグ付与
tag @a add story_active

# NPCをスポーン
summon story:npc_guide ~ ~ ~

# スコアボード設定
scoreboard objectives add story_progress dummy "物語進行度"
scoreboard players set @a story_progress 0
