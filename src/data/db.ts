import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type {
  Couple,
  Dish,
  Photo,
  Restaurant,
  UserId,
  Visit,
} from "./types";
import { DEFAULT_COUPLE } from "./types";
import { SEED_RESTAURANTS } from "./seed";

interface JonestownDB extends DBSchema {
  couples: {
    key: string;
    value: Couple;
    indexes: { slug: string };
  };
  restaurants: {
    key: string;
    value: Restaurant;
    indexes: { name: string; coupleId: string };
  };
  visits: {
    key: string;
    value: Visit;
    indexes: {
      restaurantId: string;
      userId: UserId;
      date: number;
      coupleId: string;
    };
  };
  dishes: {
    key: string;
    value: Dish;
    indexes: {
      visitId: string;
      restaurantId: string;
      userId: UserId;
      coupleId: string;
    };
  };
  photos: {
    key: string;
    value: Photo;
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

const DB_NAME = "jonestown";
const DB_VERSION = 2;

let _dbPromise: Promise<IDBPDatabase<JonestownDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<JonestownDB>> {
  if (!_dbPromise) {
    _dbPromise = openDB<JonestownDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const r = db.createObjectStore("restaurants", { keyPath: "id" });
          r.createIndex("name", "name");
          r.createIndex("coupleId", "coupleId");
          const v = db.createObjectStore("visits", { keyPath: "id" });
          v.createIndex("restaurantId", "restaurantId");
          v.createIndex("userId", "userId");
          v.createIndex("date", "date");
          v.createIndex("coupleId", "coupleId");
          const d = db.createObjectStore("dishes", { keyPath: "id" });
          d.createIndex("visitId", "visitId");
          d.createIndex("restaurantId", "restaurantId");
          d.createIndex("userId", "userId");
          d.createIndex("coupleId", "coupleId");
          db.createObjectStore("photos", { keyPath: "id" });
          db.createObjectStore("meta", { keyPath: "key" });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("couples")) {
            const c = db.createObjectStore("couples", { keyPath: "id" });
            c.createIndex("slug", "slug", { unique: true });
          }
          // Add coupleId index to existing tables (use the version-change tx)
          for (const storeName of ["restaurants", "visits", "dishes"] as const) {
            const store = tx.objectStore(storeName);
            if (!store.indexNames.contains("coupleId")) {
              store.createIndex("coupleId", "coupleId");
            }
          }
        }
      },
    });
  }
  return _dbPromise;
}

/**
 * Migrate any legacy records (no coupleId, or userId === "clark"/"angie")
 * onto the default couple. Idempotent.
 *
 * Only creates the default couple + selects it as current when there was
 * pre-existing data to migrate — fresh installs land on the LandingPage
 * untouched.
 */
