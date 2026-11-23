import { xp, mobs } from "./data.js";
import { earlyGear } from "./earlyGear.js";
import { lootTables, expectedKillsForDrop } from "./lootTables.js";
import { foods } from "./foods.js";
import { evaluate, defaults, meleeMaxHit } from "./solver.js";
import { gameConstraints } from "./progression.js";

// Search actions are *milestones* rather than individual XP ticks.
// This is a bounded uniform-cost search over explicit, priced transitions.
// Results are optimal only within the configured milestone/action model and
// the search budget, NEVER a proof of globally optimal in-game progression.
const SKILLS=["attack","strength","defense","fishing","cooking","herblaw"];
const COMBAT=["attack","strength","defense"];
const CAP=99;
const defaultOptions={
  maxStates:12000,
  maxSeconds:3600*24*30,
  maxLevel:45,
  encounterAvailability:["Island rodent","Mouse","Chicken","Giant rat","Cow","Goblin",
    "Insect swarm","Titan scorpion","Snake","Monk","Skeleton","Cave slime","Bear",
    "Ghost","Fire dwarf","Mummy"],
  // These are estimates/settings, not verified wiki progression times.
  fishingXpPerAction:40,fishingActionSeconds:22,
  cookingXpPerAction:20,cookingActionSeconds:18,
  herblawXpPerAction:150,herblawActionSeconds:60,
  boughtRawSardineSeconds:0, boughtVialSeconds:0,
  herbIngredientSeconds:90,
  fishingFoodSeconds:22,
  supplySecondsPerFood:18,
  equipmentAcquisitionEnabled:true,
  maxFoodPerKill:5,
  minimumKnightKillsPerHour:10,
  // Do not model guaranteed survival using only expectation values.
  requireExpectationSurvival:true,
  simulatedMonsterMaxHit:true
};
const level=(s,k)=>s[k]??1;
const toKey=s=>SKILLS.map(k=>s[k]).join(":")+"|"+s.gear.join(",");
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const nextMilestone=(skill,v,limit)=>{
  if(v>=limit)return null;
  const fixed=skill==="attack"||skill==="defense"?[v+1]:
    skill==="strength"?[v+1,6,12,18,24,30,36,42,48,54,60,66,72,78,84,90,96].filter(x=>x>v).sort((a,b)=>a-b):
    skill==="fishing"?[5,10,15,20,25,30,40]:
    skill==="cooking"?[5,10,15,20,25,40]:
    [2,4,10,13,20,30];
  return fixed.find(x=>x>v&&x<=limit)??limit;
};
function bestEquipped(state){
  const available=earlyGear.filter(g=>state.gear.includes(g.name)
    &&Object.entries(g.requirements).every(([k,v])=>level(state,k)>=v));
  const bySlot=new Map();
  for(const item of available){
    const old=bySlot.get(item.slot);
    if(!old || 2*item.bonuses.attack+2*item.bonuses.strength+item.bonuses.defense>
      2*old.bonuses.attack+2*old.bonuses.strength+old.bonuses.defense)bySlot.set(item.slot,item);
  }
  const bonuses={attack:0,strength:0,defense:0};
  for(const item of bySlot.values())for(const k of Object.keys(bonuses))bonuses[k]+=item.bonuses[k]||0;
  return {names:[...bySlot.values()].map(g=>g.name),bonuses};
}
function foodChoices(state,options){
  const all=foods.filter(f=>f.cookingLevel<=state.cooking&&["shrimp","sardine","trout","salmon","lobster","swordfish","meat","chicken"].includes(f.id));
  return all.map(f=>({
    id:f.id,heal:f.heal,
    // sardines purchasable RAW, still need cooking and level 5.
    supplySeconds:f.id==="sardine"?options.boughtRawSardineSeconds+options.cookingActionSeconds:
      options.fishingFoodSeconds+options.cookingActionSeconds,
    supplyType:f.id==="sardine"?"buy raw sardines; cook":"gather/fish; cook (estimated)"
  }));
}
function combatStats(state,optionFood,options){
  const g=bestEquipped(state);
  return {...defaults,attack:state.attack,strength:state.strength,defense:state.defense,
    attackBonus:g.bonuses.attack,strengthBonus:g.bonuses.strength,defenseBonus:g.bonuses.defense,
    // Food acquired in separate farming time; eating is not charged in unattended mode.
    useFoodEconomy:!!optionFood,foodId:optionFood?.id??"shrimp",
    foodSupplySeconds:optionFood?.supplySeconds??0,
    foodCount:24,hitpoints:10,foodCooldownMode:"unattended",
    regenPerSecond:0,foodHeal:optionFood?.heal??0,
    searchSeconds:0,respawnDelaySeconds:options.respawnDelaySeconds??4.5,
    bankSeconds:options.bankSeconds??90,killsPerBank:options.killsPerBank??20,
    foodRecoveryBonus:0};
}
function evaluateMob(state,mob,opts,food){
  const stats=combatStats(state,food,opts);
  const base=evaluate(mob,stats);
  // Potion use is a *recurring* cost, never a permanent free strength bonus.
  // Estimate a dose from 32 expected Bear kills + verified 386s brewing.
  // No potion is considered until Herblaw 13 and Bear farming is viable.
  const root=gameConstraints.strengthPotion;
  let result=base, potion=null;
  if(state.herblaw>=root.level && mob.name!=="Bear"){
    const bear=mobs.find(x=>x.name==="Bear");
    const bearFight=evaluate(bear,stats);
    if(bearFight.safe && (!food || bearFight.foodNeeded<=opts.maxFoodPerKill)){
      const supplySeconds=32*bearFight.cycle+root.craftSeconds;
      const boosted=evaluate(mob,{...stats,strengthBonus:stats.strengthBonus+root.boost});
      const totalSeconds=boosted.cycle*(1+supplySeconds/root.durationSeconds);
      const boostedRate=3600/totalSeconds;
      if(boosted.safe && boostedRate>base.killsPerHour && (!food || boosted.foodNeeded<=opts.maxFoodPerKill)){
        result={...boosted,cycle:totalSeconds,killsPerHour:boostedRate,
          xpPerHour:boostedRate*boosted.xpPerKill};
        potion={name:"strength potion",strengthBonus:root.boost,
          supplySecondsPerDose:supplySeconds,durationSeconds:root.durationSeconds};
      }
    }
  }
  const sustainable=food?result.foodNeeded<=opts.maxFoodPerKill:result.expectedDamage<=0;
  return {...result,safe:result.safe&&sustainable,food:food?.id??"none",potion};
}
function viableFights(state,opts){
  const choices=[null,...foodChoices(state,opts)];
  const results=[];
  for(const name of opts.encounterAvailability){
    const mob=mobs.find(m=>m.name===name);
    if(!mob || name==="Imp" || name==="Turkey" || name.includes("Safe"))continue;
    for(const food of choices){
      const r=evaluateMob(state,mob,opts,food);
      if(r.safe&&Number.isFinite(r.cycle)&&r.cycle>0)
        results.push({...r,foodChoice:food});
    }
  }
  return results;
}
function bestFight(state,opts){
  return viableFights(state,opts).sort((a,b)=>b.xpPerHour-a.xpPerHour)[0]??null;
}
function knightAssessment(state,opts){
  const knight=mobs.find(m=>m.name==="Black knight");
  const foodsAvailable=foodChoices(state,opts);
  const candidates=foodsAvailable.map(food=>evaluateMob(state,knight,opts,food))
    .filter(x=>x.safe&&x.foodNeeded<=opts.maxFoodPerKill);
  candidates.sort((a,b)=>b.killsPerHour-a.killsPerHour);
  const best=candidates[0]??null;
  return {ready:!!best&&best.killsPerHour>=opts.minimumKnightKillsPerHour,
    best,gear:bestEquipped(state).names,
    warning:"Expected-value survival only; attack roll, enemy max hit, cooldown and food safety unverified."};
}
function trainingOptions(state,opts){
  const fights=viableFights(state,opts).sort((a,b)=>b.xpPerHour-a.xpPerHour);
  const best=fights[0];
  const actions=[];
  if(best)for(const skill of COMBAT){
    const immediate=nextMilestone(skill,state[skill],opts.maxLevel);
    if(immediate===null)continue;
    // Competing actions: one level now, or buy a whole damage breakpoint.
    // The breakpoint target is based on effective equipped Strength, not raw level.
    const strengthBonus=bestEquipped(state).bonuses.strength;
    const untilBreakpoint=6-((state.strength+strengthBonus)%6);
    const breakpoint=skill==="strength"
      ?Math.min(opts.maxLevel,state.strength+untilBreakpoint):null;
    const targets=[...new Set([immediate,breakpoint].filter(x=>x!==null && x>state[skill]))];
    for(const target of targets){
      const amount=xp[target-1]-xp[state[skill]-1];
      const kills=Math.ceil(amount/best.xpPerKill);
      actions.push({skill,to:target,seconds:kills*best.cycle,
        detail:`Train ${skill} ${state[skill]}→${target} on ${best.mob.name} (${kills} kills, ${best.food} food${best.potion?", strength potion":""})`,
        meta:{monster:best.mob.name,kills,food:best.food,potion:best.potion?.name??null,xp:amount,maxHit:best.maxHit,xpPerHour:best.xpPerHour,
          milestone:target===breakpoint && target!==immediate?"strength-breakpoint":"level"}}); 
    }
  }
  for(const skill of ["fishing","cooking","herblaw"]){
    const target=nextMilestone(skill,state[skill],opts.maxLevel);
    if(target===null)continue;
    const amount=xp[target-1]-xp[state[skill]-1];
    let rate,notes;
    if(skill==="fishing"){rate=opts.fishingXpPerAction/opts.fishingActionSeconds;notes="fish (activity timings configurable)";}
    else if(skill==="cooking"){rate=opts.cookingXpPerAction/
      (opts.cookingActionSeconds+opts.boughtRawSardineSeconds);notes="cook purchased raw sardines (level 5+), other ingredients estimated";}
    else {rate=opts.herblawXpPerAction/
      (opts.herblawActionSeconds+opts.herbIngredientSeconds+opts.boughtVialSeconds);notes="brew early potions (ingredient cost estimated)";}
    if(!(rate>0))continue;
    actions.push({skill,to:target,seconds:amount/rate,
      detail:`Train ${skill} ${state[skill]}→${target}: ${notes}`,
      meta:{xp:amount,assumedXpPerHour:rate*3600}});
  }
  return actions;
}
function gearActions(state,opts){
  if(!opts.equipmentAcquisitionEnabled)return [];
  const result=[];
  for(const gear of earlyGear){
    if(state.gear.includes(gear.name)||!Object.entries(gear.requirements).every(([k,v])=>level(state,k)>=v))continue;
    // Purchase/source unavailable? Do NOT grant the item for free.
    const sources=Object.entries(lootTables).filter(([name,table])=>
      !name.includes("Safe")&&opts.encounterAvailability.includes(name)&&
      table.drops.some(d=>d.item.toLowerCase()===gear.name));
    for(const [name] of sources){
      const monster=mobs.find(m=>m.name===name);
      if(!monster)continue;
      const choices=viableFights(state,opts).filter(x=>x.mob.name===name).sort((a,b)=>a.cycle-b.cycle);
      if(!choices.length)continue;
      const kills=expectedKillsForDrop(name,gear.name);
      const seconds=kills*choices[0].cycle;
      result.push({gear:gear.name,seconds,
        detail:`Farm ${gear.name} from ${name} (~${Math.ceil(kills)} expected kills)`,
        meta:{monster:name,expectedKills:kills,food:choices[0].food}});
    }
  }
  return result;
}
class Heap{
  constructor(){this.a=[];}
  push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p].cost<=v.cost)break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}
  pop(){const a=this.a;if(!a.length)return null;const root=a[0],last=a.pop();if(!a.length)return root;let i=0;while(2*i+1<a.length){let c=2*i+1;if(c+1<a.length&&a[c+1].cost<a[c].cost)c++;if(a[c].cost>=last.cost)break;a[i]=a[c];i=c;}a[i]=last;return root;}
  get size(){return this.a.length;}
}
export function* solveGoldenPathProgress(userOptions={}){
  const opts={...defaultOptions,...userOptions};
  for(const v of ["maxStates","maxLevel","minimumKnightKillsPerHour","maxFoodPerKill"])
    if(!Number.isFinite(opts[v])||opts[v]<=0)throw new RangeError(`Invalid ${v}`);
  const initial={attack:1,strength:1,defense:1,fishing:1,cooking:1,herblaw:1,gear:[]};
  const heap=new Heap(),dist=new Map(),nodes=new Map();
  const startKey=toKey(initial);
  heap.push({key:startKey,cost:0});dist.set(startKey,0);
  nodes.set(startKey,{state:initial,parent:null,action:null});
  let expanded=0,best=null,closest=null;
  while(heap.size&&expanded<opts.maxStates){
    const node=heap.pop();if(node.cost!==dist.get(node.key))continue;
    const current=nodes.get(node.key),state=current.state;expanded++;
    const status=knightAssessment(state,opts);
    if(expanded===1 || expanded%25===0)yield {type:"progress",phase:"search",
      expanded,queued:heap.size,visited:dist.size,limit:opts.maxStates,
      bestKnightRate:closest?.status.best?.killsPerHour??0,
      currentLevels:{attack:state.attack,strength:state.strength,defense:state.defense,
        fishing:state.fishing,cooking:state.cooking,herblaw:state.herblaw},
      elapsedRouteSeconds:node.cost};
    if(status.ready){best={key:node.key,state,status,cost:node.cost};break;}
    if(!closest || (status.best?.killsPerHour??0)>(closest.status.best?.killsPerHour??0))
      closest={key:node.key,state,status,cost:node.cost};
    if(node.cost>opts.maxSeconds)continue;
    const actions=[...trainingOptions(state,opts),...gearActions(state,opts)];
    for(const action of actions){
      if(!Number.isFinite(action.seconds)||action.seconds<=0)continue;
      const next={...state,gear:state.gear};
      if(action.skill)next[action.skill]=action.to;
      if(action.gear)next.gear=[...state.gear,action.gear].sort();
      const key=toKey(next),cost=node.cost+action.seconds;
      if(cost>opts.maxSeconds || cost>=(dist.get(key)??Infinity))continue;
      dist.set(key,cost);nodes.set(key,{state:next,parent:node.key,action});heap.push({key,cost});
    }
  }
  yield {type:"progress",phase:"route",expanded,visited:dist.size,limit:opts.maxStates};
  const found=best??closest;
  const steps=[];
  if(found){
    let key=found.key;
    while(nodes.get(key)?.parent){
      const node=nodes.get(key);
      steps.push({...node.action,stateAfter:node.state});
      key=node.parent;
    }
    steps.reverse();
  }
  return {
    success:!!best,partial:!best,search:"bounded-uniform-cost",expanded,visited:dist.size,
    limitReached:expanded>=opts.maxStates,
    assumptions:{foodSupply:"estimated",combatAccuracy:"partly calibrated",enemyDamage:"provisional",
      groupCombat:"excluded pending damage attribution",energy:"nonbinding",gear:"drop-sourced only"},
    start:initial,final:found?.state??initial,
    totalSeconds:found?.cost??0,steps,knight:found?.status??knightAssessment(initial,opts),
    reason:best?"Found minimum time within available transitions and search budget":
      "No qualifying Black Knight state found within budget. Partial path only; do not call it a golden path."
  };
}

// Synchronous API retained for tests and other non-UI consumers.
export function solveGoldenPath(options={}){
  const search=solveGoldenPathProgress(options);
  let item=search.next();
  while(!item.done)item=search.next();
  return item.value;
}
