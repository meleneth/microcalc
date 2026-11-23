import { findFood, nominalHeal, healingFromBite } from "./foods.js";
import { lootTables } from "./lootTables.js";

// Provenance: in-game player mechanic is +1 max hit per six Strength.
// Enemy use of the same formula remains a hypothesis.
export function estimatedEnemyMaxHit(monster) {
  if(!monster || !Number.isFinite(monster.strength))throw new RangeError("Monster Strength required");
  return Math.max(1,1+Math.floor(Math.max(0,monster.strength)/6));
}

// Time to gather one unit of an ingredient, including kills and per-kill downtime.
// Uses expected drops, not guaranteed acquisition time.
export function monsterMaterialSeconds(monsterName,item,killCycleSeconds) {
  const drop=lootTables[monsterName]?.drops.find(d=>d.item.toLowerCase()===item.toLowerCase());
  if(!drop || !Number.isFinite(killCycleSeconds) || killCycleSeconds<=0) return null;
  return drop.oneIn*killCycleSeconds/drop.quantity;
}

// Explicit supply scenarios: buying raw fish, gathering fish or looting raw meat.
// None of these are treated as ready-to-eat.
export const foodSources={
  shrimp:[{source:"fish",ingredient:"raw shrimp",secondsPerRaw:null}],
  sardine:[{source:"buy",ingredient:"raw sardine",secondsPerRaw:null},{source:"fish",ingredient:"raw sardine",secondsPerRaw:null}],
  meat:[{source:"monster",monster:"Cow",ingredient:"raw meat"},{source:"monster",monster:"Bear",ingredient:"raw meat"}],
  chicken:[{source:"monster",monster:"Chicken",ingredient:"raw chicken"}],
  trout:[{source:"fish",ingredient:"raw trout",secondsPerRaw:null}],
  salmon:[{source:"fish",ingredient:"raw salmon",secondsPerRaw:null}],
  lobster:[{source:"fish",ingredient:"raw lobster",secondsPerRaw:null}],
  swordfish:[{source:"fish",ingredient:"raw swordfish",secondsPerRaw:null}]
};
export function foodSupplyCost({
  foodId,source,rawAcquireSeconds,cookingSeconds,travelSeconds=0,coinsPerRaw=0,
  rawYield=1,cookedYield=1
}){
  if(!findFood(foodId))throw new RangeError("Unknown food");
  if(!Number.isFinite(rawAcquireSeconds)||rawAcquireSeconds<0
    || !Number.isFinite(cookingSeconds)||cookingSeconds<0
    || !Number.isFinite(travelSeconds)||travelSeconds<0
    || rawYield<=0 || cookedYield<=0)throw new RangeError("Supply input must have nonnegative times and positive yields");
  return {foodId,source,secondsPerFood:rawAcquireSeconds/rawYield+cookingSeconds/cookedYield+travelSeconds,
    coinsPerFood:coinsPerRaw/rawYield,
    modeled:true};
}
// Expected-value cycle only. Cooling down to eat can either overlap the next
// monster wait/fight (cooldown-overlap) or block the player's actions (blocking).
export function foodEconomy({
  foodId,foodRecoveryBonus=0,maxHp=10,
  expectedDamagePerKill,foodCount,foodCooldownSeconds,
  supplySecondsPerFood,eatActionSeconds=0,mode="blocking"
}) {
  if(!findFood(foodId))throw new RangeError("Unknown food");
  for(const n of [maxHp,expectedDamagePerKill,foodCount,foodCooldownSeconds,supplySecondsPerFood,eatActionSeconds])
    if(!Number.isFinite(n)||n<0)throw new RangeError("Food economy inputs must be nonnegative and finite");
  if(!["blocking","cooldown-overlap"].includes(mode))throw new RangeError("Unknown eating model");
  const heal=Math.min(maxHp,nominalHeal(foodId,foodRecoveryBonus));
  const foodPerKill=heal>0?expectedDamagePerKill/heal:Infinity;
  const foodSecondsPerKill=foodPerKill*supplySecondsPerFood;
  // Blocking is deliberately conservative: assumes the cooldown prevents progress.
  // Overlap model charges only the actual eat action; a full event simulation
  // must determine whether subsequent eating is throttled.
  const eatSecondsPerKill=foodPerKill*(mode==="blocking"?Math.max(foodCooldownSeconds,eatActionSeconds):eatActionSeconds);
  return {foodId,heal,foodPerKill,foodSecondsPerKill,eatSecondsPerKill,
    extraSecondsPerKill:foodSecondsPerKill+eatSecondsPerKill,
    theoreticalKillsPerInventory:foodPerKill>0?foodCount/foodPerKill:Infinity,
    mode,assumption:"Expected-value only: cannot prove survival, cooldown overlap, or auto-eat timing."};
}
