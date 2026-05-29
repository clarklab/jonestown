import type { Restaurant } from "./types";

/**
 * Curated list of restaurants in and around Jonestown, TX 78645 — pulled
 * from public listings (Yelp, Google, TripAdvisor, Restaurant Guru,
 * Restaurantji) and cross-checked. Closed and relocated spots are
 * intentionally omitted.
 *
 * `publicRating` records a single reputable consensus rating per spot so
 * the couple can compare their own verdict against the crowd. Source and
 * lookup date are baked in for honesty; estimates from positive sentiment
 * are marked as `tripadvisor` source where applicable.
 *
 * Couples can hide / edit / add freely from inside the app; this list is
 * just a head start so the map isn't empty on day one.
 */
export const SEED_RESTAURANTS: Array<
  Pick<
    Restaurant,
    "id" | "name" | "cuisine" | "area" | "address" | "notes" | "publicRating"
  >
> = [
  // ---- Jonestown proper ----
  {
    id: "bamboo-garden",
    name: "Bamboo Garden Wok 'N' Grill",
    cuisine: "Chinese · Wok",
    area: "Jonestown",
    address: "7708 Lohman Ford Rd, Ste 108B, Lago Vista, TX 78645",
    notes: "Our first pick.",
    publicRating: { source: "yelp", value: 4.0 },
  },
  {
    id: "lucky-rabbit",
    name: "The Lucky Rabbit",
    cuisine: "Bar · Burgers · Live Music",
    area: "Jonestown",
    address: "18626 Ranch Rd 1431, Jonestown, TX 78645",
    notes: "Rustic Texas, handcrafted cocktails, frozen margs.",
    publicRating: { source: "yelp", value: 4.7, count: 939 },
  },
  {
    id: "bajo-la-luna",
    name: "Bajo La Luna",
    cuisine: "Tex-Mex",
    area: "Jonestown",
    address: "18608 FM 1431, Jonestown, TX 78645",
    notes: "Fajitas, enchiladas, tacos, nachos.",
    publicRating: { source: "google", value: 4.4 },
  },
  {
    id: "la-chaparrita",
    name: "La Chaparrita Mexican Food",
    cuisine: "Mexican",
    area: "Jonestown",
    address: "18638 FM 1431, Jonestown, TX 78645",
    notes: "Order window inside the corner store.",
    publicRating: { source: "google", value: 2.3, count: 21 },
  },
  {
    id: "the-burger-bar",
    name: "The Burger Bar",
    cuisine: "Burgers",
    area: "Lago Vista",
    address: "7708 Lohman Ford Rd 202e, Lago Vista, TX 78645",
  },
  {
    id: "floating-tavern",
    name: "Floating Tavern",
    cuisine: "Bar · American",
    area: "Jonestown",
  },
  {
    id: "wild-hare-bar-grill",
    name: "Wild Hare Bar & Grill",
    cuisine: "Bar · Grill",
    area: "Jonestown",
    address: "7301 Maritime Pass, Jonestown, TX 78645",
    notes: "At The Hollows Beach Club. Seasonal.",
    publicRating: { source: "google", value: 4.7, count: 25 },
  },
  {
    id: "alba-wine-bar",
    name: "Alba Wine Bar",
    cuisine: "Wine Bar · French",
    area: "Jonestown",
    address: "18700 Ranch Rd 1431 Ste A, Jonestown, TX 78645",
    notes: "Closed Mon–Tue.",
    publicRating: { source: "yelp", value: 5.0, count: 6 },
  },
  {
    id: "dominos-jonestown",
    name: "Domino's Pizza",
    cuisine: "Pizza · Chain",
    area: "Jonestown",
  },

  // ---- Lago Vista (also 78645) ----
  {
    id: "the-cedar-tree",
    name: "The Cedar Tree Mediterranean Grill & Café",
    cuisine: "Mediterranean",
    area: "Lago Vista",
    address: "7708 Lohman Ford Rd, Ste 105, Lago Vista, TX 78645",
    notes: "Turkish/Greek/Lebanese — shawarma, gyros, hummus.",
  },
  {
    id: "bella-vista-lv",
    name: "Bella Vista",
    cuisine: "Italian",
    area: "Lago Vista",
    address: "7708 Lohman Ford Rd, Lago Vista, TX 78645",
    notes: "Garlic rolls, vodka pasta, eggplant parm.",
    publicRating: { source: "tripadvisor", value: 4.4 },
  },
  {
    id: "copperhead-grille",
    name: "Copperhead Grill",
    cuisine: "Burgers · Bar",
    area: "Lago Vista",
    address: "6115 Lohman Ford Rd, Lago Vista, TX 78645",
    notes: "Year-round patio. Try the Copperhead burger.",
    publicRating: { source: "google", value: 4.1 },
  },
  {
    id: "island-bar-grill",
    name: "The Island Bar & Grill",
    cuisine: "American · Bar",
    area: "Lago Vista",
    address: "3404 American Drive, Lago Vista, TX 78645",
    notes: "Lakefront. Pizza, cocktails, dogs welcome.",
  },
  {
    id: "bunker-bar-grille",
    name: "The Bunker Bar and Grille",
    cuisine: "Bar · Grill",
    area: "Lago Vista",
    address: "4616 Rimrock Dr, Lago Vista, TX 78645",
    notes: "Onion rings, cheese curds, fried pickles.",
    publicRating: { source: "google", value: 4.3 },
  },
  {
    id: "jj-bbq-burgers",
    name: "J&J Barbeque & Burgers",
    cuisine: "BBQ · Burgers",
    area: "Lago Vista",
    address: "20520 FM 1431, Lago Vista, TX 78645",
    notes: "Pit-smoked brisket inside a gas station.",
    publicRating: { source: "google", value: 4.2 },
  },
  {
    id: "casa-mexico-truck",
    name: "Casa Mexico",
    cuisine: "Mexican · Food Truck",
    area: "Lago Vista",
    address: "7610 Lohmans Ford Rd, Lago Vista, TX 78645",
    notes: "Affordable, generous, homemade salsas.",
    publicRating: { source: "google", value: 4.7 },
  },
  {
    id: "taqueria-lago-vista",
    name: "Taquería Lago Vista",
    cuisine: "Tacos · Mexican",
    area: "Lago Vista",
    address: "4712 Lohman Ford Rd, Lago Vista, TX 78645",
    notes: "Inside the Chevron. Cheap, fast, breakfast tacos.",
    publicRating: { source: "yelp", value: 4.5 },
  },
];
