# Golden-path search

Run `npm test` and `npm run dev`, or `docker compose --profile dev up dev`.

The new planner starts from six skills at **level 1**, independent of the current player status. It is a bounded uniform-cost (Dijkstra) search over milestone actions. It considers:

- Combat training on accessible, solo, non-safe monsters, factoring HP, 2 XP per actual damage, respawn, expected food consumption, and food preparation.
- Fishing, Cooking, and Herblaw training using editable activity timing assumptions.
- Gear **only** where a documented drop source is available and the encounter is viable. It does **not** give free purchased or inaccessible upgrades.
- Food progression with cooking-level gates, raw sardines purchasable, and other raw food collected.
- Strength breakpoints and gear stats.
- A Black Knight goal expressed as minimum kills/hour under the expected-value survival filter.

The planner is a **bounded planning model**, not a certified global optimum. It cannot safely conclude solo Black Knight farm viability from expected damage alone. The general accuracy equation, enemy max hit, potion ingredient schedules, bank/market economics, precise gathering availability, and group damage allocation remain uncertain. Turkey requires Fox Hat and eight players, and Imp requires two players; neither is admitted to the **solo** search until encounter mechanics are modeled. Current FOX and potion dependency helpers remain separately available.

A failed search returns a partial path labeled as such, never a fabricated victory. With a bounded budget, a successful result minimizes cost among the implemented actions explored, given the current model.
