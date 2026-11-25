<script setup>
import { ref, computed, onUnmounted } from "vue";
import { sources } from "./data.js";
import { defaultStartingLevels, startingLevels } from "./startingLevels.js";
import { defaultStartingGear, startingGearChoices } from "./startingGear.js";
const maxStates=100000;
const initialLevels=ref({...defaultStartingLevels});
const ownedGear=ref([...defaultStartingGear]);
const validLevels=computed(()=>{try{startingLevels(initialLevels.value);return true;}catch{return false;}});
const bagCapacity=ref(25);
const scrapPercent=ref(0);
const bankSeconds=ref(90);
const status=ref("idle");
const progress=ref(null);
const result=ref(null);
const error=ref("");
const displayedPlan=computed(()=>result.value??progress.value?.bestPlan??null);
const livePlan=computed(()=>status.value==="running");
let worker=null;
const fmt=n=>Number.isFinite(n)?Math.round(n).toLocaleString():"—";
const foodCount=n=>Number.isFinite(n)?n.toFixed(1):"—";
const hours=s=>Number.isFinite(s)?(s/3600).toFixed(2):"—";
const percent=computed(()=>progress.value?.phase==="route"?100:
  Math.min(99,Math.round(100*(progress.value?.expanded??0)/maxStates)));
