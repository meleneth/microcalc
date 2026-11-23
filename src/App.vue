<script setup>
import { computed } from "vue";
import { usePlanner } from "./stores/planner.js";
import { sources } from "./data.js";
import { strengthPotionValue, strengthPotionDependency } from "./progression.js";
import { foods } from "./foods.js";
const store=usePlanner();
const fmt=n=>Number.isFinite(n)?Math.round(n).toLocaleString():"—";
const hours=s=>Number.isFinite(s)?(s/3600).toFixed(1):"—";
const knight=computed(()=>store.plan.knight);
const strengthSupply=computed(()=>strengthPotionDependency(1,store.settings));
const strengthBoost=computed(()=>strengthPotionValue(store.settings.strength+store.settings.strengthBonus,1,store.settings));
const inputs=[
 ["attack","Attack level",1,99],["strength","Strength level",1,99],["defense","Defence level",1,99],
 ["hitpoints","Hitpoints",1,999],["attackBonus","Equipment attack",0,500],["strengthBonus","Equipment strength",0,500],
 ["defenseBonus","Equipment defence",0,500],["damageBonus","Flat max-hit bonus",0,100],
 ["cooldown","Attack seconds",0.5,60],["enemyCooldown","Enemy attack seconds",0.5,60],
 ["foodHeal","Legacy flat food HP",0,100],["foodCount","Food per trip",0,100],["foodRecoveryBonus","Bonus healing per food",0,100],["foodSupplySeconds","Acquire + cook seconds / food",0,3600],["foodCooldownSeconds","Eating cooldown (unverified)",0,120],["eatActionSeconds","Time spent eating",0,120],["regenPerSecond","Passive HP / second",0,10],
 ["respawnDelaySeconds","Between-monster delay (estimated)",0,60],["searchSeconds","Loot/search seconds / kill",0,600],["bankSeconds","Bank round-trip seconds",0,3600],["killsPerBank","Kills per bank trip",1,1000],
 ["foodRestockSeconds","Food restock seconds / unit",0,600]
];
</script>
<template>
 <div class="app">
  <header><div class="brand"><span class="pixel">▣</span> MICROCALC <span class="muted">/ combat laboratory</span></div><span class="tag">EARLY GAME · BETA</span></header>
  <section class="intro"><p class="eyebrow">PROGRESSION ENGINE / 001</p><h1>The road to <span>Black Knight.</span></h1><p>Compare ordinary combat encounters, then chart a progression route. No rare gauntlets, no safe spots, no magical endgame shortcuts.</p></section>
  <div class="layout">
   <aside class="panel"><h2>01 / Loadout and rules</h2><p class="note">Stats are editable. Accuracy and damage timing are estimates. Combat XP is 2× actual HP removed, with no overkill.</p>
    <label class="toggle"><input type="checkbox" v-model="store.settings.useFoodEconomy"/> Enable itemized food and supply costs</label>
    <label v-if="store.settings.useFoodEconomy" class="toggle">Food type <select v-model="store.settings.foodId"><option v-for="food in foods" :key="food.id" :value="food.id">{{food.id}} ({{food.heal}} HP)</option></select></label>
    <label v-if="store.settings.useFoodEconomy" class="toggle">Cooldown behavior <select v-model="store.settings.foodCooldownMode"><option value="unattended">Unattended auto-eat (no time penalty)</option><option value="blocking">Cooldown blocks actions (manual scenario)</option><option value="cooldown-overlap">Cooldown overlaps attacks (manual scenario)</option></select></label>
    <div class="inputs"><label v-for="[key,label,min,max] in inputs" :key="key"><span>{{label}}</span><input type="number" :min="min" :max="max" :step="key==='cooldown'||key==='enemyCooldown'||key==='regenPerSecond'||key==='respawnDelaySeconds'||key==='foodCooldownSeconds'||key==='eatActionSeconds'?0.1:1" v-model.number="store.settings[key]" /></label></div>
    <label class="toggle"><input type="checkbox" v-model="store.settings.allowBlackKnight"/> Include Black Knight in training choices</label>
   </aside>
   <main class="results">
    <section class="panel"><div class="section-head"><h2>02 / Combat viability</h2><span class="tag">STANDARD ENCOUNTER</span></div>
      <div class="metrics"><div><small>Time to defeat</small><strong>{{knight.ttk.toFixed(1)}}s</strong></div><div><small>Expected damage</small><strong>{{knight.expectedDamage.toFixed(1)}} HP</strong></div><div><small>Food / kill</small><strong>{{knight.foodNeeded.toFixed(2)}}</strong></div><div><small>Estimated kills / hr</small><strong>{{knight.killsPerHour.toFixed(1)}}</strong></div></div>
      <p v-if="knight.foodEconomy" class="note">Food: {{knight.foodEconomy.foodId}} ({{knight.foodEconomy.heal}} effective HP), {{knight.foodEconomy.foodSecondsPerKill.toFixed(1)}}s supply time and {{knight.foodEconomy.eatSecondsPerKill.toFixed(1)}}s eating overhead per estimated kill. Unattended auto-eat has no per-food cooldown time tax; survival under repeated hits still requires a discrete-event simulation.</p>
      <p class="note">A solo kill earns 2 XP per HP removed (Black Knight: 76 XP). Cow hit chance uses measured interpolation only at effective Attack 17–24; outside that range, accuracy remains provisional.</p>
      <p class="note">Per kill: {{knight.ttk.toFixed(1)}}s fighting + {{knight.respawnDelay.toFixed(1)}}s between monsters + {{knight.searchDelay.toFixed(1)}}s searching, plus amortized banking and supplies. The 4.5s default is an unverified midpoint of the reported 3–6s interval.</p>
      <p class="warning">Expected values are not survival guarantees. Simulating variance and exact game rolls is a future calibration requirement.</p>
    </section>
    <section class="panel"><div class="section-head"><h2>SUPPLY / Bear → Strength Potion</h2><span class="tag">HERBLAW 13</span></div>
      <div class="metrics"><div><small>Bear kills / root (expected)</small><strong>{{strengthSupply.knownBottleneck.expectedKills}}</strong></div>
      <div><small>Potion max hit gain</small><strong>+{{strengthBoost.maxHitGain}}</strong></div>
      <div><small>Potion lasts</small><strong>60 min</strong></div><div><small>Herblaw XP per dose</small><strong>735</strong></div></div>
      <p class="note">1 purchased vial filled with water + 1 Limpwurt Root, 386 seconds per brew. Bear drops the root at 1/32. Expected kills are not a guarantee. {{strengthBoost.damageBreakpointGained?'Your current Strength crosses a damage breakpoint with +5.':'Your current Strength does not cross a damage breakpoint with +5.'}}</p>
    </section>
    <section class="panel"><div class="section-head"><h2>03 / Farming candidates</h2><span class="tag">ESTIMATED XP / HR</span></div>
     <div class="table-wrap"><table><thead><tr><th>Target</th><th>XP/hr</th><th>Kills/hr</th><th>Damage</th></tr></thead><tbody><tr v-for="r in store.candidates.slice(0,12)" :key="r.mob.name"><td>{{r.mob.name}}</td><td>{{fmt(r.xpPerHour)}}</td><td>{{r.killsPerHour.toFixed(1)}}</td><td>{{r.expectedDamage.toFixed(1)}}</td></tr></tbody></table></div>
     <p v-if="!store.candidates.length" class="warning">No encounter passes the current expected-survival filter. Improve defence, hitpoints, or food.</p>
    </section>
    <section class="panel"><div class="section-head"><h2>04 / Golden-path candidate</h2><label class="goal">All combat levels to <input type="number" min="1" max="99" v-model.number="store.goal"/></label></div>
     <p class="note">Deterministic greedy baseline, not a proven global optimum. Each step picks the best currently viable estimated XP/hour target and trains the lowest combat skill.</p>
     <p class="summary">{{store.plan.reachable?"Estimated training time: "+hours(store.plan.totalSeconds)+" hours":"Unable to reach target under current rules"}}</p>
     <div class="table-wrap"><table><thead><tr><th>Mob</th><th>Skill</th><th>Levels</th><th>Kills</th><th>Hours</th></tr></thead><tbody><tr v-for="(step,i) in store.plan.steps" :key="i"><td>{{step.mob}}</td><td>{{step.skill}}</td><td>{{step.from}} → {{step.to}}</td><td>{{fmt(step.kills)}}</td><td>{{hours(step.seconds)}}</td></tr></tbody></table></div>
    </section>
   </main>
  </div>
  <footer>Wiki snapshots: <a :href="sources.xp" target="_blank">XP table</a> · <a :href="sources.mobs" target="_blank">Monster stats</a> · <a :href="sources.reference" target="_blank">Combat planner reference</a> · Model assumptions are NOT wiki facts.</footer>
 </div>
</template>
