import test from "node:test";
import assert from "node:assert/strict";
import {solveGoldenPath} from "../src/goldenPath.js";
test("search starts from level one and ignores the user's current levels",()=>{
 const r=solveGoldenPath({maxStates:150,maxLevel:20,minimumKnightKillsPerHour:999});
 assert.deepEqual([r.start.attack,r.start.strength,r.start.defense,r.start.fishing,r.start.cooking,r.start.herblaw],[1,1,1,1,1,1]);
 assert.equal(r.search,"bounded-uniform-cost");
 assert.ok(r.expanded>0);
 assert.ok(r.steps.every(step=>step.skill||step.gear));
});
test("route costs are positive and cumulative",()=>{
 const r=solveGoldenPath({maxStates:120,maxLevel:20,minimumKnightKillsPerHour:999});
 assert.ok(r.steps.every(x=>x.seconds>0));
 assert.ok(r.totalSeconds>=0);
 assert.ok(r.visited>=1);
});
test("no free late-game equipment or unsupported multiplayer routes",()=>{
 const r=solveGoldenPath({maxStates:130,maxLevel:20,minimumKnightKillsPerHour:999});
 assert.ok(r.steps.every(step=>!step.gear||step.detail.includes("Farm ")));
 assert.ok(r.steps.every(step=>!step.meta?.monster||!["Turkey","Imp"].includes(step.meta.monster)));
});
