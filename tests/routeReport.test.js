import test from "node:test";
import assert from "node:assert/strict";
import { buildRouteJobs } from "../src/routeReport.js";

const equipped=s=>({names:s.gear});

test("adjacent levels of the same skill merge without losing cost or food",()=>{
 const initial={attack:1,strength:1,gear:[]};
 const actions=[
  {skill:"attack",to:2,seconds:10,stateAfter:{attack:2,strength:1,gear:[]},
    cumulativeSeconds:10,cumulativeExpectedFood:2,
    meta:{kills:2,expectedFood:2,segments:[{monster:"Mouse"}]}},
  {skill:"attack",to:3,seconds:20,stateAfter:{attack:3,strength:1,gear:[]},
    cumulativeSeconds:30,cumulativeExpectedFood:5,
    meta:{kills:3,expectedFood:3,segments:[{monster:"Cow"}]}},
  {skill:"strength",to:2,seconds:30,stateAfter:{attack:3,strength:2,gear:[]},
    cumulativeSeconds:60,cumulativeExpectedFood:5,
    meta:{kills:4,expectedFood:0,segments:[{monster:"Cow"}]}}
 ];
 const jobs=buildRouteJobs(actions,initial,equipped);
 assert.equal(jobs.length,2);
 assert.equal(jobs[0].detail,"Train attack 1→3 on Mouse → Cow (5 kills)");
 assert.equal(jobs[0].seconds,30);
 assert.equal(jobs[0].expectedFood,5);
 assert.equal(jobs[0].cumulativeSeconds,30);
 assert.equal(jobs[1].detail,"Train strength 1→2 on Cow (4 kills)");
});
test("equipment replacement appears only after acquiring gear",()=>{
 const initial={attack:1,gear:[]};
 const steps=[
  {gear:"bronze full helm",seconds:45,detail:"Farm bronze full helm",
   stateAfter:{attack:1,gear:["bronze full helm"]},
   cumulativeSeconds:45,cumulativeExpectedFood:1,meta:{expectedFood:1}}
 ];
 const jobs=buildRouteJobs(steps,initial,equipped);
 assert.deepEqual(jobs.map(x=>x.kind),["action","equipment"]);
 assert.equal(jobs[1].seconds,0);
 assert.equal(jobs.reduce((sum,j)=>sum+j.seconds,0),45);
});
