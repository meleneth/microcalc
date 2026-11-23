import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { accuracyCandidates } from "../src/calibration.js";
const o=JSON.parse(readFileSync(new URL("../fixtures/observations/cow-2026-11-23.json",import.meta.url),"utf8"));
test("visible stat totals account separately for active potion",()=>{
 assert.equal(o.player.levels.attack+o.player.bonuses.attackGear+o.player.bonuses.attackPotion,24);
 assert.equal(o.player.levels.strength+o.player.bonuses.strengthGear,13);
 assert.equal(o.player.levels.defense+o.player.bonuses.defenseGear,7);
});
test("the current ratio placeholder does not reproduce the displayed 79 percent",()=>{
 // Baseline repo data lists Cow defence as 5; verify separately before treating it as game truth.
 const predicted=accuracyCandidates.ratio({attack:o.player.effective.attack,defense:5});
 assert.ok(Math.abs(predicted*100-o.enemy.hitChancePercentShown)>1);
});
