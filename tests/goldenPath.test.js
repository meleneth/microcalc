import test from "node:test";
import assert from "node:assert/strict";
import {solveGoldenPath,solveGoldenPathProgress} from "../src/goldenPath.js";
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

test("progress generator reports exploration and returns a route",()=>{
 const generator=solveGoldenPathProgress({maxStates:100,maxLevel:12,minimumKnightKillsPerHour:999});
 const updates=[];
 let next=generator.next();
 while(!next.done){updates.push(next.value);next=generator.next();}
 assert.ok(updates.some(e=>e.phase==="search"&&e.expanded>0));
 assert.ok(updates.some(e=>e.phase==="route"));
 assert.equal(next.value.expanded>0,true);
});
test("combat search includes level-one strength progression",()=>{
 const r=solveGoldenPath({maxStates:80,maxLevel:12,minimumKnightKillsPerHour:999});
 assert.equal(r.start.strength,1);
 assert.ok(r.visited>1);
});
