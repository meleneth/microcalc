import { xp, mobs } from "./data.js";
import { earlyGear } from "./earlyGear.js";
import { lootTables, expectedKillsForDrop } from "./lootTables.js";
import { foods } from "./foods.js";
import { evaluate, defaults, meleeMaxHit } from "./solver.js";
import { gameConstraints } from "./progression.js";

// Search actions are *milestones* rather than individual XP ticks.
// This is an anytime goal-directed best-first search over priced transitions.
// Dominance is exact only under the model's monotone skill assumptions. The
// heuristic is intentionally non-admissible, so no global-optimum claim.
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
// Provisional fishing gates: explicit assumptions, not wiki-verified unlocks.
// Purchased raw sardines do not require Fishing levels.
const fishingGates={shrimp:1,trout:15,salmon:25,lobster:40,swordfish:45};
function foodChoices(state,options){
  const all=foods.filter(f=>f.cookingLevel<=state.cooking&&
    ["shrimp","sardine","trout","salmon","lobster","swordfish","meat","chicken"].includes(f.id)&&
    state.fishing>=(fishingGates[f.id]??1));
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
          xpPerHour:boostedRate*boosted.xpPerKill,
          timeBreakdown:{...boosted.timeBreakdown,
            supplies:boosted.timeBreakdown.supplies+(totalSeconds-boosted.cycle),
            total:totalSeconds}};
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
// Re-evaluate combat at EVERY level and allow the target monster, food and
// potion to change as stats improve. Never price a six-level Strength action
// using only the initial level's speed.
function priceTraining(state,skill,target,opts){
  const segments=[];let seconds=0,kills=0,totalXp=0;
  const timeBreakdown={combat:0,respawn:0,search:0,banking:0,supplies:0};
  for(let current=state[skill];current<target;current++){
    const intermediate={...state,[skill]:current};
    const fight=bestFight(intermediate,opts);
    if(!fight||!(fight.xpPerKill>0))return null;
    const amount=xp[current]-xp[current-1];
    const n=Math.ceil(amount/fight.xpPerKill);
    const duration=n*fight.cycle;
    if(!Number.isFinite(duration)||duration<=0)return null;
    seconds+=duration;kills+=n;totalXp+=amount;
    for(const key of Object.keys(timeBreakdown))
      timeBreakdown[key]+=n*(fight.timeBreakdown?.[key]??0);
    const previous=segments.at(-1);
    if(previous&&previous.monster===fight.mob.name&&previous.food===fight.food&&
      previous.potion===(fight.potion?.name??null)){
      previous.to=current+1;previous.kills+=n;previous.seconds+=duration;
    }else segments.push({from:current,to:current+1,monster:fight.mob.name,
      food:fight.food,potion:fight.potion?.name??null,kills:n,seconds:duration});
  }
  return {seconds,kills,totalXp,segments,timeBreakdown};
}
function trainingOptions(state,opts){
  const actions=[];
  for(const skill of COMBAT){
    const immediate=nextMilestone(skill,state[skill],opts.maxLevel);
    if(immediate===null)continue;
    const bonus=bestEquipped(state).bonuses.strength;
    const untilBreakpoint=6-((state.strength+bonus)%6);
    const breakpoint=skill==="strength"?
      Math.min(opts.maxLevel,state.strength+untilBreakpoint):null;
    const targets=[...new Set([immediate,breakpoint].filter(
      x=>x!==null&&x>state[skill]))];
    for(const target of targets){
      const priced=priceTraining(state,skill,target,opts);
      if(!priced)continue;
      const monsters=[...new Set(priced.segments.map(x=>x.monster))].join(" → ");
      actions.push({skill,to:target,seconds:priced.seconds,
        detail:`Train ${skill} ${state[skill]}→${target} on ${monsters} (${priced.kills} kills)`,
        meta:{kills:priced.kills,xp:priced.totalXp,
          milestone:skill==="strength"&&target===breakpoint&&target!==immediate?
            "strength-breakpoint":"level",
          segments:priced.segments,timeBreakdown:priced.timeBreakdown}});
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
// Weighted best-first exploration: find a feasible route first, then improve
// the incumbent. The estimate ranks work; it is NOT an admissible A* bound.
class Heap {
  constructor(){this.a=[];}
  push(v){
    const a=this.a; let i=a.length;a.push(v);
    while(i){const p=(i-1)>>1;if(a[p].priority<=v.priority)break;a[i]=a[p];i=p;}a[i]=v;
  }
  pop(){
    const a=this.a;if(!a.length)return null;
    const top=a[0],last=a.pop();if(!a.length)return top;
    let i=0;while(2*i+1<a.length){
      let c=2*i+1;
      if(c+1<a.length&&a[c+1].priority<a[c].priority)c++;
      if(a[c].priority>=last.priority)break;
      a[i]=a[c];i=c;
    }
    a[i]=last;return top;
  }
  get size(){return this.a.length;}
}
const routeGuide={attack:30,strength:30,defense:20,cooking:15};
const remainingXp=(state,k,target)=>Math.max(0,xp[Math.min(99,target)-1]-xp[state[k]-1]);
function readiness(state,opts){
  const bonuses=bestEquipped(state).bonuses;
  // A potential-function guide, not a declaration of actual knight viability.
  const combat=(state.attack+bonuses.attack)/30+
    (state.strength+bonuses.strength)/30+state.defense/20;
  const supply=Math.min(1,state.cooking/15);
  return combat+supply;
}
function estimateRemaining(state,opts,fight){
  // Project faster future training rather than pricing ALL future XP at level-1 DPS.
  // This is deliberately non-admissible and is only used for queue ordering.
  const rate=Math.max(200,(fight?.xpPerHour??200)*2.5);
  let seconds=0;
  for(const k of COMBAT)seconds+=remainingXp(state,k,routeGuide[k])*3600/rate;
  if(state.cooking<routeGuide.cooking){
    const cookingRate=opts.cookingXpPerAction/
      (opts.cookingActionSeconds+opts.boughtRawSardineSeconds);
    seconds+=remainingXp(state,"cooking",routeGuide.cooking)/Math.max(.01,cookingRate);
  }
  // The guide does not require Fishing or Herblaw. They must win on the
  // actual economic effect of their unlocks, rather than being mandatory.
  return seconds;
}
const dominates=(a,b)=>a.cost<=b.cost+1e-9&&
  COMBAT.every(k=>a.state[k]>=b.state[k]);
function bucketFor(s){return [s.fishing,s.cooking,s.herblaw,s.gear.join(",")].join("|");}
function reconstruct(entry,nodes){
  const steps=[];let key=entry?.key;
  while(key&&nodes.get(key)?.parent){
    const n=nodes.get(key);
    steps.push({...n.action,stateAfter:n.state});
    key=n.parent;
  }
  steps.reverse();let elapsed=0;
  return steps.map(step=>({...step,cumulativeSeconds:elapsed+=step.seconds}));
}
export function* solveGoldenPathProgress(userOptions={}){
  const opts={...defaultOptions,...userOptions};
  for(const v of ["maxStates","maxLevel","minimumKnightKillsPerHour","maxFoodPerKill"])
    if(!Number.isFinite(opts[v])||opts[v]<=0)throw new RangeError(`Invalid ${v}`);
  const initial={attack:1,strength:1,defense:1,fishing:1,cooking:1,herblaw:1,gear:[]};
  const heap=new Heap(),dist=new Map(),nodes=new Map(),buckets=new Map();
  const startKey=toKey(initial);
  const begin={key:startKey,state:initial,cost:0};
  dist.set(startKey,0);
  nodes.set(startKey,{state:initial,parent:null,action:null});
  buckets.set(bucketFor(initial),[begin]);
  const firstFight=bestFight(initial,opts);
  heap.push({...begin,priority:estimateRemaining(initial,opts,firstFight)});
  let expanded=0,discovered=1,pruned=0,incumbent=null,closest=null;
  let bestRate=0,stage="feasibility";
  const fightCache=new Map();
  const cachedFight=state=>{
    const key=toKey(state);
    if(!fightCache.has(key))fightCache.set(key,bestFight(state,opts));
    return fightCache.get(key);
  };
  const snapshot=()=>({
    type:"progress",phase:stage,expanded,visited:discovered,queued:heap.size,
    pruned,limit:opts.maxStates,bestKnightRate:bestRate,
    incumbentSeconds:incumbent?.cost??null,
    incumbentSteps:incumbent?reconstruct(incumbent,nodes):[],
    nextAction:incumbent?reconstruct(incumbent,nodes)[0]?.detail??null:
      closest?reconstruct(closest,nodes)[0]?.detail??null:null,
    currentLevels:closest?.state??initial
  });
  while(heap.size&&expanded<opts.maxStates){
    const node=heap.pop();
    if(dist.get(node.key)!==node.cost)continue;
    if(incumbent&&node.cost>=incumbent.cost){pruned++;continue;}
    const current=nodes.get(node.key),state=current.state;
    expanded++;
    const status=knightAssessment(state,opts);
    const rate=status.best?.killsPerHour??0;
    bestRate=Math.max(bestRate,rate);
    const grade=readiness(state,opts)+Math.min(2,rate/opts.minimumKnightKillsPerHour);
    if(!closest||grade>closest.grade+1e-8||
      (Math.abs(grade-closest.grade)<1e-8&&node.cost<closest.cost))
      closest={...node,state,status,grade};
    if(status.ready){
      if(!incumbent||node.cost<incumbent.cost){
        incumbent={...node,state,status};
        stage="optimization";
        yield snapshot();
      }
      continue;
    }
    if(expanded===1||expanded%25===0)yield snapshot();
    if(node.cost>=opts.maxSeconds)continue;
    const actions=[...trainingOptions(state,opts),...gearActions(state,opts)];
    for(const action of actions){
      if(!Number.isFinite(action.seconds)||action.seconds<=0)continue;
      const next={...state,gear:state.gear};
      if(action.skill)next[action.skill]=action.to;
      if(action.gear)next.gear=[...state.gear,action.gear].sort();
      const key=toKey(next),cost=node.cost+action.seconds;
      if(cost>opts.maxSeconds||(incumbent&&cost>=incumbent.cost)||
        cost>=(dist.get(key)??Infinity))continue;
      const bucket=bucketFor(next),frontier=buckets.get(bucket)??[];
      const candidate={key,state:next,cost};
      if(frontier.some(f=>dominates(f,candidate))){pruned++;continue;}
      // Keep reconstruction history, but remove dominated states from the live queue.
      const survivors=[];
      for(const old of frontier){
        if(dominates(candidate,old)){
          if(dist.get(old.key)===old.cost)dist.delete(old.key);
          pruned++;
        }else survivors.push(old);
      }
      survivors.push(candidate);buckets.set(bucket,survivors);
      if(!nodes.has(key))discovered++;
      dist.set(key,cost);
      nodes.set(key,{state:next,parent:node.key,action});
      const projected=estimateRemaining(next,opts,cachedFight(next));
      heap.push({...candidate,priority:cost+1.4*projected});
    }
  }
  stage="route";yield snapshot();
  const found=incumbent??closest;
  const steps=reconstruct(found,nodes);
  const exhausted=heap.size===0;
  return {
    success:!!incumbent,partial:!incumbent,search:"anytime-dominance-best-first",
    termination:incumbent?(exhausted?"search-complete":"budget-exhausted"):
      exhausted?"frontier-exhausted":"budget-exhausted",
    expanded,visited:discovered,pruned,limitReached:expanded>=opts.maxStates,
    assumptions:{foodSupply:"estimated",combatAccuracy:"partly calibrated",
      enemyDamage:"provisional",groupCombat:"excluded pending damage attribution",
      energy:"nonbinding",gear:"drop-sourced only"},
    start:initial,final:found?.state??initial,
    totalSeconds:found?.cost??0,steps,
    knight:found?.status??knightAssessment(initial,opts),
    reason:incumbent?"Feasible modeled route found; shortest route not proven.":
      exhausted?"Search frontier exhausted under the current action model; no feasible route found.":
      "Search budget exhausted without a feasible route. Showing most progressed state, not claiming impossibility."
  };
}

// Synchronous API retained for tests and other non-UI consumers.
export function solveGoldenPath(options={}){
  const search=solveGoldenPathProgress(options);
  let item=search.next();
  while(!item.done)item=search.next();
  return item.value;
}
