# Progression prerequisites

Current target: sustained ordinary-combat Black Knight farming, with Attack, Strength, Defence, Fishing, Cooking and Herblaw as possible investment skills.

Confirmed user constraints:
- Vials and raw sardines are purchasable.
- Turkey is fought with 7 other players (8 total). Fox Hat is required before planning Turkey farming.
- Imp is fought with one other player (2 total).
- Lucky Paw from Mouse is a prerequisite for Fox Hat; wiki documents 1/1,024 chance.
- Bear is an important supplier of Strength-potion materials. Wiki monster loot data lists Limpwurt Root at 1/32.

Implemented in src/progression.js:
- Explicit prereqs and expected drop kills.
- Equippable gear options, legal loadout enumeration, DPS and combat estimated comparisons.
- Group sizing metadata without fictitious group-damage scaling.
- Potion bottleneck helper with unverified recipe called out.

Not complete:
- Full multi-skill shortest-path search and unlocking of Fishing/Cooking/Herblaw crafts.
- Strength potion recipe is now verified from the Microscape wiki: Herblaw 13, 1 vial of water + 1 Limpwurt Root, 386 seconds, 735 XP, +5 Strength for 60 minutes. Still missing exact timing for acquiring vial water, combat variance and supply logistics.
- Shared XP, kill participation, loot eligibility and hit rates for multiplayer encounters.
- Gear acquisition time, affordability, travel, equipment slots and actual full fight survival.
- Combat engine still uses provisional accuracy and enemy hit formulas. Ranked loadouts remain estimates.

Do not present these dependency helpers as a proven golden-path solver.

## Energy assumption (user-confirmed 2026-11-23)

Energy is always full for the user's intended progression route. Do not model energy consumption, regeneration, resting, or energy-driven scheduling as constraints or costs. Optimize real elapsed time (combat, respawns, supply gathering, crafting, travel, banking, and item drops) instead. Treat energy as nonbinding even for Fishing, Cooking, and Herblaw.
