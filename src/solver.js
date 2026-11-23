import { mobs, xp } from "./data.js";
export function levelAt(totalXp) {
  if (!Number.isFinite(totalXp) || totalXp < 0) throw new RangeError("XP must be nonnegative");
  let low=0,high=xp.length-1;
  while(low<high){const mid=Math.ceil((low+high)/2);if(xp[mid]<=totalXp)low=mid;else high=mid-1;}
  return low+1;
}
export function xpRemaining(currentXp, targetLevel) {
  const target=Math.max(1,Math.min(99,Math.floor(targetLevel)));
  return Math.max(0,xp[target-1]-currentXp);
}
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function chance(offense,defense) {
  // Placeholder approximation; game's exact roll math not confirmed.
  const a=Math.max(1,offense),d=Math.max(1,defense);
  return clamp(a/(a+d),0.05,0.95);
}
export function evaluate(mob,stats,rules={}) {
  const attack=stats.attack+stats.attackBonus;
  const strength=stats.strength+stats.strengthBonus;
  const defense=stats.defense+stats.defenseBonus;
  const cooldown=Math.max(0.5,stats.cooldown);
  const maxHit=Math.max(1,Math.floor(1+strength/10+stats.damageBonus));
  const pHit=chance(attack,mob.defense);
  const dps=pHit*(maxHit+1)/2/cooldown;
  const ttk=mob.hp/Math.max(0.001,dps);
  const enemyMax=Math.max(1,Math.floor(1+mob.strength/10));
  const enemyHit=chance(mob.attack,defense);
  const enemyDps=enemyHit*(enemyMax+1)/2/Math.max(0.5,stats.enemyCooldown);
  const expectedDamage=ttk*enemyDps;
  const foodHeal=Math.max(0,stats.foodHeal);
  const foodNeeded=Math.max(0,expectedDamage-stats.regenPerSecond*ttk)/(foodHeal||Infinity);
  const safe=(stats.hitpoints-expectedDamage)>0 || (foodHeal>0 && stats.foodCount>=Math.ceil(foodNeeded));
  const cycle=ttk+Math.max(0,stats.searchSeconds)+Math.max(0,stats.bankSeconds)/Math.max(1,stats.killsPerBank)
    +Math.max(0,stats.foodRestockSeconds)*foodNeeded;
  const xpPerKill=mob.hp*stats.xpPerDamage; // explicitly adjustable assumption, not confirmed game mechanic
  return {mob,ttk,enemyDps,expectedDamage,foodNeeded,safe,maxHit,pHit,xpPerKill,xpPerHour:xpPerKill*3600/cycle,killsPerHour:3600/cycle,cycle};
}
export function rankTargets(stats) {
  return mobs.map(m=>evaluate(m,stats))
    .filter(r=>r.safe && (r.mob.name!=="Black knight" || stats.allowBlackKnight))
    .sort((a,b)=>b.xpPerHour-a.xpPerHour);
}
export function goldenPath(stats,goal={attack:40,strength:40,defense:40}) {
  // Greedy deterministic route: re-evaluate at each level threshold. Not a global optimum.
  const state={...stats}; const steps=[];
  const targets=["attack","strength","defense"];
  let iterations=0;
  while(targets.some(s=>state[s]<goal[s]) && iterations++<280){
    const best=rankTargets(state)[0]; if(!best)break;
    const skill=targets.filter(s=>state[s]<goal[s]).sort((a,b)=>state[a]-state[b])[0];
    const needed=xp[state[skill]]-xp[state[skill]-1];
    if(!Number.isFinite(needed))break;
    const kills=Math.max(1,Math.ceil(needed/Math.max(0.001,best.xpPerKill)));
    const seconds=kills*best.cycle;
    const previous=steps.at(-1);
    if(previous&&previous.mob===best.mob.name&&previous.skill===skill){
      previous.kills+=kills;previous.seconds+=seconds;previous.to=state[skill]+1;
    }else steps.push({mob:best.mob.name,skill,from:state[skill],to:state[skill]+1,kills,seconds});
    state[skill]++;
  }
  const knight=evaluate(mobs.find(m=>m.name==="Black knight"),{...state,allowBlackKnight:true});
  return {steps,state,knight,reachable:targets.every(s=>state[s]>=goal[s]),totalSeconds:steps.reduce((n,s)=>n+s.seconds,0),method:"greedy-estimate"};
}
export const defaults={attack:1,strength:1,defense:1,hitpoints:10,attackBonus:0,strengthBonus:0,defenseBonus:0,damageBonus:0,cooldown:6,enemyCooldown:6,foodHeal:0,foodCount:0,regenPerSecond:0,searchSeconds:5,bankSeconds:90,killsPerBank:20,foodRestockSeconds:8,xpPerDamage:4,allowBlackKnight:false};
