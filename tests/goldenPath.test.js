import test from "node:test";
import assert from "node:assert/strict";
import {solveGoldenPath,solveGoldenPathProgress} from "../src/goldenPath.js";
test("search starts from level one and ignores the user's current levels",()=>{
 const r=solveGoldenPath({maxStates:150,maxLevel:20,minimumKnightKillsPerHour:999});
 assert.deepEqual([r.start.attack,r.start.strength,r.start.defense,r.start.fishing,r.start.cooking,r.start.herblaw],[1,1,1,1,1,1]);
 assert.equal(r.search,"anytime-dominance-best-first");
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
 assert.ok(updates.some(e=>e.phase==="feasibility"&&e.expanded>0));
 assert.ok(updates.some(e=>e.phase==="route"));
 assert.equal(next.value.expanded>0,true);
});
test("combat search includes level-one strength progression",()=>{
 const r=solveGoldenPath({maxStates:80,maxLevel:12,minimumKnightKillsPerHour:999});
 assert.equal(r.start.strength,1);
 assert.ok(r.visited>1);
});

test("bounded search distinguishes exhaustion from impossible goals",()=>{
 const r=solveGoldenPath({maxStates:25,maxLevel:12,minimumKnightKillsPerHour:999});
 assert.equal(r.success,false);
 assert.ok(["budget-exhausted","frontier-exhausted"].includes(r.termination));
 assert.ok(!r.reason.includes("impossible"));
 assert.ok(r.pruned>=0);
});
test("progress includes incumbent and pruning fields",()=>{
 const g=solveGoldenPathProgress({maxStates:30,maxLevel:12,minimumKnightKillsPerHour:999});
 const item=g.next();
 assert.equal(item.done,false);
 assert.equal(item.value.phase,"feasibility");
 assert.equal(typeof item.value.pruned,"number");
 assert.ok("incumbentSeconds" in item.value);
});
test("route step cumulative times are monotone and exact",()=>{
 const r=solveGoldenPath({maxStates:75,maxLevel:12,minimumKnightKillsPerHour:999});
 let elapsed=0;
 for(const step of r.steps){
  elapsed+=step.seconds;
  assert.ok(Math.abs(elapsed-step.cumulativeSeconds)<1e-7);
 }
});

test("food consumption is accounted for in route and time score",()=>{
 const r=solveGoldenPath({maxStates:110,maxLevel:15,minimumKnightKillsPerHour:999});
 const expected=r.steps.reduce((sum,step)=>sum+(step.meta?.expectedFood??0),0);
 const supply=r.steps.reduce((sum,step)=>sum+(step.meta?.foodSupplySeconds??0),0);
 assert.ok(Math.abs(r.totalExpectedFood-expected)<1e-8);
 assert.ok(Math.abs(r.totalFoodSupplySeconds-supply)<1e-8);
 assert.ok(r.totalExpectedFood>=0 && r.totalFoodSupplySeconds>=0);
 for(const step of r.steps){
  if(!step.meta?.timeBreakdown)continue;
  const accounted=Object.values(step.meta.timeBreakdown).reduce((sum,n)=>sum+n,0);
  assert.ok(Math.abs(accounted-step.seconds)<1e-6);
  assert.ok((step.meta.foodSupplySeconds??0)<=step.meta.timeBreakdown.supplies+1e-7);
 }
 const byFood=Object.values(r.foodTotals).reduce((sum,n)=>sum+n,0);
 assert.ok(Math.abs(byFood-r.totalExpectedFood)<1e-7);
});

test("route report preserves total time, food and potion doses",()=>{
 const r=solveGoldenPath({maxStates:80,maxLevel:14,minimumKnightKillsPerHour:999});
 const seconds=r.jobs.reduce((sum,j)=>sum+j.seconds,0);
 const food=r.jobs.reduce((sum,j)=>sum+(j.expectedFood??0),0);
 const doses=r.jobs.reduce((sum,j)=>sum+(j.expectedPotions??0),0);
 assert.ok(Math.abs(seconds-r.totalSeconds)<1e-5);
 assert.ok(Math.abs(food-r.totalExpectedFood)<1e-5);
 assert.ok(Math.abs(doses-r.expectedPotionDoses)<1e-5);
 assert.equal(r.start.potion,null);
});

test("Tutorial Bay is excluded even when requested in encounter availability",()=>{
 const r=solveGoldenPath({maxStates:120,maxLevel:12,minimumKnightKillsPerHour:999,
   encounterAvailability:["Island rodent","Mouse","Chicken","Giant rat","Cow"]});
 assert.ok(r.steps.every(step=>!step.detail.includes("Island rodent")));
 assert.ok(r.steps.every(step=>
   !(step.meta?.segments??[]).some(segment=>segment.monster==="Island rodent")));
 assert.ok(r.jobs.every(job=>!job.detail.includes("Island rodent")));
});
