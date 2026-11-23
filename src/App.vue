<script setup>
import { ref, computed, onUnmounted } from "vue";
import { sources } from "./data.js";
const maxStates=100000;
const status=ref("idle");
const progress=ref(null);
const result=ref(null);
const error=ref("");
let worker=null;
const fmt=n=>Number.isFinite(n)?Math.round(n).toLocaleString():"—";
const foodCount=n=>Number.isFinite(n)?n.toFixed(1):"—";
const hours=s=>Number.isFinite(s)?(s/3600).toFixed(2):"—";
const percent=computed(()=>progress.value?.phase==="route"?100:
  Math.min(99,Math.round(100*(progress.value?.expanded??0)/maxStates)));
function run(){
  if(worker){worker.terminate();worker=null;}
  status.value="running";progress.value=null;result.value=null;error.value="";
  worker=new Worker(new URL("./solver.worker.js",import.meta.url),{type:"module"});
  worker.onmessage=({data})=>{
    if(data.type==="progress")progress.value=data;
    else if(data.type==="done"){
      result.value=data.result;status.value="done";worker?.terminate();worker=null;
    }else if(data.type==="error"){
      error.value=data.message;status.value="error";worker?.terminate();worker=null;
    }
  };
  worker.onerror=e=>{error.value=e.message||"Solver worker failed";status.value="error";worker?.terminate();worker=null;};
  worker.postMessage({type:"run",options:{maxStates,maxLevel:45}});
}
onUnmounted(()=>worker?.terminate());
</script>
<template>
  <div class="app">
    <header><div class="brand"><span class="pixel">▣</span> MICROCALC <span class="muted">/ progression engine</span></div><span class="tag">BLACK KNIGHT / ROUTE SEARCH</span></header>
    <section class="intro">
      <p class="eyebrow">LEVEL ONE → SUSTAINABLE BLACK KNIGHT FARMING</p>
      <h1>Find the <span>fastest road.</span></h1>
      <p>Calculate whether your next hour is better spent on Attack, a Strength damage breakpoint, equipment, food, or potion preparation. Every choice includes the time it costs and how it changes future combat.</p>
      <button class="run-button" :disabled="status==='running'" @click="run">{{status==='running'?'Solving…':'▶ Run Solver'}}</button>
    </section>
    <main class="solver-view">
      <section v-if="status==='idle'" class="panel"><h2>Ready to explore</h2><p class="note">Two phases: search for the cheapest progression strategy, then reconstruct the recommended route. Starts at level 1 in all six skills, with no assumed free equipment. This is a bounded model, not a guaranteed optimal in-game solution.</p></section>
      <section v-if="status==='running'" class="panel" aria-live="polite">
        <div class="section-head"><h2>{{progress?.phase==='route'?'Phase 2 / Reconstructing route':progress?.phase==='optimization'?'Phase 2 / Improving the best route':'Phase 1 / Finding a feasible route'}}</h2><span class="tag">RUNNING</span></div>
        <div class="progress-track"><div class="progress-fill" :style="{width:percent+'%'}"></div></div>
        <div class="metrics">
          <div><small>States evaluated</small><strong>{{fmt(progress?.expanded??0)}}</strong></div>
          <div><small>States discovered</small><strong>{{fmt(progress?.visited??0)}}</strong></div>
          <div><small>Search budget</small><strong>{{fmt(maxStates)}}</strong></div>
          <div><small>Best Knight kills/hr</small><strong>{{(progress?.bestKnightRate??0).toFixed(1)}}</strong></div>
        </div>
        <p v-if="progress?.incumbentSeconds!==null&&progress?.incumbentSeconds!==undefined" class="summary">Best feasible route: {{hours(progress.incumbentSeconds)}} hours · {{progress.incumbentSteps?.length??0}} steps</p><p v-if="progress?.nextAction" class="note">Best next action: {{progress.nextAction}}</p><p class="note">{{fmt(progress?.pruned??0)}} dominated or over-budget states pruned. The bar shows the state budget used, not a completion-time prediction.</p>
      </section>
      <section v-if="status==='error'" class="panel"><h2>Solver failed</h2><p class="warning">{{error}}</p><button class="run-button" @click="run">Retry</button></section>
      <template v-if="result">
        <section class="panel">
          <div class="section-head"><h2>Phase 2 / Recommended route</h2><span class="tag">{{result.success?'GOAL REACHED':'PARTIAL RESULT'}}</span></div>
          <p class="summary">{{result.success?'Feasible modeled Black Knight route found':'No feasible route found within search budget'}}</p>
          <div class="metrics">
            <div><small>Estimated hours</small><strong>{{hours(result.totalSeconds)}}</strong></div>
            <div><small>Expected food eaten</small><strong>{{foodCount(result.totalExpectedFood)}}</strong></div>
            <div><small>Evaluated states</small><strong>{{fmt(result.expanded)}}</strong></div>
            <div><small>Knight kills/hr</small><strong>{{(result.knight.best?.killsPerHour??0).toFixed(1)}}</strong></div>
          </div>
          <p :class="result.success?'note':'warning'">{{result.reason}}</p>
          <p class="note">Food totals: {{Object.entries(result.foodTotals??{}).map(([id,n])=>id+' '+foodCount(n)).join(' · ')||'none'}}. Preparation and gathering {{hours(result.totalFoodSupplySeconds)}}h, already included in the route time. Fractions represent expected consumption.</p>
          <p class="note">Each combat training step uses the best modeled XP/hour fight available at that state. Combat XP credits 2× actual monster HP removed; food preparation, respawn, banking, and potion supply are included as estimated costs. Unverified game mechanics remain estimates.</p>
        </section>
        <section class="panel">
          <h2>Actions, in order</h2>
          <div class="table-wrap"><table><thead><tr><th>#</th><th>Next action</th><th>Hours</th><th>Accumulated</th></tr></thead>
            <tbody><tr v-for="(step,i) in result.jobs" :key="i">
              <td>{{i+1}}</td><td>{{step.detail}}
              <div v-if="step.steps?.some(s=>s.meta?.timeBreakdown)" class="note">
                Fight {{hours(step.steps.reduce((n,s)=>n+(s.meta?.timeBreakdown?.combat??0),0))}}h ·
                Between kills {{hours(step.steps.reduce((n,s)=>n+(s.meta?.timeBreakdown?.respawn??0),0))}}h ·
                Search {{hours(step.steps.reduce((n,s)=>n+(s.meta?.timeBreakdown?.search??0),0))}}h ·
                Banking {{hours(step.steps.reduce((n,s)=>n+(s.meta?.timeBreakdown?.banking??0),0))}}h ·
                Food &amp; potions {{hours(step.steps.reduce((n,s)=>n+(s.meta?.timeBreakdown?.supplies??0),0))}}h ·
                Expected food {{foodCount(step.expectedFood??0)}} ·
                Food preparation {{hours(step.steps.reduce((n,s)=>n+(s.meta?.foodSupplySeconds??0),0))}}h · Potion doses {{foodCount(step.expectedPotions??0)}}
              </div>
              <div v-if="step.segments?.length>1" class="note">
                {{step.segments.map(x=>x.monster+' ('+x.from+'→'+x.to+')').join(' · ')}}
              </div>
              </td><td>{{hours(step.seconds)}}</td><td>{{hours(step.cumulativeSeconds)}}<div class="note">{{foodCount(step.cumulativeExpectedFood??0)}} food eaten</div></td>
            </tr></tbody></table></div>
          <p v-if="!result.steps.length" class="note">The search found no supported progression action on the selected route.</p>
        </section>
        <section class="panel"><h2>Ending levels and equipment</h2>
          <p>Attack {{result.final.attack}} · Strength {{result.final.strength}} · Defence {{result.final.defense}} · Fishing {{result.final.fishing}} · Cooking {{result.final.cooking}} · Herblaw {{result.final.herblaw}}</p>
          <p class="note">Owned gear: {{result.final.gear.join(', ')||'none'}} · Equipped: {{result.finalEquipment?.join(', ')||'none'}} · Maintained potion: {{result.finalPotion||'none'}}</p>
          <p class="note">Expected potion doses: {{foodCount(result.expectedPotionDoses)}} · Ingredient collection and mixing: {{hours(result.totalPotionSupplySeconds)}}h, included in route time.</p>
          <p class="warning">Expected-value survival is not proof of survivability. Enemy attack rolls, potion duration accounting, supply acquisition and some monster availability still require measurement.</p>
        </section>
      </template>
    </main>
    <footer>Sources: <a :href="sources.xp" target="_blank">XP table</a> · <a :href="sources.mobs" target="_blank">Monsters</a> · <a :href="sources.reference" target="_blank">Combat reference</a>. Calibrated observations and assumptions are not interchangeable.</footer>
  </div>
</template>
