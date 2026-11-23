// Wiki snapshots, 2026-11-23. Do not treat model-derived estimates as wiki facts.
export const sources = {
  xp: "https://microwiki.mhmm.pl/guides/experience-table",
  mobs: "https://microwiki.mhmm.pl/mobs",
  reference: "https://thescribe.tips/tools/combat",
};
export const xp = [0,830,1740,2760,3880,5120,6500,8010,9690,11540,13580,15840,18330,21070,24110,27460,31150,35230,39730,44700,50180,56240,62910,70280,78420,87400,97300,108240,120310,133630,148330,164560,182470,202240,224060,248150,274730,304080,336480,372240,411710,455290,503390,556490,615120,679830,751270,830140,917210,1013330,1119450,1236600,1365940,1508720,1666360,1840400,2032540,2244660,2478860,2737420,3022880,3338040,3685990,4070150,4494280,4962540,5479530,6050320,6680510,7376270,8144450,8992570,9928950,10962780,12104210,13364430,14755810,16292000,17988080,19860680,21928180,24210870,26731140,29513730,32585940,35977920,39722940,43857760,48422950,53463320,59028310,65172530,71956290,79446140,87715580,96845770,106926290,118056060,130344310];
export const mobs = [
 ["Island rodent",3,1,1,1,"Tutabay Atoll"],["Mouse",2,1,-4,1,"Manor Kitchen"],["Chicken",3,1,5,1,"Fencewell Bridge"],
 ["Giant rat",4,5,5,1,"Fellroot Swamp"],["Cow",8,6,3,5,"Fencewell Bridge"],["Goblin",13,9,9,9,"Goblin Camp"],
 ["Insect swarm",4,3,1,18,"Elshand Temple Ruins"],["Titan scorpion",20,16,18,8,"Al-Sahra Mine"],["Imp",13,13,12,14,"Old Dwarven Tunnels"],
 ["Snake",14,24,8,12,"Elshand Temple Ruins"],["Monk",16,16,16,16,"Wicked Monastery"],["Skeleton",19,16,16,22,"O'Rock Sewers"],
 ["Cave slime",34,15,20,34,"O'Rock Sewers"],["Bear",26,20,30,28,"O'Rock East Mine"],["Ghost",29,29,29,29,"Drymor Mansion"],
 ["Fire dwarf",33,33,33,33,"Old Dwarven Tunnels"],["Mummy",36,36,36,36,"Elshand Temple B2"],["Black knight",38,30,41,42,"Black Knight's Fort"],
 ["Moss giant",82,38,45,43,"O'Rock Sewers"]
].map(([name,hp,attack,strength,defense,location])=>({name,hp,attack,strength,defense,location}));