function run(){
  if(!validLevels.value)return;
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
  worker.postMessage({type:"run",options:{maxStates,maxLevel:45,startingLevels:{...initialLevels.value},startingGear:[...ownedGear.value],bagCapacity:Number(bagCapacity.value),scrapChance:Number(scrapPercent.value)/100,bankSeconds:Number(bankSeconds.value)}});
}
onUnmounted(()=>worker?.terminate());
</script>
<template>
  <div class="app">
    <header><div class="brand"><span class="pixel">▣</span> MICROCALC <span class="muted">/ progression engine</span></div><span class="tag">BLACK KNIGHT / ROUTE SEARCH</span></header>
    <section class="intro">
      <p class="eyebrow">CURRENT LEVELS → SUSTAINABLE BLACK KNIGHT FARMING</p>
      <h1>Find the <span>fastest road.</span></h1>
      <p>Calculate whether your next hour is better spent on Attack, a Strength damage breakpoint, equipment, food, or potion preparation. Every choice includes the time it costs and how it changes future combat.</p>
      <div class="note">
        <h2>Starting levels</h2>
        <div class="metrics">
          <label v-for="(_,skill) in initialLevels" :key="skill" style="text-transform:capitalize">
            {{skill}} <input type="number" min="1" max="99" step="1" v-model.number="initialLevels[skill]" :disabled="status==='running'">
          </label>
        </div>
        <p>Starts at the selected level thresholds with the owned equipment below and no active potions.</p>
        <p v-if="!validLevels" class="warning">All starting levels must be integers from 1 to 99.</p>
      </div>
      <div class="note">
        <h2>Starting equipment</h2>
        <details>
          <summary>{{ownedGear.join(', ')||'None owned'}}</summary>
          <div class="metrics">
            <label v-for="item in startingGearChoices" :key="item">
              <input type="checkbox" :value="item" v-model="ownedGear" :disabled="status==='running'"> {{item}}
            </label>
          </div>
        </details>
        <p>Fox hat and gardener's gloves are tracked as owned; unverified bonuses are not applied.</p>
      </div>
      <div class="note">
        <label>Loot bag capacity <input type="number" min="1" max="1000" v-model.number="bagCapacity" :disabled="status==='running'"></label>
        <label> Scraps per meal (%) <input type="number" min="0" max="100" step="1" v-model.number="scrapPercent" :disabled="status==='running'"></label>
        <label> Banking trip (seconds) <input type="number" min="0" v-model.number="bankSeconds" :disabled="status==='running'"></label>
        <p>Scrap chance is unverified; 0% is a lower-bound scenario, not a measured rate.</p>
      </div>
      <button class="run-button" :disabled="status==='running'||!validLevels" @click="run">{{status==='running'?'Solving…':'▶ Run Solver'}}</button>
    </section>
    <main class="solver-view">
      <section v-if="status==='idle'" class="panel"><h2>Ready to explore</h2><p class="note">Two phases: search for the cheapest progression strategy, then reconstruct the recommended route. Starts at the selected skill levels, with the selected starting equipment. This is a bounded model, not a guaranteed optimal in-game solution.</p></section>
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
      <template v-if="displayedPlan">
        <section class="panel">
          <div class="section-head"><h2>{{livePlan?'Best route so far':'Recommended route'}}</h2><span class="tag">{{livePlan?(displayedPlan.success?'BEST FEASIBLE':'PROVISIONAL'):displayedPlan.success?'GOAL REACHED':'PARTIAL RESULT'}}</span></div>
          <p class="summary">{{displayedPlan.success?'Feasible modeled Black Knight route found':livePlan?'Highest readiness score so far; goal not yet reached':'No feasible route found within search budget'}}</p>
          <div class="metrics">
            <div><small>Estimated hours</small><strong>{{hours(displayedPlan.totalSeconds)}}</strong></div>
            <div><small>Expected food eaten</small><strong>{{foodCount(displayedPlan.totalExpectedFood)}}</strong></div>
            <div><small>Evaluated states</small><strong>{{fmt(result?.expanded??progress?.expanded??0)}}</strong></div>
            <div><small>Knight kills/hr</small><strong>{{(displayedPlan.knight.best?.killsPerHour??0).toFixed(1)}}</strong></div>
          </div>
          <p v-if="!livePlan" :class="displayedPlan.success?'note':'warning'">{{result?.reason}}</p><p v-else class="note">Live search: feasible routes are ranked by lowest total time; until then, the highest readiness score wins.</p>
          <p class="note">Food totals: {{Object.entries(displayedPlan.foodTotals??{}).map(([id,n])=>id+' '+foodCount(n)).join(' · ')||'none'}}. Preparation and gathering {{hours(displayedPlan.totalFoodSupplySeconds)}}h, already included in the route time. Fractions represent expected consumption.</p>
          <p class="note">Each combat training step uses the best modeled XP/hour fight available at that state. Combat XP credits 2× actual monster HP removed; food preparation, respawn, banking, and potion supply are included as estimated costs. Unverified game mechanics remain estimates.</p>
        </section>
        <section class="panel">
          <h2>Actions, in order</h2>
          <div class="table-wrap"><table><thead><tr><th>#</th><th>Next action</th><th>Hours</th><th>Accumulated</th></tr></thead>
            <tbody><tr v-for="(step,i) in displayedPlan.jobs" :key="i">
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
          <p v-if="!displayedPlan.steps.length" class="note">No progression actions in this route yet.</p>
        </section>
        <section class="panel"><h2>Ending levels and equipment</h2>
          <p>Attack {{displayedPlan.final.attack}} · Strength {{displayedPlan.final.strength}} · Defence {{displayedPlan.final.defense}} · Fishing {{displayedPlan.final.fishing}} · Cooking {{displayedPlan.final.cooking}} · Herblaw {{displayedPlan.final.herblaw}}</p>
          <p class="note">Owned gear: {{displayedPlan.final.gear.join(', ')||'none'}} · Equipped: {{displayedPlan.finalEquipment?.join(', ')||'none'}} · Maintained potion: {{displayedPlan.finalPotion||'none'}}</p>
          <p class="note">Expected potion doses: {{foodCount(displayedPlan.expectedPotionDoses)}} · Ingredient collection and mixing: {{hours(displayedPlan.totalPotionSupplySeconds)}}h, included in route time.</p>
          <p class="warning">Expected-value survival is not proof of survivability. Enemy attack rolls, potion duration accounting, supply acquisition and some monster availability still require measurement.</p>
        </section>
      </template>
    </main>
    <footer>Sources: <a :href="sources.xp" target="_blank">XP table</a> · <a :href="sources.mobs" target="_blank">Monsters</a> · <a :href="sources.reference" target="_blank">Combat reference</a>. Calibrated observations and assumptions are not interchangeable.</footer>
  </div>
</template>