export async function migrateLegacyData(): Promise<void> {
  const db = await getDb();
  const migrationFlag = await db.get("meta", "migrated:v2");
  if (migrationFlag) return;

  // Detect legacy data before touching anything.
  const [restCount, visitCount, dishCount] = await Promise.all([
    db.count("restaurants"),
    db.count("visits"),
    db.count("dishes"),
  ]);
  const hadLegacyData = restCount + visitCount + dishCount > 0;

  if (hadLegacyData) {
    const existingDefault = await db.get("couples", DEFAULT_COUPLE.id);
    if (!existingDefault) {
      const now = Date.now();
      await db.put("couples", {
        ...DEFAULT_COUPLE,
        createdAt: now,
        updatedAt: now,
      });
    }

    const remap = (uid: string): UserId =>
      uid === "clark" ? "a" : uid === "angie" ? "b" : (uid as UserId);

    const tx = db.transaction(
      ["restaurants", "visits", "dishes", "photos", "meta"],
      "readwrite",
    );

    for await (const cursor of tx.objectStore("restaurants").iterate()) {
      if (!cursor.value.coupleId) {
        await cursor.update({ ...cursor.value, coupleId: DEFAULT_COUPLE.id });
      }
    }
    for await (const cursor of tx.objectStore("visits").iterate()) {
      const v = cursor.value;
      const uid = v.userId as unknown as string;
      if (!v.coupleId || uid === "clark" || uid === "angie") {
        await cursor.update({
          ...v,
          coupleId: v.coupleId ?? DEFAULT_COUPLE.id,
          userId: remap(uid),
        });
      }
    }
    for await (const cursor of tx.objectStore("dishes").iterate()) {
      const d = cursor.value;
      const uid = d.userId as unknown as string;
      if (!d.coupleId || uid === "clark" || uid === "angie") {
        await cursor.update({
          ...d,
          coupleId: d.coupleId ?? DEFAULT_COUPLE.id,
          userId: remap(uid),
        });
      }
    }
    for await (const cursor of tx.objectStore("photos").iterate()) {
      if (!cursor.value.coupleId) {
        await cursor.update({ ...cursor.value, coupleId: DEFAULT_COUPLE.id });
      }
    }

    const cu = await tx.objectStore("meta").get("currentUser");
    if (cu?.value === "clark" || cu?.value === "angie") {
      await tx
        .objectStore("meta")
        .put({ key: "currentUser", value: remap(cu.value as string) });
    }

    // Auto-select the default couple so the legacy install lands back on
    // its map after the upgrade.
    const currentCouple = await tx.objectStore("meta").get("currentCouple");
    if (!currentCouple) {
      await tx
        .objectStore("meta")
        .put({ key: "currentCouple", value: DEFAULT_COUPLE.id });
    }

    await tx.done;
    emitChange("couples");
  }

  await db.put("meta", { key: "migrated:v2", value: true });
}

/** Bump when the seed list changes so deployed installs pick up new entries. */
const SEED_VERSION = 9;

