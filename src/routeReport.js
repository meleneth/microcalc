// Compact the displayed itinerary without changing the search graph or costs.
export function buildRouteJobs(steps,initial,equipmentForState){
  const jobs=[];
  let priorState=initial;
  let priorEquipment=equipmentForState(initial).names;
  for(const step of steps){
    const equipped=equipmentForState(step.stateAfter).names;
    const added=equipped.filter(item=>!priorEquipment.includes(item));
    const removed=priorEquipment.filter(item=>!equipped.includes(item));
    const food=step.meta?.expectedFood??0;
    const potions=step.meta?.expectedPotions??0;
    if(step.skill){
      const from=priorState[step.skill],to=step.stateAfter[step.skill];
      const last=jobs.at(-1);
      if(last?.kind==="train"&&last.skill===step.skill&&last.to===from){
        last.to=to;
        last.seconds+=step.seconds;
        last.kills+=step.meta?.kills??0;
        last.expectedFood+=food;
        last.expectedPotions+=potions;
        last.segments.push(...(step.meta?.segments??[]));
        last.steps.push(step);
        last.cumulativeSeconds=step.cumulativeSeconds;
        last.cumulativeExpectedFood=step.cumulativeExpectedFood;
      }else{
        jobs.push({kind:"train",skill:step.skill,from,to,seconds:step.seconds,
          kills:step.meta?.kills??0,expectedFood:food,expectedPotions:potions,
          segments:[...(step.meta?.segments??[])],steps:[step],
          cumulativeSeconds:step.cumulativeSeconds,
          cumulativeExpectedFood:step.cumulativeExpectedFood});
      }
    }else{
      jobs.push({kind:"action",detail:step.detail,seconds:step.seconds,
        expectedFood:food,expectedPotions:potions,steps:[step],
        cumulativeSeconds:step.cumulativeSeconds,
        cumulativeExpectedFood:step.cumulativeExpectedFood});
    }
    // Equipment changes are free actions only *after* the gear is owned and
    // its skill requirements are met. They are not free equipment acquisition.
    if(added.length||removed.length){
      jobs.push({kind:"equipment",seconds:0,expectedFood:0,expectedPotions:0,
        detail:"Equip "+(added.join(", ")||"new loadout")+
          (removed.length?" (unequip "+removed.join(", ")+")":""),
        equipped,cumulativeSeconds:step.cumulativeSeconds,
        cumulativeExpectedFood:step.cumulativeExpectedFood});
    }
    priorState=step.stateAfter;
    priorEquipment=equipped;
  }
  return jobs.map(job=>({
    ...job,
    detail:job.kind==="train"?
      "Train "+job.skill+" "+job.from+"→"+job.to+
      (job.segments.length?" on "+[...new Set(job.segments.map(s=>s.monster))].join(" → "):"")+
      (job.kills?" ("+Math.round(job.kills)+" kills)":""):job.detail
  }));
}
