// Wiki monster detail pages checked 2026-11-23.
// Numerator is always one independent roll, except guaranteed entries (denominator=1).
// An empty table means "no drops recorded" in the wiki, not a proven absence of drops.
// Safe variants are retained for reference but forbidden in early-game progression.
const raw = [
  [
    "Island rodent",
    "island-rodent",
    "bones:1,rodent pelt:2"
  ],
  [
    "Mouse",
    "mouse",
    "bones:4,eye of newt:16,ladle:512,lucky paw:1024"
  ],
  [
    "Chicken",
    "chicken",
    "feather:2,raw chicken:2"
  ],
  [
    "Giant rat",
    "giant-rat",
    "bones:2,raw meat:2,fellroot:16,impweed:16,bronze full helm:128"
  ],
  [
    "Cow",
    "cow",
    "cow hide:2,raw meat:4,bones:4,impweed:32,Beatrix:262144"
  ],
  [
    "Goblin",
    "goblin",
    "bones:1,small coin pouch:8,impweed:16,eye of newt:16,bronze arrows:64*5,tin ore:64,mind rune:128*4,chef's hat:256,bronze scimitar:1024"
  ],
  [
    "Insect swarm",
    "insect-swarm",
    "\"Al\" Sigil:16,spider silk:16,Beatrix:262144"
  ],
  [
    "Titan scorpion",
    "giant-scorpion",
    "copper ore:8,tin ore:8,snail shell:16,steel med helm:128"
  ],
  [
    "Imp",
    "imp",
    "ashes:2,impweed:32,eye of newt:32,elmwort:32,ball of wool:128,bucket:256,pot:256,wizard's hat:512,uncut sapphire:2048,uncut emerald:2048,uncut ruby:4096"
  ],
  [
    "Snake",
    "snake",
    "\"Al\" Sigil:16,\"Di\" Sigil:32,venom sac:32,snakeskin scales:32,snake eggs:64,serpentleaf:256"
  ],
  [
    "Turkey",
    "turkey",
    "feather:1*5,bones:1,raw chicken:1,feathered seed:16,gardener's gloves:64"
  ],
  [
    "Monk",
    "monk",
    "bones:1,small coin pouch:32*2,elmwort:32,knightveil:32,chocolate dust:64,spirit rune:64*4,monk's robe:128,staff:128,leather gloves:256,hammer:512,wizard's robe:4096"
  ],
  [
    "Crocodile (Safe)",
    "crocodile-safe",
    "leather:4,raw meat:4,small coin pouch:16,\"Al\" Sigil:16,marshcap:16,\"Di\" Sigil:32,\"La\" Sigil:64,leather boots:64,snape grass:128,titanium ring:16384"
  ],
  [
    "Skeleton",
    "skeleton",
    "bones:1,elmwort:16,knightveil:32,steel armor:128,mind rune:128*10,oak bow:256"
  ],
  [
    "Cave slime",
    "cave-slime",
    "raw sardine:4,bones:8,gloomroot:32,snail shell:32,havenfrond:32,spider silk:32,dwellberries:32,steel med helm:512,mithril sq shield:2048"
  ],
  [
    "Slimelet",
    "slimelet",
    ""
  ],
  [
    "Bear",
    "bear",
    "bones:1,raw meat:1,fur:4,redberries:8*3,havenfrond:32,raw salmon:32,marshcap:32,limpwurt root:32,dwellberries:32,Beatrix:65536"
  ],
  [
    "Ghost",
    "ghost",
    "ashes:2,marshcap:32,snail shell:32,frostcurl:32,Blue Flame:256,wizard's robe:4096"
  ],
  [
    "Fire dwarf",
    "fire-dwarf",
    "bones:1,pickaxe:16,coal tar:16,coal ore:32,lavabloom:32,iron ore:64,iron bar:64*4,fire dwarf gloves:1024,ironbreaker pickaxe:1024"
  ],
  [
    "Fire Dwarf (Safe)",
    "fire-dwarf-safe",
    "bones:1,pickaxe:16,coal tar:16,coal ore:32,lavabloom:32,iron ore:64,iron bar:64*4,fire dwarf gloves:1024,ironbreaker pickaxe:1024"
  ],
  [
    "Sewer Crocodile",
    "sewer-crocodile",
    "raw sardine:4*2,snail shell:16,nature rune:32*10,steel med helm:128,mithril sq shield:512"
  ],
  [
    "Mummy",
    "mummy",
    "bones:1,gold bar:4,small coin pouch:8,\"Di\" Sigil:16,gloomroot:16,\"La\" Sigil:32,fire rune:32*5,death rune:32*3,\"Al\" Sigil:64,unstrung gold amulet:64,iron dagger:64,cursed talisman:65536"
  ],
  [
    "Black knight",
    "black-knight",
    "bones:1,knightveil:128,black armor:1024,black full helm:2048,black 2h sword:4096"
  ],
  [
    "Black Knight (Safe)",
    "black-knight-safe",
    "bones:1,knightveil:128,black armor:1024,black full helm:2048,black 2h sword:4096"
  ]
];
export const lootTables = Object.fromEntries(raw.map(([name,slug,encoded])=>[
  name,
  {
    source: `https://microwiki.mhmm.pl/mobs/${slug}`,
    status: encoded ? "documented" : "no-drops-recorded",
    drops: encoded ? encoded.split(",").map(entry=>{
      const separator=entry.lastIndexOf(":");
      const item=entry.slice(0,separator);
      const [oneIn,quantity="1"]=entry.slice(separator+1).split("*");
      return {item,oneIn:Number(oneIn),quantity:Number(quantity),chance:1/Number(oneIn),expectedUnitsPerKill:Number(quantity)/Number(oneIn)};
    }) : []
  }
]));
export function expectedKillsForDrop(monster,item,quantity=1){
  const entry=lootTables[monster]?.drops.find(d=>d.item===item);
  if(!entry)return Infinity;
  return quantity*entry.oneIn/entry.quantity;
}
