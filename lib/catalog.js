import { uid } from "./format.js";

export const ROOM_PRESETS = {
  "1 RK": ["Room", "Kitchen"],
  "1 BHK": ["Bedroom", "Living / Hall", "Kitchen"],
  "2 BHK": ["Master Bedroom", "Bedroom 2", "Living / Hall", "Kitchen"],
  "3 BHK": ["Master Bedroom", "Bedroom 2", "Bedroom 3", "Living / Hall", "Kitchen"],
  "4 BHK": ["Master Bedroom", "Bedroom 2", "Bedroom 3", "Bedroom 4", "Living / Hall", "Kitchen"],
};

export const CATALOG = [
  { name: "Wardrobe (sliding)", hsn: "9403", mode: "sqft", rate: 1300 },
  { name: "Wardrobe (openable)", hsn: "9403", mode: "sqft", rate: 1150 },
  { name: "Modular kitchen", hsn: "9403", mode: "sqft", rate: 1650 },
  { name: "Loft / overhead storage", hsn: "9403", mode: "sqft", rate: 950 },
  { name: "Wall paneling / veneer", hsn: "9403", mode: "sqft", rate: 850 },
  { name: "False ceiling (gypsum)", hsn: "9954", mode: "sqft", rate: 85 },
  { name: "TV unit", hsn: "9403", mode: "direct", amount: 35000 },
  { name: "Crockery unit", hsn: "9403", mode: "direct", amount: 45000 },
  { name: "Shoe rack", hsn: "9403", mode: "direct", amount: 18000 },
  { name: "Dressing unit", hsn: "9403", mode: "direct", amount: 22000 },
  { name: "Pooja unit", hsn: "9403", mode: "direct", amount: 28000 },
  { name: "Study / work table", hsn: "9403", mode: "qty", rate: 12000, unit: "nos" },
  { name: "Bed with storage (queen)", hsn: "9403", mode: "qty", rate: 32000, unit: "nos" },
  { name: "Bed with storage (king)", hsn: "9403", mode: "qty", rate: 38000, unit: "nos" },
];

export const blankItem = () => ({ id: uid(), desc: "", hsn: "9403", mode: "sqft", length: 0, width: 0, units: 1, rate: 0 });
export const catalogToItem = (c) => {
  const base = { id: uid(), desc: c.name, hsn: c.hsn, mode: c.mode };
  if (c.mode === "sqft") return { ...base, length: 0, width: 0, units: 1, rate: c.rate };
  if (c.mode === "qty") return { ...base, qty: 1, unit: c.unit || "nos", rate: c.rate };
  return { ...base, amount: c.amount };
};
