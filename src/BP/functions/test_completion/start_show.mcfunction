# === テスト完了演出の開始 ===
tellraw @a {"rawtext":[{"text":"§6§l=== 壮大なテスト完了演出 ===§r"}]}
tellraw @a {"rawtext":[{"text":"§b装飾斧を持った巨大ドラゴンが勝利を祝福している！§r"}]}

# 夜にして演出を映えさせる
time set night
weather clear

# ドラゴンに火の息で文字を書かせる（3秒後）
schedule function test_completion/fire_display 60

# 継続的なエフェクト開始
schedule function test_completion/continuous_effects 20
schedule function test_completion/continuous_effects 40
schedule function test_completion/continuous_effects 80
schedule function test_completion/continuous_effects 120

# 最終祝福エフェクト（6秒後）
schedule function test_completion/final_celebration 120
