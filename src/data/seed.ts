import type { Restaurant } from "./types";

/**
 * Curated list of restaurants in and around Jonestown, TX 78645 — pulled
 * from public listings (TripAdvisor, Yelp, the town's own listings) and
 * cross-checked. The shared seed for every Jonestown-area couple.
 *
 * Couples can hide / edit / add freely from inside the app; this list is
 * just a head start so the map isn't empty on day one.
 */
export const SEED_RESTAURANTS: Array<
  Pick<Restaurant, "id" | "name" | "cuisine" | "area" | "address" | "notes">
> = [
  // ---- Jonestown proper ----
  {
    id: "bamboo-garden",
    name: "Bamboo Garden Wok 'N' Grill",
    cuisine: "Chinese · Wok",
    area: "Jonestown",
    notes: "Our first pick.",
  },
  {
    id: "lucky-rabbit",
    name: "The Lucky Rabbit",
    cuisine: "Bar · Burgers · Live Music",
    area: "Jonestown",
    address: "18626 Ranch Rd 1431, Jonestown, TX 78645",
    notes: "Rustic Texas, handcrafted cocktails, frozen margs.",
  },
  {
    id: "bajo-la-luna",
    name: "Bajo La Luna",
    cuisine: "Tex-Mex",
    area: "Jonestown",
    address: "18608 FM 1431, Jonestown, TX 78645",
    notes: "Fajitas, enchiladas, tacos, nachos.",
  },
  {
    id: "quetzal-texmex",
    name: "Quetzal TexMex",
    cuisine: "Tex-Mex",
    area: "Jonestown",
  },
  {
    id: "la-chaparrita",
    name: "La Chaparrita",
    cuisine: "Mexican",
    area: "Jonestown",
  },
  {
    id: "the-cedar-tree",
    name: "The Cedar Tree",
    cuisine: "Mediterranean · Café",
    area: "Jonestown",
  },
  {
    id: "farmands-kitchen",
    name: "Farmand's Kitchen",
    cuisine: "American",
    area: "Jonestown",
  },
  {
    id: "the-burger-bar",
    name: "The Burger Bar",
    cuisine: "Burgers",
    area: "Jonestown",
  },
  {
    id: "floating-tavern",
    name: "Floating Tavern",
    cuisine: "Bar · American",
    area: "Jonestown",
  },
  {
    id: "the-lighthouse",
    name: "The Lighthouse Restaurant & Lounge",
    cuisine: "American · Lounge",
    area: "Jonestown",
  },
  {
    id: "wild-hare-bar-grill",
    name: "Wild Hare Bar & Grill",
    cuisine: "Bar · Grill",
    area: "Jonestown",
    address: "7301 Maritime Pass, Jonestown, TX 78645",
  },
  {
    id: "cup-of-jonestown",
    name: "Cup of Jonestown",
    cuisine: "Coffee · Café · Breakfast",
    area: "Jonestown",
    notes: "Breakfast tacos, baked goods.",
  },
  {
    id: "scratch-brew-cafe",
    name: "Scratch Brew Cafe",
    cuisine: "Coffee · Brunch",
    area: "Jonestown",
  },
  {
    id: "alba-wine-bar",
    name: "Alba Wine Bar",
    cuisine: "Wine Bar · French",
    area: "Jonestown",
  },
  {
    id: "rounders-pizzeria",
    name: "Rounders Pizzeria",
    cuisine: "Pizza",
    area: "Jonestown",
    notes: "Lakeside.",
  },
  {
    id: "dominos-jonestown",
    name: "Domino's Pizza",
    cuisine: "Pizza · Chain",
    area: "Jonestown",
  },

  // ---- Lago Vista (also 78645) ----
  {
    id: "bella-vista-lv",
    name: "Bella Vista",
    cuisine: "American",
    area: "Lago Vista",
  },
  {
    id: "copperhead-grille",
    name: "Copperhead Grille",
    cuisine: "Burgers · Bar",
    area: "Lago Vista",
    notes: "Best burger in town, year-round patio.",
  },
  {
    id: "brocs-italian-market",
    name: "Broc's Italian Market",
    cuisine: "Italian",
    area: "Lago Vista",
    notes: "Family-owned. Lasagna, spinach ravioli, homemade meatballs.",
  },
  {
    id: "island-bar-grill",
    name: "The Island Bar & Grill",
    cuisine: "American · Bar",
    area: "Lago Vista",
    address: "3404 American Drive, Lago Vista, TX 78645",
    notes: "Lake views.",
  },
  {
    id: "bunker-bar-grille",
    name: "The Bunker Bar and Grille",
    cuisine: "Bar · Grill",
    area: "Lago Vista",
  },
  {
    id: "jj-bbq-burgers",
    name: "J&J Barbeque & Burgers",
    cuisine: "BBQ · Burgers",
    area: "Lago Vista",
    notes: "Inside a gas station. Pit-smoked brisket, sausage, chicken, ribs.",
  },
  {
    id: "casa-mexico-truck",
    name: "Casa Mexico",
    cuisine: "Mexican · Food Truck",
    area: "Lago Vista",
    notes: "Cheap, generous, homemade salsas.",
  },
  {
    id: "taqueria-lago-vista",
    name: "Taquería Lago Vista",
    cuisine: "Tacos · Mexican",
    area: "Lago Vista",
  },
];
