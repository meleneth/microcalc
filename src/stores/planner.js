import { defineStore } from "pinia";
import { computed,reactive,ref,watch } from "vue";
import { defaults, rankTargets } from "../solver.js";
import { solveGoldenPath } from "../goldenPath.js";
export const usePlanner=defineStore("planner",()=>{
  function restored(){try{return JSON.parse(localStorage.getItem("microcalc.settings")||"{}")}catch{return {}}}
  const settings=reactive({...defaults,...restored()});
  const goal=ref(40);
  const searchBudget=ref(2000);
  const candidates=computed(()=>rankTargets(settings));
  const plan=computed(()=>solveGoldenPath({maxStates:searchBudget.value,maxLevel:Math.max(30,Math.min(60,goal.value)),
    respawnDelaySeconds:settings.respawnDelaySeconds,bankSeconds:settings.bankSeconds,killsPerBank:settings.killsPerBank,bagCapacity:settings.bagCapacity,scrapChance:settings.scrapChance}));
  watch(settings,v=>localStorage.setItem("microcalc.settings",JSON.stringify(v)),{deep:true});
  return {settings,goal,searchBudget,candidates,plan};
});
