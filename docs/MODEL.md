# Combat model provenance and limitations

Snapshot checked 2026-11-23.

* [Wiki monster table](https://microwiki.mhmm.pl/mobs) supplies HP, Attack, Strength and Defence and names/locations.
* [Wiki XP table](https://microwiki.mhmm.pl/guides/experience-table) supplies exact cumulative XP thresholds 1–99 (shared curve).
* [Scribe combat planner](https://thescribe.tips/tools/combat) documents baseline six-second attack cooldown, 10 starting HP, banking/search overhead, food, enemy attack order and the need for sustained rates. That site's exact combat implementation was not imported.
* LoSpec 500-inspired palette design. Actual palette value verification is pending.

## Deliberately marked estimates

The wiki monster table alone **does not establish** the combat roll formulas, per-damage XP yield, enemy cooldown, player max-hit scaling, food behavior or encounter timing. The initial solver uses explicit editable estimates: hit chance = attacker/(attacker+defender), max hit = floor(1+strength/10+bonus), uniform successful hit, enemy attacks every configured interval, XP = mob HP × configurable XP/damage. These approximations should not be represented as game-accurate.

The current 'golden-path candidate' uses a deterministic greedy policy, not mathematical global optimization, and advances one skill level per step. Next steps: validate game rolls against source/recorded combats, simulate HP variance and auto-eat, enforce actual unlocks/gearing/access, optimize time-dependent equipment/food acquisitions with A*/dynamic programming, validate reward drops, introduce supply economics, then report globally best routes and confidence intervals.

## Safe spot constraint

No safe-spot monsters are ingested into the early-game training dataset. The Black Knight comparison is for ordinary combat. Safe-spot gloves are not early-game-available and cannot be treated as a free farming strategy.
