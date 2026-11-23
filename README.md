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

The two-phase workflow explores progression states in a Web Worker, streaming the
number of explored and discovered states, then reconstructs the cheapest route
found. The player starts with level-one Attack, Strength, Defence, Fishing,
Cooking and Herblaw.

It compares a single combat level against reaching the next **effective**
Strength damage breakpoint, along with food production, equipment drops,
skilling and potion usage. A strength potion is not a free permanent boost:
the model amortizes its Bear-root supply and brewing cost over its duration,
only considering it after the Herblaw requirement is reached and Bear farming
is viable. Routes include estimated monster respawns, food supply and banking.

The implementation uses a bounded uniform-cost search on modeled actions.
A result is only optimal within those actions and estimates, and an exhausted
budget is reported as a partial search. Monster combat rolls, actual attack
intervals, skilling ingredient acquisition, potion production schedules,
player travel and survivability need further calibration.
