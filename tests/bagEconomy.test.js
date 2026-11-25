import test from "node:test";
import assert from "node:assert/strict";
import {bagEconomy} from "../src/bagEconomy.js";
import {evaluate,defaults} from "../src/solver.js";
import {mobs} from "../src/data.js";
test("guaranteed bones fill a one-slot goblin bag in one kill",()=>{
  assert.equal(bagEconomy("Goblin",{capacity:1}).killsPerBank,1);
});
test("larger bags and scraps change banking frequency",()=>{
  const base=bagEconomy("Cow");
  assert.ok(base.killsPerBank>20);
  assert.ok(bagEconomy("Cow",{capacity:30}).killsPerBank>base.killsPerBank);
  assert.ok(bagEconomy("Cow",{foodPerKill:2,scrapChance:.5}).killsPerBank<base.killsPerBank);
  assert.equal(bagEconomy("Cow",{foodPerKill:2,scrapChance:.5}).expectedScraps,1);
});
test("independent chicken rolls and overshoot are modeled",()=>{
  assert.ok(Math.abs(bagEconomy("Chicken",{capacity:1}).killsPerBank-4/3)<1e-10);
  assert.ok(Math.abs(bagEconomy("Chicken",{capacity:2}).killsPerBank-20/9)<1e-10);
});
test("missing loot uses explicit fallback",()=>{
  assert.equal(bagEconomy("unknown").killsPerBank,20);
  assert.equal(bagEconomy("unknown").source,"unknown-loot-fallback");
});
test("combat pricing uses actual bag frequency",()=>{
  const cow=mobs.find(m=>m.name==="Cow");
  const a=evaluate(cow,defaults),b=evaluate(cow,{...defaults,bagCapacity:30});
  assert.equal(a.timeBreakdown.banking,90/a.bag.killsPerBank);
  assert.ok(b.cycle<a.cycle);
  assert.ok(b.xpPerHour>a.xpPerHour);
});