export async function ensureSeeded(coupleId: string): Promise<void> {
  const db = await getDb();
  const isDefault = coupleId === DEFAULT_COUPLE.id;

  // Versioned seed: idempotently add missing restaurants, AND patch in any
  // new public-source fields (e.g. publicRating) onto already-present rows.
  // Never overwrites or deletes user-edited fields — name, cuisine, notes
  // etc. stay whatever the couple has set them to.
  const versionEntry = await db.get("meta", `seeded:v:${coupleId}`);
  const currentVersion = (versionEntry?.value as number | undefined) ?? 0;
  if (currentVersion < SEED_VERSION) {
    const tx = db.transaction(["restaurants", "meta"], "readwrite");
    const now = Date.now();
    let touched = false;
    for (const r of SEED_RESTAURANTS) {
      const id = isDefault ? r.id : `${coupleId}:${r.id}`;
      const existing = await tx.objectStore("restaurants").get(id);
      if (!existing) {
        await tx.objectStore("restaurants").put({
          ...r,
          id,
          coupleId,
          createdAt: now,
          updatedAt: now,
        });
        touched = true;
      } else {
        // Strictly additive top-up of public-source fields. Never overwrites
        // anything the couple has edited.
        const patch: Partial<typeof existing> = {};
        if (
          r.publicRating &&
          (!existing.publicRating ||
            existing.publicRating.source !== r.publicRating.source ||
            existing.publicRating.value !== r.publicRating.value)
        ) {
          patch.publicRating = r.publicRating;
        }
        // Backfill coords onto pre-v5 rows that never had them.
        if (r.coords && !existing.coords) {
          patch.coords = r.coords;
        }
        if (Object.keys(patch).length > 0) {
          await tx.objectStore("restaurants").put({
            ...existing,
            ...patch,
            updatedAt: now,
          });
          touched = true;
        }
      }
    }
    await tx
      .objectStore("meta")
      .put({ key: `seeded:v:${coupleId}`, value: SEED_VERSION });
    await tx.done;
    if (touched) emitChange("restaurants");
  }

  // For Jonestown TX couples (the original audience), pre-rate Bamboo Garden
  // as their first pick. STRICTLY ADDITIVE — never overwrites a record that
  // already exists, and never touches anything once the couple has logged
  // visits/dishes of their own.
  //
  // History note: earlier bamboo:v2/v3 migrations rewrote the seed visits
  // each time they bumped, which wiped any user edits on the Bamboo entry.
  // That bug ate at least one real review. This version refuses to touch
  // any existing row — once written, it's the user's to edit.
  const couple = await db.get("couples", coupleId);
  const isJonestown =
    !!couple && /jonestown|78645/i.test(couple.town ?? "");
  if (isJonestown) {
    const restId = isDefault ? "bamboo-garden" : `${coupleId}:bamboo-garden`;
    const exists = await db.get("restaurants", restId);
    if (exists) {
      // The bamboo seed has shipped under three flag names over time. If
      // *any* of them is set we treat the seed as already applied and bail
      // — we don't know what the user has done with the records since.
      const v1 = await db.get("meta", `bamboo:${coupleId}:v1`);
      const v2 = await db.get("meta", `bamboo:${coupleId}:v2`);
      const v3 = await db.get("meta", `bamboo:${coupleId}:v3`);
      const alreadySeeded = !!(v1 || v2 || v3);
      if (!alreadySeeded) {
        const tx = db.transaction(
          ["visits", "dishes", "meta"],
          "readwrite",
        );
        const date = Date.now() - 7 * 24 * 60 * 60 * 1000; // ~a week ago
        const visitAId = `${coupleId}-a-bamboo`;
        const visitBId = `${coupleId}-b-bamboo`;

        // Write the seed records only when they don't already exist. This
        // covers the case where a partial seed ran in a prior version.
        const putVisitIfMissing = async (record: Visit) => {
          const store = tx.objectStore("visits");
          if (!(await store.get(record.id))) await store.put(record);
        };
        const putDishIfMissing = async (record: Dish) => {
          const store = tx.objectStore("dishes");
          if (!(await store.get(record.id))) await store.put(record);
        };

        await putVisitIfMissing({
          id: visitAId,
          coupleId,
          restaurantId: restId,
          userId: "a",
          date,
          rating: 3.5,
          notes:
            "Phoenix chicken was good — would get again. Fried rice was mid, needs veggies.",
          occasion: "Friday night",
          createdAt: date,
        });
        await putVisitIfMissing({
          id: visitBId,
          coupleId,
          restaurantId: restId,
          userId: "b",
          date: date + 1000,
          rating: 3,
          notes:
            "Sweet & sour chicken — wanted more pineapple. Fried rice mid, needs veggies.",
          createdAt: date + 1000,
        });
        await putDishIfMissing({
          id: `${coupleId}-a-bamboo-phoenix`,
          coupleId,
          visitId: visitAId,
          restaurantId: restId,
          userId: "a",
          name: "Phoenix Chicken",
          verdict: "yes",
          notes: "Would get again.",
          createdAt: date,
        });
        await putDishIfMissing({
          id: `${coupleId}-b-bamboo-sweetsour`,
          coupleId,
          visitId: visitBId,
          restaurantId: restId,
          userId: "b",
          name: "Sweet & Sour Chicken",
          notes: "Wanted more pineapple.",
          createdAt: date + 500,
        });
        await putDishIfMissing({
          id: `${coupleId}-a-bamboo-friedrice`,
          coupleId,
          visitId: visitAId,
          restaurantId: restId,
          userId: "a",
          name: "Fried Rice",
          verdict: "no",
          notes: "Mid. Needs veggies.",
          createdAt: date + 200,
        });

        // Mark every prior bamboo migration done so future code paths
        // don't trigger an overwrite.
        for (const v of ["v1", "v2", "v3"]) {
          await tx
            .objectStore("meta")
            .put({ key: `bamboo:${coupleId}:${v}`, value: true });
        }
        await tx.done;
        emitChange("visits");
        emitChange("dishes");
      }
    }
  }
}

export const eventBus = new EventTarget();
export function emitChange(table: string) {
  eventBus.dispatchEvent(new CustomEvent("change", { detail: { table } }));
}
export function onChange(handler: (table: string) => void) {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent).detail as { table: string };
    handler(detail.table);
  };
  eventBus.addEventListener("change", listener);
  return () => eventBus.removeEventListener("change", listener);
}

