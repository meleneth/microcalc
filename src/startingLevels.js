// Shared defaults for UI and solver; levels represent their minimum XP threshold.
export const defaultStartingLevels=Object.freeze({
  attack:20,strength:20,defense:10,fishing:20,cooking:15,herblaw:5
});
export function startingLevels(overrides={}){
  if(!overrides||typeof overrides!=="object"||Array.isArray(overrides))
    throw new RangeError("Invalid starting levels");
  const result={...defaultStartingLevels};
  for(const key of Object.keys(overrides)){
    if(!Object.hasOwn(result,key))throw new RangeError("Unknown starting skill: "+key);
    const value=overrides[key];
    if(!Number.isInteger(value)||value<1||value>99)
      throw new RangeError("Starting "+key+" must be an integer from 1 to 99");
    result[key]=value;
  }
  return result;
}
