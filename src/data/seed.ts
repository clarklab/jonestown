import type { Restaurant } from "./types";

/**
 * Starter list of restaurants in and around Jonestown, TX 78645 (Lake Travis).
 * Edit / add / remove from the app — this just gives Clark & Angie a head start.
 */
export const SEED_RESTAURANTS: Array<
  Pick<Restaurant, "id" | "name" | "cuisine" | "area" | "address" | "notes">
> = [
  {
    id: "reeds-jazz",
    name: "Reed's Jazz & Supper Club",
    cuisine: "American · Steak",
    area: "Lago Vista",
    address: "5973 Lohmans Crossing Rd",
    notes: "Live music nights. Datey.",
  },
  {
    id: "hideaway-kitchen",
    name: "The Hideaway Kitchen & Bar",
    cuisine: "American · Pub",
    area: "Lago Vista",
  },
  {
    id: "lakeside-pizza",
    name: "Lakeside Pizza",
    cuisine: "Pizza",
    area: "Jonestown",
  },
  {
    id: "bartletts",
    name: "Bartlett's",
    cuisine: "American",
    area: "Lago Vista",
  },
  {
    id: "the-cottage-cafe",
    name: "The Cottage Café",
    cuisine: "Breakfast · Diner",
    area: "Jonestown",
    notes: "Morning rotation.",
  },
  {
    id: "casa-chapala",
    name: "Casa Chapala",
    cuisine: "Tex-Mex",
    area: "Lago Vista",
  },
  {
    id: "twin-pines-bbq",
    name: "Twin Pines BBQ",
    cuisine: "BBQ",
    area: "Jonestown",
  },
  {
    id: "lone-star-pizza",
    name: "Lone Star Pizza",
    cuisine: "Pizza",
    area: "Jonestown",
  },
  {
    id: "lake-travis-tavern",
    name: "Lake Travis Tavern",
    cuisine: "Bar · Pub",
    area: "Jonestown",
    notes: "Sports + burgers.",
  },
  {
    id: "ranch-house-bbq",
    name: "Ranch House BBQ",
    cuisine: "BBQ",
    area: "Lago Vista",
  },
  {
    id: "china-wok-78645",
    name: "China Wok",
    cuisine: "Chinese",
    area: "Jonestown",
  },
  {
    id: "subway-jonestown",
    name: "Subway",
    cuisine: "Sandwiches",
    area: "Jonestown",
  },
  {
    id: "sonic-jonestown",
    name: "Sonic Drive-In",
    cuisine: "Fast food",
    area: "Lago Vista",
  },
  {
    id: "dominos-78645",
    name: "Domino's",
    cuisine: "Pizza",
    area: "Lago Vista",
  },
  {
    id: "mamas-cafe",
    name: "Mama's Café",
    cuisine: "Breakfast · Diner",
    area: "Jonestown",
  },
  {
    id: "vista-grill",
    name: "Vista Grill",
    cuisine: "American",
    area: "Lago Vista",
  },
  {
    id: "captains-lakeside",
    name: "Captain's Lakeside",
    cuisine: "Seafood · American",
    area: "Lake Travis",
    notes: "Lakeside seating — go before sundown.",
  },
  {
    id: "the-boat-yard",
    name: "The Boat Yard",
    cuisine: "American · Bar",
    area: "Lake Travis",
  },
  {
    id: "lone-rider-coffee",
    name: "Lone Rider Coffee",
    cuisine: "Coffee · Pastries",
    area: "Jonestown",
    notes: "Quick stop.",
  },
  {
    id: "el-rancho-taqueria",
    name: "El Rancho Taquería",
    cuisine: "Mexican · Tacos",
    area: "Jonestown",
  },
];
