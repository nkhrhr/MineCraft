# === 演出終了後のクリーンアップ ===
tellraw @a {"rawtext":[{"text":"§7演出終了。ドラゴンは満足そうに去って行った...§r"}]}

# 天候と時間を元に戻す
weather clear
time set day

# ドラゴンを消去
tp @e[type=story:test_completion_dragon] ~ ~200 ~
kill @e[type=story:test_completion_dragon]

# 最後のメッセージ
tellraw @a {"rawtext":[{"text":"§b§l晄希くんのテスト完了演出アドオン by github-actions[bot]§r"}]}
