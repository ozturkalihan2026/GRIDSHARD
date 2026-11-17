window.RECOIL_DEMO = {
  "schema": 1,
  "candidate": true,
  "engine_step_ms": 100,
  "stats": {
    "level": 1,
    "max_hp": 240,
    "base_damage": 50.0,
    "current_cost": 4,
    "cooldown_ms": 3000,
    "effect_multiplier": 1.0,
    "recoil_hp": 16
  },
  "talents": [
    {
      "tier": "0",
      "kind": "basic",
      "level": 6,
      "circuit_credits_cost": 2000,
      "flux_cost": 0,
      "choices": [
        {
          "id": "power",
          "name_tr": "Hasar +%3",
          "name_en": "Damage +3%",
          "description_tr": "Doğrudan atış hasarını %3 artırır.",
          "description_en": "Increases direct shot damage by 3%."
        },
        {
          "id": "resilience",
          "name_tr": "CAN +%5",
          "name_en": "HP +5%",
          "description_tr": "Azami CAN’ı %5 artırır.",
          "description_en": "Increases maximum HP by 5%."
        }
      ]
    },
    {
      "tier": "1",
      "kind": "signature",
      "level": 9,
      "circuit_credits_cost": 4000,
      "flux_cost": 0,
      "choices": [
        {
          "id": "power",
          "name_tr": "Ağır Atış: hasar +%12",
          "name_en": "Heavy Shot: damage +12%",
          "description_tr": "Doğrudan atış hasarını %12 artırır; geri tepme bedeli değişmez.",
          "description_en": "Increases direct shot damage by 12%; recoil cost is unchanged."
        },
        {
          "id": "resilience",
          "name_tr": "Yumuşak Kızak: geri tepme −%25",
          "name_en": "Soft Slide: recoil −25%",
          "description_tr": "Her gerçek atışın kendi CAN bedelini %25 azaltır; hasar değişmez.",
          "description_en": "Reduces self HP cost per actual shot by 25%; damage is unchanged."
        }
      ]
    },
    {
      "tier": "2",
      "kind": "tuning",
      "level": 12,
      "circuit_credits_cost": 10000,
      "flux_cost": 1000,
      "choices": [
        {
          "id": "power",
          "name_tr": "Dolum −%4",
          "name_en": "Recharge −4%",
          "description_tr": "Atış çevrimini %4 kısaltır; her atış kendi CAN bedelini korur.",
          "description_en": "Shortens the firing cycle by 4%; every shot retains its self HP cost."
        },
        {
          "id": "resilience",
          "name_tr": "CAN +%5",
          "name_en": "HP +5%",
          "description_tr": "Azami CAN’ı %5 artırır.",
          "description_en": "Increases maximum HP by 5%."
        }
      ]
    },
    {
      "tier": "3",
      "kind": "mastery",
      "level": 15,
      "circuit_credits_cost": 20000,
      "flux_cost": 2000,
      "choices": [
        {
          "id": "power",
          "name_tr": "Hasar +%6",
          "name_en": "Damage +6%",
          "description_tr": "Doğrudan atış hasarını %6 artırır.",
          "description_en": "Increases direct shot damage by 6%."
        },
        {
          "id": "resilience",
          "name_tr": "CAN +%8",
          "name_en": "HP +8%",
          "description_tr": "Azami CAN’ı %8 artırır.",
          "description_en": "Increases maximum HP by 8%."
        }
      ]
    }
  ],
  "scenarios": {
    "armor": {
      "target": "armor",
      "target_max_hp": 432,
      "frames": [
        {
          "at_ms": 0,
          "gun_hp": 240,
          "target_hp": 432,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 100,
          "gun_hp": 224,
          "target_hp": 394,
          "shield_hp": 0,
          "events": [
            {
              "type": "module_cooldown_started",
              "at_ms": 0,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack",
                "ready_at_ms": 3000
              }
            },
            {
              "type": "module_recoil",
              "at_ms": 0,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "definition_id": "recoil_cannon",
                "requested_hp": 16,
                "hp_loss": 16,
                "hp_before": 240,
                "hp_after": 224,
                "counts_as_enemy_damage": false
              }
            },
            {
              "type": "module_damaged",
              "at_ms": 0,
              "data": {
                "player_id": "b",
                "module_id": "target",
                "damage": 38,
                "attempted_damage": 38,
                "hp": 394,
                "source_player_id": "a",
                "source_module_id": "candidate"
              }
            },
            {
              "type": "attack_performed",
              "at_ms": 0,
              "data": {
                "attacker_player_id": "a",
                "attacker_module_id": "candidate",
                "target_player_id": "b",
                "target_module_id": "target",
                "base_damage": 50.0,
                "raw_damage": 50,
                "damage": 38,
                "reduced_damage": 12,
                "core_attack": false,
                "power_id": "",
                "defense_type": "armor",
                "secondary": false,
                "damage_kind": "direct",
                "simultaneous_tick": true,
                "rarity": "rare",
                "signature": ""
              }
            }
          ]
        },
        {
          "at_ms": 1000,
          "gun_hp": 224,
          "target_hp": 394,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 3000,
          "gun_hp": 224,
          "target_hp": 394,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 3100,
          "gun_hp": 208,
          "target_hp": 356,
          "shield_hp": 0,
          "events": [
            {
              "type": "module_cooldown_ready",
              "at_ms": 3000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack"
              }
            },
            {
              "type": "module_cooldown_started",
              "at_ms": 3000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack",
                "ready_at_ms": 6000
              }
            },
            {
              "type": "module_recoil",
              "at_ms": 3000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "definition_id": "recoil_cannon",
                "requested_hp": 16,
                "hp_loss": 16,
                "hp_before": 224,
                "hp_after": 208,
                "counts_as_enemy_damage": false
              }
            },
            {
              "type": "module_damaged",
              "at_ms": 3000,
              "data": {
                "player_id": "b",
                "module_id": "target",
                "damage": 38,
                "attempted_damage": 38,
                "hp": 356,
                "source_player_id": "a",
                "source_module_id": "candidate"
              }
            },
            {
              "type": "attack_performed",
              "at_ms": 3000,
              "data": {
                "attacker_player_id": "a",
                "attacker_module_id": "candidate",
                "target_player_id": "b",
                "target_module_id": "target",
                "base_damage": 50.0,
                "raw_damage": 50,
                "damage": 38,
                "reduced_damage": 12,
                "core_attack": false,
                "power_id": "",
                "defense_type": "armor",
                "secondary": false,
                "damage_kind": "direct",
                "simultaneous_tick": true,
                "rarity": "rare",
                "signature": ""
              }
            }
          ]
        },
        {
          "at_ms": 3500,
          "gun_hp": 208,
          "target_hp": 356,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 3600,
          "gun_hp": 208,
          "target_hp": 356,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 6000,
          "gun_hp": 208,
          "target_hp": 356,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 6100,
          "gun_hp": 192,
          "target_hp": 318,
          "shield_hp": 0,
          "events": [
            {
              "type": "module_cooldown_ready",
              "at_ms": 6000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack"
              }
            },
            {
              "type": "module_cooldown_started",
              "at_ms": 6000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack",
                "ready_at_ms": 9000
              }
            },
            {
              "type": "module_recoil",
              "at_ms": 6000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "definition_id": "recoil_cannon",
                "requested_hp": 16,
                "hp_loss": 16,
                "hp_before": 208,
                "hp_after": 192,
                "counts_as_enemy_damage": false
              }
            },
            {
              "type": "module_damaged",
              "at_ms": 6000,
              "data": {
                "player_id": "b",
                "module_id": "target",
                "damage": 38,
                "attempted_damage": 38,
                "hp": 318,
                "source_player_id": "a",
                "source_module_id": "candidate"
              }
            },
            {
              "type": "attack_performed",
              "at_ms": 6000,
              "data": {
                "attacker_player_id": "a",
                "attacker_module_id": "candidate",
                "target_player_id": "b",
                "target_module_id": "target",
                "base_damage": 50.0,
                "raw_damage": 50,
                "damage": 38,
                "reduced_damage": 12,
                "core_attack": false,
                "power_id": "",
                "defense_type": "armor",
                "secondary": false,
                "damage_kind": "direct",
                "simultaneous_tick": true,
                "rarity": "rare",
                "signature": ""
              }
            }
          ]
        },
        {
          "at_ms": 6500,
          "gun_hp": 192,
          "target_hp": 318,
          "shield_hp": 0,
          "events": []
        }
      ]
    },
    "phase": {
      "target": "phase_armor",
      "target_max_hp": 420,
      "frames": [
        {
          "at_ms": 0,
          "gun_hp": 240,
          "target_hp": 420,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 100,
          "gun_hp": 224,
          "target_hp": 420,
          "shield_hp": 0,
          "events": [
            {
              "type": "module_signature_triggered",
              "at_ms": 0,
              "data": {
                "player_id": "b",
                "source_module_id": "target",
                "target_module_id": "target",
                "signature": "phase",
                "active": true,
                "duration_ms": 1000
              }
            },
            {
              "type": "module_cooldown_started",
              "at_ms": 0,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack",
                "ready_at_ms": 3000
              }
            },
            {
              "type": "module_recoil",
              "at_ms": 0,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "definition_id": "recoil_cannon",
                "requested_hp": 16,
                "hp_loss": 16,
                "hp_before": 240,
                "hp_after": 224,
                "counts_as_enemy_damage": false
              }
            },
            {
              "type": "module_damaged",
              "at_ms": 0,
              "data": {
                "player_id": "b",
                "module_id": "target",
                "damage": 0,
                "attempted_damage": 0,
                "hp": 420,
                "source_player_id": "a",
                "source_module_id": "candidate"
              }
            },
            {
              "type": "attack_performed",
              "at_ms": 0,
              "data": {
                "attacker_player_id": "a",
                "attacker_module_id": "candidate",
                "target_player_id": "b",
                "target_module_id": "target",
                "base_damage": 50.0,
                "raw_damage": 50,
                "damage": 0,
                "reduced_damage": 50,
                "core_attack": false,
                "power_id": "",
                "defense_type": "phase_armor",
                "secondary": false,
                "damage_kind": "direct",
                "simultaneous_tick": true,
                "rarity": "rare",
                "signature": ""
              }
            }
          ]
        },
        {
          "at_ms": 1000,
          "gun_hp": 224,
          "target_hp": 420,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 3000,
          "gun_hp": 224,
          "target_hp": 420,
          "shield_hp": 0,
          "events": [
            {
              "type": "module_signature_triggered",
              "at_ms": 1000,
              "data": {
                "player_id": "b",
                "source_module_id": "target",
                "target_module_id": "target",
                "signature": "phase",
                "active": false,
                "duration_ms": 1000
              }
            }
          ]
        },
        {
          "at_ms": 3100,
          "gun_hp": 208,
          "target_hp": 370,
          "shield_hp": 0,
          "events": [
            {
              "type": "module_cooldown_ready",
              "at_ms": 3000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack"
              }
            },
            {
              "type": "module_cooldown_started",
              "at_ms": 3000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack",
                "ready_at_ms": 6000
              }
            },
            {
              "type": "module_recoil",
              "at_ms": 3000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "definition_id": "recoil_cannon",
                "requested_hp": 16,
                "hp_loss": 16,
                "hp_before": 224,
                "hp_after": 208,
                "counts_as_enemy_damage": false
              }
            },
            {
              "type": "module_damaged",
              "at_ms": 3000,
              "data": {
                "player_id": "b",
                "module_id": "target",
                "damage": 50,
                "attempted_damage": 50,
                "hp": 370,
                "source_player_id": "a",
                "source_module_id": "candidate"
              }
            },
            {
              "type": "attack_performed",
              "at_ms": 3000,
              "data": {
                "attacker_player_id": "a",
                "attacker_module_id": "candidate",
                "target_player_id": "b",
                "target_module_id": "target",
                "base_damage": 50.0,
                "raw_damage": 50,
                "damage": 50,
                "reduced_damage": 0,
                "core_attack": false,
                "power_id": "",
                "defense_type": "phase_armor",
                "secondary": false,
                "damage_kind": "direct",
                "simultaneous_tick": true,
                "rarity": "rare",
                "signature": ""
              }
            }
          ]
        },
        {
          "at_ms": 3500,
          "gun_hp": 208,
          "target_hp": 370,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 3600,
          "gun_hp": 208,
          "target_hp": 370,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 6000,
          "gun_hp": 208,
          "target_hp": 370,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 6100,
          "gun_hp": 192,
          "target_hp": 370,
          "shield_hp": 0,
          "events": [
            {
              "type": "module_cooldown_ready",
              "at_ms": 6000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack"
              }
            },
            {
              "type": "module_signature_triggered",
              "at_ms": 6000,
              "data": {
                "player_id": "b",
                "source_module_id": "target",
                "target_module_id": "target",
                "signature": "phase",
                "active": true,
                "duration_ms": 1000
              }
            },
            {
              "type": "module_cooldown_started",
              "at_ms": 6000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack",
                "ready_at_ms": 9000
              }
            },
            {
              "type": "module_recoil",
              "at_ms": 6000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "definition_id": "recoil_cannon",
                "requested_hp": 16,
                "hp_loss": 16,
                "hp_before": 208,
                "hp_after": 192,
                "counts_as_enemy_damage": false
              }
            },
            {
              "type": "module_damaged",
              "at_ms": 6000,
              "data": {
                "player_id": "b",
                "module_id": "target",
                "damage": 0,
                "attempted_damage": 0,
                "hp": 370,
                "source_player_id": "a",
                "source_module_id": "candidate"
              }
            },
            {
              "type": "attack_performed",
              "at_ms": 6000,
              "data": {
                "attacker_player_id": "a",
                "attacker_module_id": "candidate",
                "target_player_id": "b",
                "target_module_id": "target",
                "base_damage": 50.0,
                "raw_damage": 50,
                "damage": 0,
                "reduced_damage": 50,
                "core_attack": false,
                "power_id": "",
                "defense_type": "phase_armor",
                "secondary": false,
                "damage_kind": "direct",
                "simultaneous_tick": true,
                "rarity": "rare",
                "signature": ""
              }
            }
          ]
        },
        {
          "at_ms": 6500,
          "gun_hp": 192,
          "target_hp": 370,
          "shield_hp": 0,
          "events": []
        }
      ]
    },
    "emp": {
      "target": "armor",
      "target_max_hp": 432,
      "frames": [
        {
          "at_ms": 0,
          "gun_hp": 240,
          "target_hp": 432,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 100,
          "gun_hp": 240,
          "target_hp": 432,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 1000,
          "gun_hp": 240,
          "target_hp": 432,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 3000,
          "gun_hp": 240,
          "target_hp": 432,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 3100,
          "gun_hp": 240,
          "target_hp": 432,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 3500,
          "gun_hp": 240,
          "target_hp": 432,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 3600,
          "gun_hp": 224,
          "target_hp": 394,
          "shield_hp": 0,
          "events": [
            {
              "type": "module_timed_effect_expired",
              "at_ms": 3500,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "collection": "debuffs",
                "effect_id": "emp_disabled"
              }
            },
            {
              "type": "module_cooldown_started",
              "at_ms": 3500,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack",
                "ready_at_ms": 6500
              }
            },
            {
              "type": "module_recoil",
              "at_ms": 3500,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "definition_id": "recoil_cannon",
                "requested_hp": 16,
                "hp_loss": 16,
                "hp_before": 240,
                "hp_after": 224,
                "counts_as_enemy_damage": false
              }
            },
            {
              "type": "module_damaged",
              "at_ms": 3500,
              "data": {
                "player_id": "b",
                "module_id": "target",
                "damage": 38,
                "attempted_damage": 38,
                "hp": 394,
                "source_player_id": "a",
                "source_module_id": "candidate"
              }
            },
            {
              "type": "attack_performed",
              "at_ms": 3500,
              "data": {
                "attacker_player_id": "a",
                "attacker_module_id": "candidate",
                "target_player_id": "b",
                "target_module_id": "target",
                "base_damage": 50.0,
                "raw_damage": 50,
                "damage": 38,
                "reduced_damage": 12,
                "core_attack": false,
                "power_id": "",
                "defense_type": "armor",
                "secondary": false,
                "damage_kind": "direct",
                "simultaneous_tick": true,
                "rarity": "rare",
                "signature": ""
              }
            }
          ]
        },
        {
          "at_ms": 6000,
          "gun_hp": 224,
          "target_hp": 394,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 6100,
          "gun_hp": 224,
          "target_hp": 394,
          "shield_hp": 0,
          "events": []
        },
        {
          "at_ms": 6500,
          "gun_hp": 224,
          "target_hp": 394,
          "shield_hp": 0,
          "events": []
        }
      ]
    },
    "low-hp": {
      "target": "armor",
      "target_max_hp": 432,
      "frames": [
        {
          "at_ms": 0,
          "gun_hp": 5,
          "target_hp": 432,
          "shield_hp": 100,
          "events": []
        },
        {
          "at_ms": 100,
          "gun_hp": 1,
          "target_hp": 394,
          "shield_hp": 100,
          "events": [
            {
              "type": "module_cooldown_started",
              "at_ms": 0,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack",
                "ready_at_ms": 3000
              }
            },
            {
              "type": "module_recoil",
              "at_ms": 0,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "definition_id": "recoil_cannon",
                "requested_hp": 16,
                "hp_loss": 4,
                "hp_before": 5,
                "hp_after": 1,
                "counts_as_enemy_damage": false
              }
            },
            {
              "type": "module_damaged",
              "at_ms": 0,
              "data": {
                "player_id": "b",
                "module_id": "target",
                "damage": 38,
                "attempted_damage": 38,
                "hp": 394,
                "source_player_id": "a",
                "source_module_id": "candidate"
              }
            },
            {
              "type": "attack_performed",
              "at_ms": 0,
              "data": {
                "attacker_player_id": "a",
                "attacker_module_id": "candidate",
                "target_player_id": "b",
                "target_module_id": "target",
                "base_damage": 50.0,
                "raw_damage": 50,
                "damage": 38,
                "reduced_damage": 12,
                "core_attack": false,
                "power_id": "",
                "defense_type": "armor",
                "secondary": false,
                "damage_kind": "direct",
                "simultaneous_tick": true,
                "rarity": "rare",
                "signature": ""
              }
            }
          ]
        },
        {
          "at_ms": 1000,
          "gun_hp": 1,
          "target_hp": 394,
          "shield_hp": 100,
          "events": []
        },
        {
          "at_ms": 3000,
          "gun_hp": 1,
          "target_hp": 394,
          "shield_hp": 100,
          "events": []
        },
        {
          "at_ms": 3100,
          "gun_hp": 1,
          "target_hp": 356,
          "shield_hp": 100,
          "events": [
            {
              "type": "module_cooldown_ready",
              "at_ms": 3000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack"
              }
            },
            {
              "type": "module_cooldown_started",
              "at_ms": 3000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack",
                "ready_at_ms": 6000
              }
            },
            {
              "type": "module_recoil",
              "at_ms": 3000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "definition_id": "recoil_cannon",
                "requested_hp": 16,
                "hp_loss": 0,
                "hp_before": 1,
                "hp_after": 1,
                "counts_as_enemy_damage": false
              }
            },
            {
              "type": "module_damaged",
              "at_ms": 3000,
              "data": {
                "player_id": "b",
                "module_id": "target",
                "damage": 38,
                "attempted_damage": 38,
                "hp": 356,
                "source_player_id": "a",
                "source_module_id": "candidate"
              }
            },
            {
              "type": "attack_performed",
              "at_ms": 3000,
              "data": {
                "attacker_player_id": "a",
                "attacker_module_id": "candidate",
                "target_player_id": "b",
                "target_module_id": "target",
                "base_damage": 50.0,
                "raw_damage": 50,
                "damage": 38,
                "reduced_damage": 12,
                "core_attack": false,
                "power_id": "",
                "defense_type": "armor",
                "secondary": false,
                "damage_kind": "direct",
                "simultaneous_tick": true,
                "rarity": "rare",
                "signature": ""
              }
            }
          ]
        },
        {
          "at_ms": 3500,
          "gun_hp": 1,
          "target_hp": 356,
          "shield_hp": 100,
          "events": []
        },
        {
          "at_ms": 3600,
          "gun_hp": 1,
          "target_hp": 356,
          "shield_hp": 100,
          "events": []
        },
        {
          "at_ms": 6000,
          "gun_hp": 1,
          "target_hp": 356,
          "shield_hp": 0,
          "events": [
            {
              "type": "module_timed_effect_expired",
              "at_ms": 5000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "collection": "persistent_effects",
                "effect_id": "v2_shield_guard"
              }
            }
          ]
        },
        {
          "at_ms": 6100,
          "gun_hp": 1,
          "target_hp": 318,
          "shield_hp": 0,
          "events": [
            {
              "type": "module_cooldown_ready",
              "at_ms": 6000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack"
              }
            },
            {
              "type": "module_cooldown_started",
              "at_ms": 6000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "cooldown_id": "attack",
                "ready_at_ms": 9000
              }
            },
            {
              "type": "module_recoil",
              "at_ms": 6000,
              "data": {
                "player_id": "a",
                "module_id": "candidate",
                "definition_id": "recoil_cannon",
                "requested_hp": 16,
                "hp_loss": 0,
                "hp_before": 1,
                "hp_after": 1,
                "counts_as_enemy_damage": false
              }
            },
            {
              "type": "module_damaged",
              "at_ms": 6000,
              "data": {
                "player_id": "b",
                "module_id": "target",
                "damage": 38,
                "attempted_damage": 38,
                "hp": 318,
                "source_player_id": "a",
                "source_module_id": "candidate"
              }
            },
            {
              "type": "attack_performed",
              "at_ms": 6000,
              "data": {
                "attacker_player_id": "a",
                "attacker_module_id": "candidate",
                "target_player_id": "b",
                "target_module_id": "target",
                "base_damage": 50.0,
                "raw_damage": 50,
                "damage": 38,
                "reduced_damage": 12,
                "core_attack": false,
                "power_id": "",
                "defense_type": "armor",
                "secondary": false,
                "damage_kind": "direct",
                "simultaneous_tick": true,
                "rarity": "rare",
                "signature": ""
              }
            }
          ]
        },
        {
          "at_ms": 6500,
          "gun_hp": 1,
          "target_hp": 318,
          "shield_hp": 0,
          "events": []
        }
      ]
    }
  }
};
