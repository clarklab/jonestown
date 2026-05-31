import type { Restaurant } from "./types";

/**
 * Unified catalog of restaurants in and around Jonestown, TX 78645.
 *
 * Each entry has full metadata (cuisine, area, address, public rating,
 * outbound links). Entries with `inSeed: true` get auto-added to a new
 * couple's map on first launch. Everything else is searchable from
 * "Add restaurant" and the admin checklist — but isn't auto-populated.
 *
 * Closed / relocated spots intentionally omitted (Cup of Jonestown, Quetzal
 * TexMex, Rounders Pizzeria, Broc's Italian Market, Scratch Brew Cafe, Maria's
 * Bar & Grill, Azul Cantina, Lago Tacos, etc).
 *
 * Sources: TripAdvisor / Yelp / Google / Hill Country Lakes Rentals /
 * Restaurant Guru, cross-checked 2026.
 */
export interface CatalogEntry {
  inSeed: boolean;
  data: Pick<
    Restaurant,
    | "id"
    | "name"
    | "cuisine"
    | "area"
    | "address"
    | "notes"
    | "publicRating"
    | "links"
    | "phone"
    | "imageUrl"
    | "coords"
  >;
}

export const CATALOG: CatalogEntry[] = [
  // ============================================================
  // SEEDED — auto-populated for any new Jonestown couple
  // ============================================================
  {
    inSeed: true,
    data: {
      id: "bamboo-garden",
      coords: { lat: 30.4509, lng: -97.9881 },
      name: "Bamboo Garden Wok 'N' Grill",
      cuisine: "Chinese · Wok",
      area: "Lago Vista",
      address: "7708 Lohman Ford Rd, Ste 108B, Lago Vista, TX 78645",
      phone: "(512) 267-7600",
      notes: "Our first pick.",
      publicRating: { source: "yelp", value: 4.0 },
    },
  },
  {
    inSeed: true,
    data: {
      id: "lucky-rabbit",
      coords: { lat: 30.4933, lng: -97.917 },
      name: "The Lucky Rabbit",
      cuisine: "Bar · Burgers · Live Music",
      area: "Jonestown",
      address: "18626 Ranch Rd 1431, Jonestown, TX 78645",
      notes: "Rustic Texas, handcrafted cocktails, frozen margs.",
      publicRating: { source: "yelp", value: 4.7, count: 939 },
    },
  },
  {
    inSeed: true,
    data: {
      id: "bajo-la-luna",
      coords: { lat: 30.4935, lng: -97.9175 },
      name: "Bajo La Luna",
      cuisine: "Tex-Mex",
      area: "Jonestown",
      address: "18608 FM 1431, Jonestown, TX 78645",
      phone: "(512) 215-9852",
      notes: "Fajitas, enchiladas, tacos, nachos.",
      publicRating: { source: "google", value: 4.4 },
      links: { website: "https://bajolalunatexmex.com" },
    },
  },
  {
    inSeed: true,
    data: {
      id: "la-chaparrita",
      coords: { lat: 30.4934, lng: -97.9168 },
      name: "La Chaparrita Mexican Food",
      cuisine: "Mexican",
      area: "Jonestown",
      address: "18638 FM 1431, Jonestown, TX 78645",
      phone: "(512) 267-1041",
      notes: "Order window inside the corner store.",
      publicRating: { source: "google", value: 2.3, count: 21 },
    },
  },
  {
    inSeed: true,
    data: {
      id: "the-burger-bar",
      coords: { lat: 30.451, lng: -97.9882 },
      name: "The Burger Bar",
      cuisine: "Burgers",
      area: "Lago Vista",
      address: "7708 Lohman Ford Rd 202e, Lago Vista, TX 78645",
    },
  },
  {
    inSeed: true,
    data: {
      id: "floating-tavern",
      coords: { lat: 30.487, lng: -97.93 },
      name: "Floating Tavern",
      cuisine: "Bar · American",
      area: "Jonestown",
    },
  },
  {
    inSeed: true,
    data: {
      id: "wild-hare-bar-grill",
      coords: { lat: 30.4615, lng: -97.958 },
      name: "Wild Hare Bar & Grill",
      cuisine: "Bar · Grill",
      area: "Jonestown",
      address: "7301 Maritime Pass, Jonestown, TX 78645",
      notes: "At The Hollows Beach Club. Seasonal.",
      publicRating: { source: "google", value: 4.7, count: 25 },
    },
  },
  {
    inSeed: true,
    data: {
      id: "alba-wine-bar",
      coords: { lat: 30.4938, lng: -97.918 },
      name: "Alba Wine Bar",
      cuisine: "Wine Bar · French",
      area: "Jonestown",
      address: "18700 Ranch Rd 1431 Ste A, Jonestown, TX 78645",
      notes: "Closed Mon–Tue.",
      publicRating: { source: "yelp", value: 5.0, count: 6 },
    },
  },
  {
    inSeed: true,
    data: {
      id: "dominos-jonestown",
      coords: { lat: 30.4508, lng: -97.988 },
      name: "Domino's Pizza",
      cuisine: "Pizza · Chain",
      area: "Lago Vista",
      address: "7708-B Lohmans Ford, Lago Vista, TX 78645",
      links: { website: "https://www.dominos.com" },
    },
  },
  {
    inSeed: true,
    data: {
      id: "the-cedar-tree",
      coords: { lat: 30.4509, lng: -97.9883 },
      name: "The Cedar Tree Mediterranean Grill & Café",
      cuisine: "Mediterranean",
      area: "Lago Vista",
      address: "7708 Lohman Ford Rd, Ste 105, Lago Vista, TX 78645",
      notes: "Turkish/Greek/Lebanese — shawarma, gyros, hummus.",
    },
  },
  {
    inSeed: true,
    data: {
      id: "bella-vista-lv",
      coords: { lat: 30.4511, lng: -97.9881 },
      name: "Bella Vista",
      cuisine: "Italian",
      area: "Lago Vista",
      address: "7708 Lohman Ford Rd, Lago Vista, TX 78645",
      notes: "Garlic rolls, vodka pasta, eggplant parm.",
      publicRating: { source: "tripadvisor", value: 4.4 },
      links: { website: "https://bellavistaoflagovista.com" },
    },
  },
  {
    inSeed: true,
    data: {
      id: "copperhead-grille",
      coords: { lat: 30.4595, lng: -97.9905 },
      name: "Copperhead Grill",
      cuisine: "Burgers · Bar",
      area: "Lago Vista",
      address: "6115 Lohman Ford Rd, Lago Vista, TX 78645",
      notes: "Year-round patio. Try the Copperhead burger.",
      publicRating: { source: "google", value: 4.1 },
    },
  },
  {
    inSeed: true,
    data: {
      id: "island-bar-grill",
      coords: { lat: 30.447, lng: -97.999 },
      name: "The Island Bar & Grill",
      cuisine: "American · Bar",
      area: "Lago Vista",
      address: "3404 American Drive, Lago Vista, TX 78645",
      notes: "Lakefront. Pizza, cocktails, dogs welcome.",
      links: { website: "https://islandbarandgrilltx.com" },
    },
  },
  {
    inSeed: true,
    data: {
      id: "bunker-bar-grille",
      coords: { lat: 30.464, lng: -97.981 },
      name: "The Bunker Bar and Grille",
      cuisine: "Bar · Grill",
      area: "Lago Vista",
      address: "4616 Rimrock Dr, Lago Vista, TX 78645",
      phone: "(512) 660-5209",
      notes: "Onion rings, cheese curds, fried pickles.",
      publicRating: { source: "google", value: 4.3 },
      links: { website: "https://bunkerbargrille.com" },
    },
  },
  {
    inSeed: true,
    data: {
      id: "jj-bbq-burgers",
      coords: { lat: 30.47, lng: -97.974 },
      name: "J&J Barbeque & Burgers",
      cuisine: "BBQ · Burgers",
      area: "Lago Vista",
      address: "20520 FM 1431, Lago Vista, TX 78645",
      notes: "Pit-smoked brisket inside a gas station.",
      publicRating: { source: "google", value: 4.2 },
    },
  },
  {
    inSeed: true,
    data: {
      id: "casa-mexico-truck",
      coords: { lat: 30.4515, lng: -97.9885 },
      name: "Casa Mexico",
      cuisine: "Mexican · Food Truck",
      area: "Lago Vista",
      address: "7610 Lohmans Ford Rd, Lago Vista, TX 78645",
      notes: "Affordable, generous, homemade salsas.",
      publicRating: { source: "google", value: 4.7 },
    },
  },
  {
    inSeed: true,
    data: {
      id: "taqueria-lago-vista",
      coords: { lat: 30.457, lng: -97.9895 },
      name: "Taquería Lago Vista",
      cuisine: "Tacos · Mexican",
      area: "Lago Vista",
      address: "4712 Lohman Ford Rd, Lago Vista, TX 78645",
      notes: "Inside the Chevron. Cheap, fast, breakfast tacos.",
      publicRating: { source: "yelp", value: 4.5 },
    },
  },

  // ============================================================
  // CATALOG — searchable / one-tap addable but not auto-seeded
  // ============================================================
  {
    inSeed: false,
    data: {
      id: "rumis-tavern",
      name: "Rumi's Tavern & Eatery",
      cuisine: "Bar · Live Music · Food Trucks",
      area: "Jonestown",
      address: "18626 FM 1431, Jonestown, TX 78645",
      phone: "(512) 267-4327",
      notes: "Live music venue. Craft beer, wine, rotating food trucks.",
      publicRating: { source: "google", value: 4.4 },
      links: { website: "https://rumis1431.com" },
    },
  },
  {
    inSeed: false,
    data: {
      id: "dee-dees-tacos",
      name: "Dee Dee's Tacos & More",
      cuisine: "Mexican · Tacos",
      area: "Lago Vista",
      address: "7717 Lohman Ford Rd, Lago Vista, TX 78645",
      phone: "(512) 267-2300",
    },
  },
  {
    inSeed: false,
    data: {
      id: "latte-vista-cafe",
      name: "Latte Vista Café",
      cuisine: "Coffee · Café",
      area: "Lago Vista",
      address: "20520 FM 1431, Lago Vista, TX 78645",
    },
  },
  {
    inSeed: false,
    data: {
      id: "the-taco-bar",
      name: "The Taco Bar",
      cuisine: "Tacos · Mexican",
      area: "Lago Vista",
      notes: "Casual Tex-Mex.",
      links: { website: "https://tacobartx.com" },
    },
  },
  {
    inSeed: false,
    data: {
      id: "lago-bistro",
      name: "Lago Bistro",
      cuisine: "American · Bistro",
      area: "Lago Vista",
      address: "20520 Ranch Rd 1431, Lago Vista, TX 78645",
    },
  },
  {
    inSeed: false,
    data: {
      id: "the-grille-highland-lakes",
      name: "The Grille at Highland Lakes",
      cuisine: "American · Golf Club",
      area: "Lago Vista",
      address: "20552 Highland Lake Dr, Lago Vista, TX 78645",
      phone: "(512) 215-2823",
      notes: "Inside Lake Travis Country Club.",
    },
  },
  {
    inSeed: false,
    data: {
      id: "lago-vista-golf-grill",
      name: "Lago Vista Golf & Grill",
      cuisine: "American · Golf",
      area: "Lago Vista",
      address: "4616 Rimrock Dr, Lago Vista, TX 78645",
      phone: "(512) 267-1112",
    },
  },
  // Gnarly Gar (18200 Lakepoint Cove) closed in Sept 2021. The slip is now
  // Captain Pete's Boathouse — auto-seeded below.
  {
    inSeed: true,
    data: {
      id: "captain-petes",
      coords: { lat: 30.417, lng: -97.908 },
      name: "Captain Pete's Boathouse",
      cuisine: "Seafood · Bar · Floating",
      area: "Point Venture",
      address: "18200 Lakepoint Cove, Point Venture, TX 78645",
      phone: "(512) 436-8460",
      notes:
        "Floating restaurant + bar at Point Venture. Come by land or by boat. Took over the old Gnarly Gar slip.",
      publicRating: { source: "tripadvisor", value: 4.2, count: 104 },
      links: { website: "https://www.captainpetesboathouse.com" },
    },
  },
  {
    inSeed: false,
    data: {
      id: "fourth-quarter-bar",
      name: "4th Quarter Bar & Grill",
      cuisine: "Sports Bar · American",
      area: "Point Venture",
      address: "302 Venture Blvd S, Point Venture, TX 78645",
      notes: "Locals' sports bar.",
      publicRating: { source: "yelp", value: 4.3 },
    },
  },
  {
    inSeed: false,
    data: {
      id: "bakers-bbq",
      name: "Baker's BBQ and Burger",
      cuisine: "BBQ · Burgers · Food Truck",
      area: "Point Venture",
      address: "422 Venture Blvd S, Point Venture, TX 78645",
      notes: "Food truck operation.",
    },
  },
  {
    inSeed: false,
    data: {
      id: "beachside-billys",
      name: "Beachside Billy's",
      cuisine: "American · Bar · Lakeside",
      area: "Volente",
      address: "16107 FM 2769, Volente, TX 78641",
      phone: "(512) 258-5110",
      notes:
        "At Volente Beach Resort + Waterpark. Patio sunsets, local Austin musicians.",
      publicRating: { source: "tripadvisor", value: 4.1 },
      links: { website: "https://www.volentebeach.com" },
    },
  },
  {
    inSeed: false,
    data: {
      id: "sonic-lago",
      name: "Sonic Drive-In",
      cuisine: "Fast Food · Chain",
      area: "Lago Vista",
      address: "20700 FM 1431, Lago Vista, TX 78645",
      links: { website: "https://www.sonicdrivein.com" },
    },
  },
  // "Taco Changa" → this is the spot: Taco Chango, the family-run homestyle
  // Mexican food truck that opened on the Lake Travis north shore in Jan 2024.
  // Promoted to seeded with full scraped metadata so it lands on the map.
  {
    inSeed: true,
    data: {
      id: "taco-chango",
      coords: { lat: 30.5115, lng: -97.8856 },
      name: "Taco Chango",
      cuisine: "Mexican · Tacos · Food Truck",
      area: "Leander",
      address: "12900 Trails End Rd, Leander, TX 78641",
      phone: "(512) 781-6763",
      notes:
        "Family-owned homestyle Mexican food truck. Signature crunchy Taco Chango plate, plus gorditas, flautas, quesobirria, and all-day breakfast tacos. Outdoor seating, order online for pickup.",
      links: { website: "https://www.tacochango.com" },
    },
  },
];

/** The auto-seeded subset — only entries with inSeed: true. */
export const SEED_RESTAURANTS: Array<CatalogEntry["data"]> = CATALOG.filter(
  (e) => e.inSeed,
).map((e) => e.data);

/** Full catalog data, for autocomplete and the admin checklist. */
export const CATALOG_ENTRIES: Array<CatalogEntry["data"]> = CATALOG.map(
  (e) => e.data,
);
