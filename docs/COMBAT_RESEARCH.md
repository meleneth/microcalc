# Combat mechanics evidence register

Research date: 2026-11-23. This document separates **observed interface behavior**, **wiki data**, and **unverified models**.

## Public sources checked

- Microscape Wiki: https://microwiki.mhmm.pl/
- Wiki XP & Combat Calculator: https://microwiki.mhmm.pl/calculators/xp
- Wiki monster catalog: https://microwiki.mhmm.pl/mobs
- The Microscape Scribe combat planner: https://thescribe.tips/tools/combat

The wiki publishes monster HP, Attack, Strength and Defence plus an XP table and has a calculator advertising hit chance and XP per kill. The publicly readable calculator page does **not** disclose its implementation formulas. The Scribe's planner displays baseline six-second attacks, ten initial HP, a 35% auto-eat threshold and configurable damage distribution, attack ordering and enemy attack style. These describe user-facing behavior, **not** verified equations.

## Formula status (do not silently promote guesses)

| Formula | Status | Required evidence |
| --- | --- | --- |
| Attack versus Defence -> P(hit) | unknown | original game implementation, documented developer specification, or controlled hit/miss trials |
| Player Strength -> max hit | user reports +1 max damage per 6 effective Strength, screenshot: 13 effective Strength gives max hit 3 | verify thresholds at 5/6 and 11/12 and interactions with flat damage gear |
| Damage distribution after hit | unknown | implementation or raw hit histogram (including zero-damage ambiguity) |
| Enemy attack speed | unspecified per monster | observed timestamps or implementation |
| Combat XP per actual damage | user reports 2 XP per effective damage, no overkill | identify which skill receives XP, and confirm multiplayer XP allocation |
| Starting HP 10, default attack interval 6s, auto-eat at 35% | observed in third-party planner UI | corroborate against game |
| Equipment/abilities/potions and attack speed effects | partly exposed in planner UI | source-level or behavioral validation |

## Calibration protocol

1. Equip a fixed loadout, record Attack, Strength, Defence, weapon, gear bonuses, enemy and skill being trained.
2. Collect attack attempts and hit/miss outcomes. **Zero damage does not necessarily mean a miss**; if an attack can hit for zero, capture a distinct hit flag.
3. Repeat at several attack/defence stat ratios with >= 100 attempts each where possible; record a held-out sample separately.
4. Record actual hit damage outcomes and timestamps, including enemy attempts.
5. Record starting and ending skill XP, food/healing consumption, and kills.
6. Compare candidate models with src/calibration.js. The best log-likelihood candidate is **not proof**; validate on held-out data and inspect confidence intervals.
7. Integrate a formula in the optimizer only when the above is resolved or mark outputs as hypothetical with uncertainty.

Example accuracy observations JSON (invented numbers for **format demonstration**, not game evidence):

```json
[
  {"attack": 20, "defense": 20, "hits": 52, "misses": 48},
  {"attack": 30, "defense": 40, "hits": 40, "misses": 60}
]
```

The current solver in src/solver.js still uses arbitrary provisional ratio accuracy, max-hit scaling and XP-per-HP settings. Its recommendations should not be interpreted as verified optimal routes. Safe spots are excluded from progression planning.

## Player-reported Strength breakpoint rule (2026-11-23)

The user reports one additional maximum melee damage per six Strength. Their screenshot shows 11 base Strength plus 2 equipment Strength = 13 effective Strength and a displayed maximum melee hit of 3. We implement player max hit as `max(1, 1 + floor(effectiveStrength / 6) + flatDamageBonus)`. The baseline +1 and flat-damage treatment are model assumptions consistent with that screenshot, rather than independently verified game formulas. The enemy maximum hit remains provisional until confirmed.

## Between-monster downtime (2026-11-23)

The user reports roughly 3–6 seconds between consecutive monsters. There is currently no confirmed official timing constant from the sources inspected. The combat solver now exposes `respawnDelaySeconds` as a separate parameter, defaulting to 4.5 seconds for sensitivity analysis. `searchSeconds` is reserved for actual loot/search overhead, and switching to another monster is a separate cost again. The previous default of 5 seconds for search was a conflation; it has been reset to zero for new settings. Existing Pinia localStorage settings may retain the previous search value until manually adjusted. Do not count downtime twice. The current expectation-based model charges one delay per kill for sustained farming; a future encounter event simulation should model delays after kills, not before the initial target.

## Hit chance and XP observations (2026-11-23)

Cow hit chance, with no sword and no potion: 17 effective Attack → 72%; with +5 Attack potion: 22 → 77%; with +2 Attack sword as well: 24 → 79%. These three readings satisfy `P(hit) = 55% + effectiveAttack × 1 percentage point` **at Cow Defence 5 and within effective Attack 17–24 only**. We interpolate in this observed range, and retain the provisional global model elsewhere. Do not extrapolate to other monster defences or attribute the 55% intercept to a game formula.

Combat XP: user reports 2 XP per damage actually removed from enemy HP, with no credit for overkill. `combatXpForHit(10,3) === 6`. A fully solo-killed 8 HP Cow yields 16 total combat XP under this rule, irrespective of its max hit. A Black Knight fully solo killed yields 76. In groups, individual XP depends on attributed damage, which remains unknown. Skill allocation/training styles also remain unverified.
