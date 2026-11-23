import test from "node:test";
import assert from "node:assert/strict";
import { xpRemaining, levelAt, evaluate, goldenPath, defaults, meleeMaxHit } from "../src/solver.js";
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
