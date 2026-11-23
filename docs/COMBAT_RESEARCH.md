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
| Strength and gear -> max hit | unknown | original implementation or repeated observed damage maxima at distinct levels |
| Damage distribution after hit | unknown | implementation or raw hit histogram (including zero-damage ambiguity) |
| Enemy attack speed | unspecified per monster | observed timestamps or implementation |
| Combat XP per damage and skill training style | unknown | before/after XP measurements for controlled fights |
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
