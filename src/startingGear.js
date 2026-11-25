import { earlyGear } from "./earlyGear.js";
export const defaultStartingGear=Object.freeze(["steel scimitar","fox hat","gardener's gloves"]);
export const startingGearChoices=Object.freeze([...new Set([...defaultStartingGear,...earlyGear.map(g=>g.name)])].sort());
export function startingGear(items=defaultStartingGear){
  if(!Array.isArray(items)||items.some(item=>!startingGearChoices.includes(item)))
    throw new RangeError("Unknown starting equipment");
  return [...new Set(items)].sort();
}