/**
 * Optimistic in-memory cache.
 *
 * Saves write through to this cache synchronously *before* awaiting the
 * IndexedDB put, so any UI mounted between save and IDB completion still
 * sees the new record. Lists in here are sorted the same way the public
 * `list*` functions sort them, so consumers can use the cache directly.
 *
 * Keys:
 *  - restaurants:  `${coupleId}`
 *  - visits:       `${coupleId}::${restaurantId | "*"}`
 *  - dishes:       `${coupleId}::${restaurantId | "*"}::${visitId | "*"}`
 *
 * The cache is best-effort. If a key isn't present yet we fall through to
 * IndexedDB, and the result populates the cache.
 */
const _cache = {
  restaurants: new Map<string, Restaurant[]>(),
  visits: new Map<string, Visit[]>(),
  dishes: new Map<string, Dish[]>(),
};

function _restKey(coupleId: string) {
  return coupleId;
}
function _visitKey(coupleId: string, restaurantId?: string) {
  return `${coupleId}::${restaurantId ?? "*"}`;
}
function _dishKey(
  coupleId: string,
  restaurantId?: string,
  visitId?: string,
) {
  return `${coupleId}::${restaurantId ?? "*"}::${visitId ?? "*"}`;
}

export function cachedRestaurants(coupleId: string): Restaurant[] | null {
  return _cache.restaurants.get(_restKey(coupleId)) ?? null;
}
export function cachedVisits(
  coupleId: string,
  restaurantId?: string,
): Visit[] | null {
  return _cache.visits.get(_visitKey(coupleId, restaurantId)) ?? null;
}
export function cachedDishes(
  coupleId: string,
  opts?: { restaurantId?: string; visitId?: string },
): Dish[] | null {
  return (
    _cache.dishes.get(
      _dishKey(coupleId, opts?.restaurantId, opts?.visitId),
    ) ?? null
  );
}

function _upsertRestaurantInCache(r: Restaurant) {
  if (!r.coupleId) return;
  const key = _restKey(r.coupleId);
  const list = _cache.restaurants.get(key);
  if (!list) return;
  const idx = list.findIndex((x) => x.id === r.id);
  const next = idx >= 0 ? list.map((x, i) => (i === idx ? r : x)) : [...list, r];
  next.sort((a, b) => a.name.localeCompare(b.name));
  _cache.restaurants.set(key, next.filter((x) => !x.hidden));
}

function _upsertVisitInCache(visit: Visit) {
  if (!visit.coupleId) return;
  // Update all keyed views that this visit belongs to.
  for (const key of _cache.visits.keys()) {
    const [coupleId, restFilter] = key.split("::");
    if (visit.coupleId !== coupleId) continue;
    if (restFilter !== "*" && restFilter !== visit.restaurantId) continue;
    const list = _cache.visits.get(key)!;
    const idx = list.findIndex((v) => v.id === visit.id);
    const next = idx >= 0 ? list.map((v, i) => (i === idx ? visit : v)) : [...list, visit];
    next.sort((a, b) => b.date - a.date);
    _cache.visits.set(key, next);
  }
}

function _removeVisitFromCache(visitId: string) {
  for (const [key, list] of _cache.visits) {
    if (list.some((v) => v.id === visitId)) {
      _cache.visits.set(key, list.filter((v) => v.id !== visitId));
    }
  }
}

function _upsertDishInCache(dish: Dish) {
  if (!dish.coupleId) return;
  for (const key of _cache.dishes.keys()) {
    const [coupleId, restFilter, visitFilter] = key.split("::");
    if (dish.coupleId !== coupleId) continue;
    if (restFilter !== "*" && restFilter !== dish.restaurantId) continue;
    if (visitFilter !== "*" && visitFilter !== dish.visitId) continue;
    const list = _cache.dishes.get(key)!;
    const idx = list.findIndex((d) => d.id === dish.id);
    const next = idx >= 0 ? list.map((d, i) => (i === idx ? dish : d)) : [...list, dish];
    // Visit-scoped view: ascending createdAt; everywhere else: descending.
    if (visitFilter !== "*")
      next.sort((a, b) => a.createdAt - b.createdAt);
    else next.sort((a, b) => b.createdAt - a.createdAt);
    _cache.dishes.set(key, next);
  }
}

