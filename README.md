# Microcalc

A one-button, level-one progression planner for Microscape.

## Run

```bash
docker compose up -d --build
```

Open http://localhost:8080 and select **Run Solver**.

For Vite development:

```bash
docker compose --profile dev up -d dev
```

Open http://localhost:5173.

## Solver

The two-phase workflow first searches for a feasible route, then improves any
incumbent it finds. It runs in a Web Worker and streams explored states,
discovered states, dominated-state pruning and the best route cost. The final
route is reconstructed from the search history. Search is heuristic and bounded;
it does **not** certify the globally cheapest route. The player starts with level-one Attack, Strength, Defence, Fishing,
Cooking and Herblaw.

It compares a single combat level against reaching the next **effective**
Strength damage breakpoint, along with food production, equipment drops,
skilling and potion usage. A strength potion is not a free permanent boost:
the model amortizes its Bear-root supply and brewing cost over its duration,
only considering it after the Herblaw requirement is reached and Bear farming
is viable. Routes include estimated monster respawns, food supply and banking.

The implementation uses a bounded anytime best-first search, with a
non-admissible lookahead estimate and cost/capability dominance pruning.
It distinguishes budget exhaustion from exhausting the modeled frontier.
Neither outcome proves real-world impossibility. Fishing gates are provisional
model parameters rather than confirmed game unlocks. Monster combat rolls, actual attack
intervals, skilling ingredient acquisition, potion production schedules,
player travel and survivability need further calibration.

## Combat timing diagnosis

Each solo kill now uses finite-HP expected attack counts, rather than
`HP / average DPS`, so overkill on tiny monsters cannot create fictitious
combat throughput. Time is itemized into fighting, the configurable 5-second
between-monster delay (estimated), looting/search, banking and food/potion
supply. The delay is charged once per kill, not once per training action.
A multi-level Strength action is repriced at each intermediate level and may
switch training monsters as soon as another target becomes economical.
The UI displays these cost categories alongside route steps so assumptions
can be checked against observations.

## Food economics in route scoring

Each fight predicts food consumed from expected incoming damage and the
effective heal per item. The search includes expected acquisition and cooking
time in the per-kill cycle, so food-heavy encounters lose time against cheaper
ones even when their raw combat XP/hour is higher. Multi-level training actions
aggregate food use after repricing each intermediate level; gear-drop farming
also accumulates estimated food consumption. The result displays food type
totals, expected units eaten, and food preparation hours by action and route.

Food counts are fractional long-run expectations, not a guarantee about
inventory usage. Gathering and purchase timings remain provisional. Food
preparation time is already part of the route total and must not be added a
second time. Exact cooldown-limited survival and food inventory batch trips
require discrete-event simulation.

## Equipment and potion loadouts

The search now has a larger default budget of 100,000 explored states (the
browser button uses the same limit). Search actions remain granular, but
the report merges adjacent levels of the same skill into one job without
changing time, food consumption or monster transitions. Gear changes are
displayed as explicit equip/unequip events only after owned gear meets its
requirements. The acquisition costs are charged by the preceding farming job.

The currently documented Strength potion is a *persistent* loadout once
selected. Unlocking it requires Herblaw level 13 and a viable, actual Bear
farming action for the documented 1/32 limpwurt root drop, followed by the
first 386-second mixing action. Maintaining its effect afterward incurs an
estimated recurring root-farming and 386-second mixing cost per 60-minute
dose, incorporated into combat action time. The expected potion counts
may be fractional in the long-run estimate. No additional potions are
invented without documented ingredient drops and their sourcing actions.

This remains an expected-cost model: potion timing is amortized, not a
frame-by-frame simulation of inventory, dose expiry, or travel.
