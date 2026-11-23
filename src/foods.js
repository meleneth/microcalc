// Food healing values from Microscape Wiki item detail pages, checked 2026-11-23.
// Cooking level is the recipe requirement, not an eating requirement.
// Coins are wiki base item values, NOT verified purchase prices.
export const foods = [
  {
    "id": "shrimp",
    "heal": 3,
    "cookingLevel": 1,
    "baseValue": 1,
    "source": "https://microwiki.mhmm.pl/items/cookedShrimp"
  },
  {
    "id": "meat",
    "heal": 3,
    "cookingLevel": 1,
    "baseValue": 1,
    "source": "https://microwiki.mhmm.pl/items/cookedMeat"
  },
  {
    "id": "chicken",
    "heal": 3,
    "cookingLevel": 1,
    "baseValue": 1,
    "source": "https://microwiki.mhmm.pl/items/cookedChicken"
  },
  {
    "id": "frog on a stick",
    "heal": 3,
    "cookingLevel": 1,
    "baseValue": 1,
    "source": "https://microwiki.mhmm.pl/items/cookedFrog"
  },
  {
    "id": "sardine",
    "heal": 4,
    "cookingLevel": 5,
    "baseValue": 2,
    "source": "https://microwiki.mhmm.pl/items/cookedSardine"
  },
  {
    "id": "bread",
    "heal": 5,
    "cookingLevel": 1,
    "baseValue": 4,
    "source": "https://microwiki.mhmm.pl/items/bread"
  },
  {
    "id": "trout",
    "heal": 7,
    "cookingLevel": 15,
    "baseValue": 4,
    "source": "https://microwiki.mhmm.pl/items/cookedTrout"
  },
  {
    "id": "salmon",
    "heal": 9,
    "cookingLevel": 25,
    "baseValue": 6,
    "source": "https://microwiki.mhmm.pl/items/cookedSalmon"
  },
  {
    "id": "redberry pie",
    "heal": 10,
    "cookingLevel": 10,
    "baseValue": 9,
    "source": "https://microwiki.mhmm.pl/items/redberryPie"
  },
  {
    "id": "lobster",
    "heal": 12,
    "cookingLevel": 40,
    "baseValue": 8,
    "source": "https://microwiki.mhmm.pl/items/cookedLobster"
  },
  {
    "id": "meat pie",
    "heal": 12,
    "cookingLevel": 20,
    "baseValue": 13,
    "source": "https://microwiki.mhmm.pl/items/meatPie"
  },
  {
    "id": "swordfish",
    "heal": 14,
    "cookingLevel": 45,
    "baseValue": 10,
    "source": "https://microwiki.mhmm.pl/items/cookedSwordfish"
  }
];
export function findFood(id){return foods.find(f=>f.id===id)||null;}
export function nominalHeal(foodId,foodRecoveryBonus=0){
 const food=findFood(foodId);
 if(!food)return 0;
 return Math.max(0,food.heal+Math.max(0,foodRecoveryBonus));
}
export function healingFromBite(foodId,hp,maxHp,foodRecoveryBonus=0){
 if(!Number.isFinite(hp)||!Number.isFinite(maxHp)||maxHp<=0||hp<0||hp>maxHp)
   throw new RangeError("Invalid current/max HP");
 return Math.min(maxHp-hp,nominalHeal(foodId,foodRecoveryBonus));
}
