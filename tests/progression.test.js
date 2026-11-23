import test from "node:test";
import assert from "node:assert/strict";
import { gameConstraints, equipable, candidateLoadouts, dropAcquisition, foxHatDependency, strengthPotionDependency, strengthPotionValue, groupEncounter } from "../src/progression.js";
import { earlyGear } from "../src/earlyGear.js";
test("early equipment respects attack thresholds",()=>{
 const steel=earlyGear.find(g=>g.name==="steel scimitar");
 assert.equal(equipable(steel,{attack:19}),false);
 assert.equal(equipable(steel,{attack:20}),true);
});
test("strength potion has bear material dependency, without claiming recipe validated",()=>{
 const d=strengthPotionDependency(2);
 assert.equal(d.recipeVerified,true);
 assert.deepEqual(d.requirements,{herblaw:13});
 assert.equal(d.xp,1470);
 assert.equal(d.craftSeconds,772);
 assert.equal(d.knownBottleneck.expectedKills,64);
 assert.equal(d.knownBottleneck.item,"limpwurt root");
 assert.equal(strengthPotionValue(13).maxHitGain,1);
 assert.equal(strengthPotionValue(12).maxHitGain,0);
});
test("fox hat dependency traces to mouse lucky paw",()=>{
 assert.equal(foxHatDependency().prerequisites[0].expectedKills,1024);
});
test("group assignments do not divide loot without verified rules",()=>{
 assert.equal(groupEncounter("Turkey").requiredAllies,7);
 assert.equal(groupEncounter("Imp").requiredAllies,1);
 assert.ok(groupEncounter("Turkey").requiredItems.includes("fox hat"));
});
test("candidate loadouts include exact strength breakpoints",()=>{
 const rows=candidateLoadouts({attack:1,strength:11,defense:1},{attack:1,strength:11,defense:1,hitpoints:10,attackBonus:0,strengthBonus:0,defenseBonus:0,damageBonus:0,cooldown:6,enemyCooldown:6,foodHeal:4,foodCount:5,regenPerSecond:0,searchSeconds:5,bankSeconds:90,killsPerBank:20,foodRestockSeconds:8,xpPerDamage:4},["bronze dagger","bronze scimitar"]);
 assert.ok(rows.some(r=>r.gear.includes("bronze scimitar")&&r.maxHit===3));
});
