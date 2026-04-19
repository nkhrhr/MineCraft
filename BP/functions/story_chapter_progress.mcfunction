# チャプター進行チェック
# 第1章完了チェック（3つの秘宝を持っているか）
execute @a[tag=quest_chapter1,scores={story_progress=3}] ~ ~ ~ say §a第一章クリア！案内人に話しかけよう。
execute @a[tag=quest_chapter1,scores={story_progress=3}] ~ ~ ~ tag @s add chapter1_complete

# 第2章完了チェック
execute @a[tag=quest_chapter2,scores={story_progress=6}] ~ ~ ~ say §5第二章クリア！案内人に話しかけよう。
execute @a[tag=quest_chapter2,scores={story_progress=6}] ~ ~ ~ tag @s add chapter2_complete

# 第3章完了チェック
execute @a[tag=quest_chapter3,scores={story_progress=9}] ~ ~ ~ say §c最終章クリア！案内人に話しかけよう。
execute @a[tag=quest_chapter3,scores={story_progress=9}] ~ ~ ~ tag @s add chapter3_complete
