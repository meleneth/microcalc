import test from "node:test";
import assert from "node:assert/strict";
import { xpRemaining, levelAt, evaluate, goldenPath, defaults } from "../src/solver.js";
import { mobs, xp } from "../src/data.js";
test("wiki XP thresholds",()=>{assert.equal(xp.length,99);assert.equal(xp[98],130344310);assert.equal(levelAt(830),2);assert.equal(xpRemaining(0,40),372240);});
test("Black knight wiki stats",()=>{const k=mobs.find(x=>x.name==="Black knight");assert.deepEqual([k.hp,k.attack,k.strength,k.defense],[38,30,41,42]);});
test("combat results are finite",()=>{const v=evaluate(mobs[0],defaults);assert.ok(v.ttk>0 && Number.isFinite(v.xpPerHour));});
test("route is deterministic and excludes inaccessible safe spots",()=>{const a=goldenPath({...defaults,foodHeal:10,foodCount:30},{attack:4,strength:4,defense:4});assert.deepEqual(a,goldenPath({...defaults,foodHeal:10,foodCount:30},{attack:4,strength:4,defense:4}));assert.ok(a.steps.every(s=>!s.mob.includes("Safe")));});
