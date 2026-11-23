import test from "node:test";
import assert from "node:assert/strict";
import { estimatedEnemyMaxHit,monsterMaterialSeconds,foodSupplyCost,foodEconomy } from "../src/foodEconomy.js";
test("enemy max hits are explicitly estimates",()=>{
 assert.equal(estimatedEnemyMaxHit({strength:3}),1);
 assert.equal(estimatedEnemyMaxHit({strength:30}),6);
 assert.equal(estimatedEnemyMaxHit({strength:41}),7);
});
test("monster supplies require actual documented drops",()=>{
 assert.equal(monsterMaterialSeconds("Bear","raw meat",20),20);
 assert.equal(monsterMaterialSeconds("Bear","nonexistent item",20),null);
});
test("acquisition and cooking time are accounted per food",()=>{
 const s=foodSupplyCost({foodId:"sardine",source:"buy",rawAcquireSeconds:4,cookingSeconds:18,travelSeconds:2});
 assert.equal(s.secondsPerFood,24);
});
test("eating cooldown and food acquisition can dominate the farming cycle",()=>{
 const base={foodId:"sardine",maxHp:10,expectedDamagePerKill:8,foodCount:10,
    foodCooldownSeconds:6,supplySecondsPerFood:22,eatActionSeconds:1};
 const blocking=foodEconomy({...base,mode:"blocking"});
 const overlap=foodEconomy({...base,mode:"cooldown-overlap"});
 assert.equal(blocking.foodPerKill,2);
 assert.equal(blocking.extraSecondsPerKill,56);
 assert.equal(overlap.extraSecondsPerKill,46);
 assert.equal(blocking.theoreticalKillsPerInventory,5);
});
test("healing is bounded by HP capacity",()=>{
 assert.equal(foodEconomy({foodId:"lobster",maxHp:10,expectedDamagePerKill:5,foodCount:10,foodCooldownSeconds:0,supplySecondsPerFood:0}).heal,10);
});

test("unattended trout restores seven HP without charging eating cooldown",()=>{
 const p=foodEconomy({foodId:"trout",maxHp:10,expectedDamagePerKill:14,foodCount:10,
   foodCooldownSeconds:6,supplySecondsPerFood:24,eatActionSeconds:2,mode:"unattended"});
 assert.equal(p.heal,7);
 assert.equal(p.foodPerKill,2);
 assert.equal(p.foodSecondsPerKill,48);
 assert.equal(p.eatSecondsPerKill,0);
 assert.equal(p.extraSecondsPerKill,48);
});
