import { lootTables, expectedKillsForDrop } from "./lootTables.js";
import { earlyGear } from "./earlyGear.js";
import { mobs, xp } from "./data.js";
import { evaluate, meleeMaxHit, defaults } from "./solver.js";

const integer=(n,min=0)=>Number.isFinite(n)?Math.max(min,Math.floor(n)):min;
export const gameConstraints={
  purchasable:["vial","raw sardine"],
  groups:{"Turkey":8,"Imp":2},
  turkeyRequirements:[{item:"fox hat",quantity:1}],
  trades:[{item:"fox hat",input:"lucky paw",quantity:1,source:"Mouse"}],
  strengthPotion:{level:13,skill:"herblaw",requiredDrop:"limpwurt root",source:"Bear",recipeVerified:true,ingredients:[{item:"vial of water",quantity:1},{item:"limpwurt root",quantity:1}],xp:735,craftSeconds:386,boost:5,durationSeconds:3600}
};
export function equipable(item,levels){
  return Object.entries(item.requirements).every(([skill,level])=>(levels[skill]||1)>=level);
}
export function bestGear(levels,ownedNames=earlyGear.map(g=>g.name)) {
  const equipped={};
  const eligible=earlyGear.filter(g=>ownedNames.includes(g.name)&&equipable(g,levels));
  // Search all combinations per slot (tiny early-game equipment catalog).
  const slots=[...new Set(eligible.map(g=>g.slot))];
  const choices=slots.map(slot=>[null,...eligible.filter(g=>g.slot===slot)]);
  let frontier=[{gear:[],bonuses:{attack:0,strength:0,defense:0}}];
  for(const options of choices){
    const next=[];
    for(const entry of frontier)for(const piece of options){
      const b={...entry.bonuses};
      if(piece)for(const k of ["attack","strength","defense"])b[k]+=piece.bonuses[k]||0;
      next.push({gear:piece?[...entry.gear,piece.name]:entry.gear,bonuses:b});
    }
    frontier=next;
  }
  return frontier;
}
export function candidateLoadouts(levels,stats=defaults,ownedNames=earlyGear.map(g=>g.name),mobName="Black knight") {
  const monster=mobs.find(m=>m.name.toLowerCase()===mobName.toLowerCase());
  if(!monster)throw new RangeError("Unknown monster");
  return bestGear(levels,ownedNames).map(loadout=>{
    const combat={...stats,...levels,attackBonus:loadout.bonuses.attack,strengthBonus:loadout.bonuses.strength,defenseBonus:loadout.bonuses.defense};
    const outcome=evaluate(monster,combat);
    return {...loadout,outcome,maxHit:meleeMaxHit(combat.strength+combat.strengthBonus,stats.damageBonus||0)};
  }).sort((a,b)=>b.outcome.killsPerHour-a.outcome.killsPerHour);
}
export function dropAcquisition(monster,item,quantity=1,stats=defaults,groupSize=1) {
  const expectedKills=expectedKillsForDrop(monster,item,quantity);
  if(!Number.isFinite(expectedKills))return {monster,item,quantity,reachable:false,reason:"No documented drop"};
  const mob=mobs.find(m=>m.name.toLowerCase()===monster.toLowerCase());
  // If combat stats unavailable, retain expected kills but do not invent elapsed time.
  const outcome=mob?evaluate(mob,stats):null;
  return {monster,item,quantity,reachable:true,expectedKills,
    estimatedSeconds:outcome?expectedKills*outcome.cycle:null,
    groupSize,groupAccounting:"Not calibrated: group HP, rewards, and loot ownership are unknown"};
}
export function foxHatDependency(stats=defaults) {
  const trade=gameConstraints.trades[0];
  return {item:"fox hat",prerequisites:[dropAcquisition(trade.source,trade.input,1,stats)],
    trade:{consume:"lucky paw",quantity:1}};
}
export function strengthPotionDependency(quantity=1,stats=defaults){
  const recipe=gameConstraints.strengthPotion;
  const n=integer(quantity,1);
  return {item:"strength potion",quantity:n,recipeVerified:true,
    requirements:{herblaw:recipe.level},
    ingredients:recipe.ingredients.map(i=>({...i,quantity:i.quantity*n})),
    xp:n*recipe.xp,craftSeconds:n*recipe.craftSeconds,
    boost:recipe.boost,durationSeconds:recipe.durationSeconds,
    knownBottleneck:dropAcquisition("Bear","limpwurt root",n,stats),
    note:"Vial of water can be made from purchased vials; bear root drops are probabilistic. Travel, encounter availability and downtime not yet included."};
}
export function strengthPotionValue(effectiveStrength,quantity=1,stats=defaults){
  const before=meleeMaxHit(effectiveStrength),after=meleeMaxHit(effectiveStrength+5);
  const supply=strengthPotionDependency(quantity,stats);
  return {before,after,maxHitGain:after-before,effectiveStrength,
    boostedStrength:effectiveStrength+5,secondsPerDose:supply.durationSeconds,
    expectedBearKills:supply.knownBottleneck.expectedKills,
    estimatedSupplySeconds:supply.knownBottleneck.estimatedSeconds===null
      ?null:supply.knownBottleneck.estimatedSeconds+supply.craftSeconds,
    damageBreakpointGained:after>before,
    caution:"Expected damage is provisional until the on-hit distribution and accuracy equation are verified."};
}
export function groupEncounter(name){
  const size=gameConstraints.groups[name];
  return size?{name,groupSize:size,requiredAllies:size-1,requiredItems:name==="Turkey"?["fox hat"]:[],
    warning:"Do not divide enemy HP or loot time by group size until shared-damage and reward mechanics are verified."}:null;
}