function _removeDishFromCache(dishId: string) {
  for (const [key, list] of _cache.dishes) {
    if (list.some((d) => d.id === dishId)) {
      _cache.dishes.set(key, list.filter((d) => d.id !== dishId));
    }
  }
}

function _invalidateAllCaches() {
  _cache.restaurants.clear();
  _cache.visits.clear();
  _cache.dishes.clear();
}

export function clearAllCaches() {
  _invalidateAllCaches();
}

// ---- Couples ----

export async function listCouples(): Promise<Couple[]> {
  const db = await getDb();
  const all = await db.getAll("couples");
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCouple(id: string): Promise<Couple | undefined> {
  const db = await getDb();
  return db.get("couples", id);
}

export async function getCoupleBySlug(
  slug: string,
): Promise<Couple | undefined> {
  const db = await getDb();
  return db.getFromIndex("couples", "slug", slug);
}

export async function saveCouple(c: Couple): Promise<Couple> {
  const db = await getDb();
  const now = Date.now();
  const next: Couple = {
    ...c,
    createdAt: c.createdAt || now,
    updatedAt: now,
  };
  await db.put("couples", next);
  emitChange("couples");
  return next;
}

export async function getCurrentCoupleId(): Promise<string | null> {
  const db = await getDb();
  const m = await db.get("meta", "currentCouple");
  return (m?.value as string | undefined) ?? null;
}

export async function setCurrentCoupleId(id: string | null): Promise<void> {
  const db = await getDb();
  if (id === null) {
    await db.delete("meta", "currentCouple");
  } else {
    await db.put("meta", { key: "currentCouple", value: id });
  }
  emitChange("meta");
  emitChange("couples");
}

// ---- PIN gate (Clark + Angie only) ----
//
// Jonestown is a two-person app. Instead of the multi-couple onboarding
// flow, entry is gated by a shared PIN. Once a device has entered it the
// unlock is remembered in localStorage so we launch straight in next time.

const PIN_KEY = "jonestown:unlocked";

/** The shared PIN for the two of us. */
export const APP_PIN = "1985";

export function isUnlocked(): boolean {
  try {
    return localStorage.getItem(PIN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setUnlocked(value: boolean): void {
  try {
    if (value) localStorage.setItem(PIN_KEY, "1");
    else localStorage.removeItem(PIN_KEY);
  } catch {
    // localStorage unavailable (private mode etc.) — gate falls back to
    // asking for the PIN each load, which is acceptable.
  }
}

/**
 * Make sure the one-and-only Jonestown couple (Clark + Angie) exists, is
 * selected as current, and is seeded. Runs on unlock and on every launch
 * of an already-unlocked device. Idempotent.
 */
export async function bootstrapDefaultCouple(): Promise<void> {
  const existing = await getCouple(DEFAULT_COUPLE.id);
  if (!existing) {
    const now = Date.now();
    await saveCouple({ ...DEFAULT_COUPLE, createdAt: now, updatedAt: now });
  }
  const currentId = await getCurrentCoupleId();
  if (currentId !== DEFAULT_COUPLE.id) {
    await setCurrentCoupleId(DEFAULT_COUPLE.id);
  }
  await ensureSeeded(DEFAULT_COUPLE.id);
}

// ---- Restaurants ----

export async function listRestaurants(
  coupleId: string,
): Promise<Restaurant[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("restaurants", "coupleId", coupleId);
  const next = all
    .filter((r) => !r.hidden)
    .sort((a, b) => a.name.localeCompare(b.name));
  _cache.restaurants.set(_restKey(coupleId), next);
  return next;
}

export async function getRestaurant(
  id: string,
): Promise<Restaurant | undefined> {
  const db = await getDb();
  return db.get("restaurants", id);
}

export async function saveRestaurant(
  r: Omit<Restaurant, "createdAt" | "updatedAt"> & {
    createdAt?: number;
    updatedAt?: number;
  },
): Promise<Restaurant> {
  const db = await getDb();
  const now = Date.now();
  const existing = await db.get("restaurants", r.id);
  const next: Restaurant = {
    ...(existing ?? {}),
    ...r,
    createdAt: existing?.createdAt ?? r.createdAt ?? now,
    updatedAt: now,
  };
  // Optimistic: reflect in the in-memory cache and fire the change event
  // before awaiting the IDB write so any consumer that re-queries between
  // now and the IDB completion still sees the new record.
  _upsertRestaurantInCache(next);
  emitChange("restaurants");
  await db.put("restaurants", next);
  return next;
}

export async function hideRestaurant(id: string): Promise<void> {
  const db = await getDb();
  const r = await db.get("restaurants", id);
  if (!r) return;
  const next = { ...r, hidden: true, updatedAt: Date.now() };
  // Optimistic: hide locally before awaiting IDB.
  if (next.coupleId) {
    const key = _restKey(next.coupleId);
    const cur = _cache.restaurants.get(key);
    if (cur) _cache.restaurants.set(key, cur.filter((x) => x.id !== id));
  }
  emitChange("restaurants");
  await db.put("restaurants", next);
}

// ---- Visits ----

export async function listVisits(opts: {
  coupleId: string;
  restaurantId?: string;
}): Promise<Visit[]> {
  const db = await getDb();
  let all: Visit[];
  if (opts.restaurantId) {
    all = await db.getAllFromIndex(
      "visits",
      "restaurantId",
      opts.restaurantId,
    );
    all = all.filter((v) => v.coupleId === opts.coupleId);
  } else {
    all = await db.getAllFromIndex("visits", "coupleId", opts.coupleId);
  }
  const next = all.sort((a, b) => b.date - a.date);
  _cache.visits.set(_visitKey(opts.coupleId, opts.restaurantId), next);
  return next;
}

export async function saveVisit(visit: Visit): Promise<Visit> {
  const db = await getDb();
  _upsertVisitInCache(visit);
  emitChange("visits");
  await db.put("visits", visit);
  return visit;
}

export async function deleteVisit(id: string): Promise<void> {
  const db = await getDb();
  // Optimistic: remove from cache + emit before IDB tx so the UI updates
  // immediately. We collect dish ids inside the tx for cache cleanup.
  _removeVisitFromCache(id);
  const tx = db.transaction(["visits", "dishes", "photos"], "readwrite");
  const dishes = await tx
    .objectStore("dishes")
    .index("visitId")
    .getAll(id);
  for (const d of dishes) {
    if (d.photoId) await tx.objectStore("photos").delete(d.photoId);
    await tx.objectStore("dishes").delete(d.id);
    _removeDishFromCache(d.id);
  }
  await tx.objectStore("visits").delete(id);
  await tx.done;
  emitChange("visits");
  emitChange("dishes");
}

// ---- Dishes ----

export async function listDishes(opts: {
  coupleId: string;
  restaurantId?: string;
  visitId?: string;
}): Promise<Dish[]> {
  const db = await getDb();
  let all: Dish[];
  let next: Dish[];
  if (opts.visitId) {
    all = await db.getAllFromIndex("dishes", "visitId", opts.visitId);
    all = all.filter((d) => d.coupleId === opts.coupleId);
    next = all.sort((a, b) => a.createdAt - b.createdAt);
  } else if (opts.restaurantId) {
    all = await db.getAllFromIndex(
      "dishes",
      "restaurantId",
      opts.restaurantId,
    );
    all = all.filter((d) => d.coupleId === opts.coupleId);
    next = all.sort((a, b) => b.createdAt - a.createdAt);
  } else {
    all = await db.getAllFromIndex("dishes", "coupleId", opts.coupleId);
    next = all.sort((a, b) => b.createdAt - a.createdAt);
  }
  _cache.dishes.set(
    _dishKey(opts.coupleId, opts.restaurantId, opts.visitId),
    next,
  );
  return next;
}

export async function saveDish(dish: Dish): Promise<Dish> {
  const db = await getDb();
  _upsertDishInCache(dish);
  emitChange("dishes");
  await db.put("dishes", dish);
  return dish;
}

export async function deleteDish(id: string): Promise<void> {
  const db = await getDb();
  const dish = await db.get("dishes", id);
  if (!dish) return;
  _removeDishFromCache(id);
  emitChange("dishes");
  if (dish.photoId) await db.delete("photos", dish.photoId);
  await db.delete("dishes", id);
}

// ---- Photos ----

let onPhotoSaved: ((p: Photo) => void) | null = null;
let onPhotoMiss: ((id: string) => Promise<Blob | null>) | null = null;

export function registerPhotoHooks(hooks: {
  onPhotoSaved?: (p: Photo) => void;
  onPhotoMiss?: (id: string) => Promise<Blob | null>;
}): void {
  onPhotoSaved = hooks.onPhotoSaved ?? onPhotoSaved;
  onPhotoMiss = hooks.onPhotoMiss ?? onPhotoMiss;
}

export async function savePhoto(
  blob: Blob,
  coupleId: string,
): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const photo: Photo = { id, coupleId, blob, createdAt: Date.now() };
  await db.put("photos", photo);
  emitChange("photos");
  onPhotoSaved?.(photo);
  return id;
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  const db = await getDb();
  return db.get("photos", id);
}

const _photoUrlCache = new Map<string, string>();
const _photoFetchInflight = new Map<string, Promise<string | undefined>>();

export async function getPhotoUrl(id: string): Promise<string | undefined> {
  if (_photoUrlCache.has(id)) return _photoUrlCache.get(id);
  const photo = await getPhoto(id);
  if (photo) {
    const url = URL.createObjectURL(photo.blob);
    _photoUrlCache.set(id, url);
    return url;
  }
  if (onPhotoMiss) {
    const existing = _photoFetchInflight.get(id);
    if (existing) return existing;
    const promise = (async () => {
      const fetched = await onPhotoMiss!(id);
      if (!fetched) return undefined;
      const db = await getDb();
      await db.put("photos", { id, blob: fetched, createdAt: Date.now() });
      const url = URL.createObjectURL(fetched);
      _photoUrlCache.set(id, url);
      emitChange("photos");
      return url;
    })();
    _photoFetchInflight.set(id, promise);
    try {
      return await promise;
    } finally {
      _photoFetchInflight.delete(id);
    }
  }
  return undefined;
}

export function clearPhotoUrlCache() {
  for (const url of _photoUrlCache.values()) URL.revokeObjectURL(url);
  _photoUrlCache.clear();
}

// ---- User (member slot) preference ----

export async function getCurrentUser(): Promise<UserId> {
  const db = await getDb();
  const m = await db.get("meta", "currentUser");
  const v = m?.value as string | undefined;
  if (v === "clark") return "a";
  if (v === "angie") return "b";
  return (v as UserId) ?? "a";
}

export async function setCurrentUser(id: UserId): Promise<void> {
  const db = await getDb();
  await db.put("meta", { key: "currentUser", value: id });
  emitChange("meta");
}

// ---- Export / Import ----

export async function exportAll(coupleId: string): Promise<Blob> {
  const db = await getDb();
  const [restaurants, visits, dishes, photos, couple] = await Promise.all([
    db.getAllFromIndex("restaurants", "coupleId", coupleId),
    db.getAllFromIndex("visits", "coupleId", coupleId),
    db.getAllFromIndex("dishes", "coupleId", coupleId),
    db.getAll("photos").then((ps) =>
      ps.filter((p) => p.coupleId === coupleId),
    ),
    db.get("couples", coupleId),
  ]);
  const photoData = await Promise.all(
    photos.map(async (p) => ({
      id: p.id,
      width: p.width,
      height: p.height,
      createdAt: p.createdAt,
      base64: await blobToBase64(p.blob),
      type: p.blob.type,
    })),
  );
  const payload = {
    version: 2,
    exportedAt: Date.now(),
    couple,
    restaurants,
    visits,
    dishes,
    photos: photoData,
  };
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
