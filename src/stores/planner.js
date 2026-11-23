import { defineStore } from "pinia";
import { computed,reactive,ref,watch } from "vue";
import { defaults, goldenPath, rankTargets } from "../solver.js";
export const usePlanner=defineStore("planner",()=>{
  function restored(){try{return JSON.parse(localStorage.getItem("microcalc.settings")||"{}")}catch{return {}}}
  const settings=reactive({...defaults,...restored()});
  const goal=ref(40);
  const candidates=computed(()=>rankTargets(settings));
  const plan=computed(()=>goldenPath(settings,{attack:goal.value,strength:goal.value,defense:goal.value}));
  watch(settings,v=>localStorage.setItem("microcalc.settings",JSON.stringify(v)),{deep:true});
  return {settings,goal,candidates,plan};
});
