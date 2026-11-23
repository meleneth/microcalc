import test from "node:test";
import assert from "node:assert/strict";
import {compareAccuracyModels, wilsonInterval, summarizeDamageRolls,validateObservation} from "../src/calibration.js";
test("reject missing or inconsistent observations",()=>{assert.throws(()=>validateObservation({attack:1,defense:1,hits:2,misses:-1}));});
test("candidate comparison is deterministic",()=>{const obs=[{attack:20,defense:20,hits:50,misses:50},{attack:40,defense:10,hits:82,misses:18}]; assert.deepEqual(compareAccuracyModels(obs),compareAccuracyModels(obs));});
test("Wilson confidence interval narrows with more trials",()=>{const small=wilsonInterval(5,5),large=wilsonInterval(500,500);assert.ok(large[1]-large[0]<small[1]-small[0]);});
test("raw damage rolls retain zeros as ambiguous",()=>{const s=summarizeDamageRolls([0,0,1,2,2]);assert.equal(s.observedMaxHit,2);assert.equal(s.zeroDamage,2);assert.equal(s.meanAttemptDamage,1);});
