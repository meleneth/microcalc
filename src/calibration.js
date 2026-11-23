// Empirical combat formula calibration.
// This module never claims that any candidate formula is authoritative.
// Import real fight observations and compare candidate accuracy models using
// binomial log-likelihood, then require held-out validation before adoption.
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
export const accuracyCandidates={
  ratio: ({attack,defense})=>clamp(attack/(attack+defense),0.05,0.95),
  linear: ({attack,defense})=>clamp(0.5+0.005*(attack-defense),0.05,0.95),
  rollComparison: ({attack,defense})=>{
    // P(U[0, A] > U[0, D]), continuous approximation
    const a=Math.max(1,attack),d=Math.max(1,defense);
    return a<=d?a/(2*d):1-d/(2*a);
  }
};
export function validateObservation(o){
  if(!o || !Number.isInteger(o.attack) || !Number.isInteger(o.defense)
    || o.attack<0 || o.defense<0 || !Number.isInteger(o.hits)
    || !Number.isInteger(o.misses) || o.hits<0 || o.misses<0
    || o.hits+o.misses<1)throw new RangeError("Expected nonnegative integer attack, defense, hits and misses, with at least one trial");
  return o;
}
export function logLikelihood(observations,predict){
  return observations.reduce((sum,item)=>{
    const o=validateObservation(item),p=clamp(predict(o),1e-12,1-1e-12);
    return sum+o.hits*Math.log(p)+o.misses*Math.log(1-p);
  },0);
}
export function compareAccuracyModels(observations){
  if(!Array.isArray(observations) || observations.length===0)throw new RangeError("Observations required");
  return Object.entries(accuracyCandidates).map(([name,predict])=>({
    name,logLikelihood:logLikelihood(observations,predict),
    predictions:observations.map(o=>({attack:o.attack,defense:o.defense,pHit:predict(o)}))
  })).sort((a,b)=>b.logLikelihood-a.logLikelihood);
}
export function wilsonInterval(hits,misses,z=1.96){
  validateObservation({attack:1,defense:1,hits,misses});
  const n=hits+misses,p=hits/n,denom=1+z*z/n;
  const mid=(p+z*z/(2*n))/denom;
  const half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/denom;
  return [Math.max(0,mid-half),Math.min(1,mid+half)];
}
export function summarizeDamageRolls(damages) {
  if(!Array.isArray(damages)||!damages.length||damages.some(d=>!Number.isInteger(d)||d<0))
    throw new RangeError("Nonempty integer damage rolls required");
  const counts=new Map();
  for(const d of damages)counts.set(d,(counts.get(d)||0)+1);
  const n=damages.length,misses=counts.get(0)||0,positive=damages.filter(d=>d>0);
  return {attempts:n,zeroDamage:misses,positiveHits:positive.length,
    observedMaxHit:positive.length?Math.max(...positive):null,
    meanAttemptDamage:damages.reduce((a,b)=>a+b,0)/n,
    distribution:Object.fromEntries([...counts].sort((a,b)=>a[0]-b[0]))};
}
