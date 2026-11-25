import { lootTables } from "./lootTables.js";

// Loot bag is separate from carried food. Independent wiki rolls are capped
// at capacity: a full bag triggers a banking trip after the current kill.
const distributions=new Map();
function distribution(monster,capacity){
  const key=monster+"|"+capacity;
  if(distributions.has(key))return distributions.get(key);
  const table=lootTables[monster];
  if(table?.status!=="documented")return null;
  let p=new Float64Array(capacity+1);p[0]=1;
  for(const drop of table.drops){
    const next=new Float64Array(capacity+1);
    for(let i=0;i<=capacity;i++){
      next[i]+=p[i]*(1-drop.chance);
      next[Math.min(capacity,i+drop.quantity)]+=p[i]*drop.chance;
    }
    p=next;
  }
  distributions.set(key,p);return p;
}
export function bagEconomy(monster,{capacity=25,foodPerKill=0,scrapChance=0,fallbackKills=20}={}){
  if(!Number.isInteger(capacity)||capacity<1||capacity>1000||
    !Number.isFinite(scrapChance)||scrapChance<0||scrapChance>1||
    !Number.isFinite(foodPerKill)||foodPerKill<0||
    !Number.isFinite(fallbackKills)||fallbackKills<=0)throw new RangeError("Invalid bag settings");
  const table=lootTables[monster],base=distribution(monster,capacity);
  const expectedScraps=foodPerKill*scrapChance;
  if(!base)return {capacity,expectedLoot:null,expectedScraps,killsPerBank:Math.min(fallbackKills,expectedScraps>0?capacity/expectedScraps:Infinity),source:"unknown-loot-fallback"};
  // Approximate fractional expected meals by floor/ceil mixture; each meal
  // independently produces one scrap with the configured probability.
  let p=base;
  const whole=Math.floor(foodPerKill),fraction=foodPerKill-whole;
  const addScrap=(dist,chance)=>{
    const next=new Float64Array(capacity+1);
    for(let i=0;i<=capacity;i++){next[i]+=dist[i]*(1-chance);next[Math.min(capacity,i+1)]+=dist[i]*chance;}
    return next;
  };
  if(scrapChance>0){
    for(let i=0;i<Math.min(whole,capacity);i++)p=addScrap(p,scrapChance);
    if(whole>capacity){ // preserve binomial tail for extreme food consumption
      for(let i=capacity;i<whole;i++){p=addScrap(p,scrapChance);if(p[capacity]>=1-1e-15)break;}
    }
    if(fraction>0)p=addScrap(p,fraction*scrapChance);
  }
  const positive=p.slice(1).reduce((a,b)=>a+b,0);
  const e=new Float64Array(capacity+1);
  if(positive>0){
    for(let remaining=1;remaining<=capacity;remaining++){
      let continuation=0;
      for(let j=1;j<remaining;j++)continuation+=p[j]*e[remaining-j];
      e[remaining]=(1+continuation)/positive;
    }
  }
  return {capacity,expectedLoot:table.drops.reduce((n,d)=>n+d.expectedUnitsPerKill,0),
    expectedScraps,killsPerBank:positive>0?e[capacity]:Infinity,source:"documented-independent-rolls"};
}
