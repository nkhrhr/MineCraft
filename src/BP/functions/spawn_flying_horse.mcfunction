# === 空飛ぶ馬を召喚する ===
summon story:flying_horse ~ ~ ~
tellraw @p {"rawtext":[{"text":"§d✨ 空飛ぶ馬が現れた！小麦を使って仲良くなろう ✨§r"}]}
playsound mob.horse.ambient @p
particle minecraft:totem_particle ~ ~1 ~ 2 2 2 0.1 20

```

===FILE: src/BP/functions/create_sky_village.mcfunction===
# === 雲の上に秘密の村を作成 ===
tp @p ~ 200 ~
fill ~-10 199 ~-10 ~10 199 ~10 white_wool
fill ~-8 199 ~-8 ~8 199 ~8 light_blue_wool
structure load sky_village ~ 200 ~
summon story:sky_villager ~3 200 ~3
summon story:sky_villager ~-3 200 ~-3
tellraw @p {"rawtext":[{"text":"§b✨ 雲の上の秘密の村に到着！ ✨§r"}]}
title @p title §b雲の上の村
title @p subtitle §r秘密の場所を発見
playsound ui.toast.challenge_complete @p

```

===FILE: src/BP/texts/ja_JP.lang===
## ===== Arlt Story - 日本語テキスト =====
## 晄希くんが物語テキストをここで編集できます

## エンティティ名
entity.story:narrator.name=老賢者アルト
entity.story:flying_horse.name=空飛ぶ馬
entity.story:sky_villager.name=雲の村人

## アイテム名
item.story:ancient_key.name=§6古代の鍵
item.story:treasure_gem.name=§b秘宝の宝石

## アクション
action.interact.ride.horse=乗る
action.interact.talk=話しかける

## UI テキスト
pack.name=Arlt Story
pack.description=Koki's first adventure

```

===FILE: src/RP/entity/flying_horse.entity.json===
{
  "format_version": "1.20.0",
  "minecraft:client_entity": {
    "description": {
      "identifier": "story:flying_horse",
      "materials": {
        "default": "horse"
      },
      "textures": {
        "default": "textures/entity/flying_horse"
      },
      "geometry": {
        "default": "geometry.horse.v1.8"
      },
      "animations": {
        "setup": "animation.horse.setup",
        "walk": "animation.horse.walk",
        "trot": "animation.horse.trot",
        "baby_transform": "animation.horse.baby_transform"
      },
      "scripts": {
        "animate": [
          "setup",
          {
            "walk": "query.modified_move_speed"
          },
          "baby_transform"
        ]
      },
      "render_controllers": ["controller.render.horse"],
      "spawn_egg": {
        "texture": "spawn_egg",
        "texture_index": 29
      }
    }
  }
}
