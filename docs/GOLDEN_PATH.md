# Golden-path search

Run `npm test` and `npm run dev`, or `docker compose --profile dev up dev`.

The planner starts at editable skill levels, defaulting to Attack 20, Strength 20, Defence 10, Fishing 20, Cooking 15 and Herblaw 5. Pass `startingLevels` to the solver to override any skill; pass six ones to reproduce the original level-one baseline. Initial XP is assumed to be exactly the selected level threshold. It is a bounded uniform-cost (Dijkstra) search over milestone actions. It considers:

- Combat training on accessible, solo, non-safe monsters, factoring HP, 2 XP per actual damage, respawn, expected food consumption, and food preparation.
- Fishing, Cooking, and Herblaw training using editable activity timing assumptions.
- Gear **only** where a documented drop source is available and the encounter is viable. It does **not** give free purchased or inaccessible upgrades.
- Food progression with cooking-level gates, raw sardines purchasable, and other raw food collected.
- Strength breakpoints and gear stats.
- A Black Knight goal expressed as minimum kills/hour under the expected-value survival filter.

The planner is a **bounded planning model**, not a certified global optimum. It cannot safely conclude solo Black Knight farm viability from expected damage alone. The general accuracy equation, enemy max hit, potion ingredient schedules, bank/market economics, precise gathering availability, and group damage allocation remain uncertain. Turkey requires Fox Hat and eight players, and Imp requires two players; neither is admitted to the **solo** search until encounter mechanics are modeled. Current FOX and potion dependency helpers remain separately available.

A failed search returns a partial path labeled as such, never a fabricated victory. With a bounded budget, a successful result minimizes cost among the implemented actions explored, given the current model.

## Loot bag economics

Default capacity 25 loot units; independent documented drop rolls (including quantities) yield a deterministic expected number of kills to fill an empty bag via a finite-state recurrence. Each kill is charged its amortized share of the configured banking trip (90 seconds by default). Food is modeled separately; scraps add one loot unit per successful meal roll. Fractional expected meals use a floor/ceil mixture, not a measured consumption distribution. Scrap chance defaults to zero as a lower-bound scenario and is configurable in the UI. Missing loot tables use the legacy 20-kill fallback, not a claim of zero loot. Assumes all loot is retained, bank clears bag, and no loot lost on final kill affects progression; partial bags are not carried across milestones. Capacity upgrades can be configured manually; acquisition is not yet modeled. Group loot is still excluded from Golden Path.

The live route is published on each new best provisional readiness score or cheaper feasible incumbent, plus periodic progress snapshots. Both the live and final view use the same route reconstruction and cost totals. Immutable parent histories prevent later state improvements from altering an already scored route.
