import test from "node:test";
import assert from "node:assert/strict";
import { xpRemaining, levelAt, evaluate, goldenPath, defaults, meleeMaxHit, expectedAttacksToKill, combatXpForHit, combatXpForSoloKill } from "../src/solver.js";
import { mobs, xp } from "../src/data.js";
test("wiki XP thresholds",()=>{assert.equal(xp.length,99);assert.equal(xp[98],130344310);assert.equal(levelAt(830),2);assert.equal(xpRemaining(0,40),372240);});
test("Black knight wiki stats",()=>{const k=mobs.find(x=>x.name==="Black knight");assert.deepEqual([k.hp,k.attack,k.strength,k.defense],[38,30,41,42]);});
test("combat results are finite",()=>{const v=evaluate(mobs[0],defaults);assert.ok(v.ttk>0 && Number.isFinite(v.xpPerHour));});
test("route is deterministic and excludes inaccessible safe spots",()=>{const a=goldenPath({...defaults,foodHeal:10,foodCount:30},{attack:4,strength:4,defense:4});assert.deepEqual(a,goldenPath({...defaults,foodHeal:10,foodCount:30},{attack:4,strength:4,defense:4}));assert.ok(a.steps.every(s=>!s.mob.includes("Safe")));});

test("max hit crosses every six effective Strength",()=>{
  for(const [strength,expected] of [[5,1],[6,2],[11,2],[12,3],[13,3],[17,3],[18,4]]) {
    assert.equal(meleeMaxHit(strength),expected);
  }
  assert.equal(meleeMaxHit(13,1),4);
  assert.equal(evaluate(mobs.find(m=>m.name==="Cow"),{...defaults,strength:11,strengthBonus:2}).maxHit,3);
});

test("between-monster delay is separate from loot search and banking",()=>{
 const mob=mobs.find(m=>m.name==="Cow");
 const base={...defaults,foodHeal:10,foodCount:20,bankSeconds:0,searchSeconds:0,foodRestockSeconds:0,respawnDelaySeconds:0};
 const fast=evaluate(mob,base);
 const slow=evaluate(mob,{...base,respawnDelaySeconds:6});
 assert.equal(slow.cycle-fast.cycle,6);
 assert.ok(slow.xpPerHour<fast.xpPerHour);
 assert.equal(slow.searchDelay,0);
 assert.equal(evaluate(mob,{...base,searchSeconds:3}).cycle-fast.cycle,3);
});

test("combat experience caps overkill and awards 2 XP per actual damage",()=>{
  assert.equal(combatXpForHit(10,3),6);
  assert.equal(combatXpForHit(2,8),4);
  assert.equal(combatXpForHit(0,8),0);
  assert.equal(combatXpForHit(5,0),0);
  assert.equal(combatXpForSoloKill(8),16);
  assert.equal(combatXpForSoloKill(38),76);
  assert.equal(evaluate(mobs.find(m=>m.name==="Cow"),{...defaults,xpPerDamage:999}).xpPerKill,16);
  assert.throws(()=>combatXpForHit(-1,5));
});
test("Cow hit chances interpolate only within observations",()=>{
 const cow=mobs.find(m=>m.name==="Cow");
 for(const [effectiveAttack,expected] of [[17,0.72],[22,0.77],[24,0.79]]){
   const result=evaluate(cow,{...defaults,attack:effectiveAttack,attackBonus:0});
   assert.ok(Math.abs(result.pHit-expected)<1e-10);
   assert.equal(result.accuracySource,"observed-cow-interpolation");
 }
 assert.equal(evaluate(cow,{...defaults,attack:30}).accuracySource,"provisional");
});

test("itemized supply and eating delay affect farming rates",()=>{
 const cow=mobs.find(m=>m.name==="Cow");
 const baseline={...defaults,useFoodEconomy:true,foodId:"sardine",hitpoints:20,foodCount:50,
   foodRecoveryBonus:0,foodCooldownSeconds:0,foodSupplySeconds:0,eatActionSeconds:0};
 const quick=evaluate(cow,baseline);
 const costly=evaluate(cow,{...baseline,foodCooldownSeconds:6,foodSupplySeconds:20});
 assert.equal(costly.foodEconomy.heal,4);
 assert.ok(costly.cycle>quick.cycle);
 assert.ok(costly.xpPerHour<quick.xpPerHour);
 assert.equal(costly.xpPerKill,16);
});

test("expected attack count respects finite hitpoints and overkill",()=>{
 assert.equal(expectedAttacksToKill(3,1,0.5),6);
 assert.equal(expectedAttacksToKill(3,3,1),1+(1+4/3)/3);
 assert.ok(expectedAttacksToKill(3,6,1)<expectedAttacksToKill(3,3,1));
 assert.ok(expectedAttacksToKill(3,60,1)>1);
 assert.throws(()=>expectedAttacksToKill(3,0,1));
});
test("cycle timing decomposes and every extra respawn second is charged per kill",()=>{
 const rat=mobs.find(m=>m.name==="Giant rat");
 const stats={...defaults,useFoodEconomy:true,foodId:"shrimp",foodCount:30};
 const quick=evaluate(rat,{...stats,respawnDelaySeconds:3});
 const slow=evaluate(rat,{...stats,respawnDelaySeconds:6});
 assert.ok(Math.abs(slow.cycle-quick.cycle-3)<1e-9);
 assert.ok(Math.abs(Object.values(slow.timeBreakdown).filter((_,i)=>i<5).reduce((a,b)=>a+b,0)-slow.cycle)<1e-9);
 assert.equal(slow.timeBreakdown.respawn,6);
});

test("default between-monster delay is five seconds",()=>{
 assert.equal(defaults.respawnDelaySeconds,5);
 const result=evaluate(mobs.find(m=>m.name==="Cow"),defaults);
 assert.equal(result.respawnDelay,5);
 assert.equal(result.timeBreakdown.respawn,5);
});
