# === 演出終了後のクリーンアップ ===
tellraw @a {"rawtext":[{"text":"§7演出終了。装飾斧を持ったドラゴンは満足そうに去って行った...§r"}]}
tellraw @a {"rawtext":[{"text":"§e晄希くんのアイデアによる素晴らしいテスト完了演出でした！§r"}]}

# 天候と時間を元に戻す
weather clear
time set day

# ドラゴンを消去
tp @e[type=story:test_completion_dragon] ~ ~200 ~
kill @e[type=story:test_completion_dragon]

# 最後のメッセージ
tellraw @a {"rawtext":[{"text":"§b§l晄希くんのテスト完了演出アドオン by github-actions[bot]§r"}]}
tellraw @a {"rawtext":[{"text":"§7装飾斧ドラゴンがテスト成功を祝福してくれ���した！§r"}]}

# 最後の星エフェクト
particle minecraft:totem_particle ~ ~5 ~ 3 3 3 0.1 30
