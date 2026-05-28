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
 */
export async function migrateLegacyData(): Promise<void> {
  const db = await getDb();
  const migrationFlag = await db.get("meta", "migrated:v2");
  if (migrationFlag) return;

  // Ensure default couple exists
  const existingDefault = await db.get("couples", DEFAULT_COUPLE.id);
  if (!existingDefault) {
    const now = Date.now();
    await db.put("couples", {
      ...DEFAULT_COUPLE,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Tag legacy records onto the default couple, and map clark/angie -> a/b.
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

  // If a currentUser was stored as "clark"/"angie", remap it.
  const cu = await tx.objectStore("meta").get("currentUser");
  if (cu?.value === "clark" || cu?.value === "angie") {
    await tx
      .objectStore("meta")
      .put({ key: "currentUser", value: remap(cu.value as string) });
  }

  await tx.objectStore("meta").put({ key: "migrated:v2", value: true });
  await tx.done;
  emitChange("couples");
}

export async function ensureSeeded(coupleId: string): Promise<void> {
  const db = await getDb();
  const seedKey = `seeded:${coupleId}`;
  const seededFlag = await db.get("meta", seedKey);
  if (seededFlag) return;
  const tx = db.transaction(["restaurants", "meta"], "readwrite");
  const now = Date.now();
  for (const r of SEED_RESTAURANTS) {
    const id =
      coupleId === DEFAULT_COUPLE.id ? r.id : `${coupleId}:${r.id}`;
    await tx.objectStore("restaurants").put({
      ...r,
      id,
      coupleId,
      createdAt: now,
      updatedAt: now,
    });
  }
  await tx.objectStore("meta").put({ key: seedKey, value: true });
  await tx.done;
  emitChange("restaurants");
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

// ---- Restaurants ----

export async function listRestaurants(
  coupleId: string,
): Promise<Restaurant[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("restaurants", "coupleId", coupleId);
  return all
    .filter((r) => !r.hidden)
    .sort((a, b) => a.name.localeCompare(b.name));
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
  await db.put("restaurants", next);
  emitChange("restaurants");
  return next;
}

export async function hideRestaurant(id: string): Promise<void> {
  const db = await getDb();
  const r = await db.get("restaurants", id);
  if (!r) return;
  await db.put("restaurants", { ...r, hidden: true, updatedAt: Date.now() });
  emitChange("restaurants");
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
  return all.sort((a, b) => b.date - a.date);
}

export async function saveVisit(visit: Visit): Promise<Visit> {
  const db = await getDb();
  await db.put("visits", visit);
  emitChange("visits");
  return visit;
}

export async function deleteVisit(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["visits", "dishes", "photos"], "readwrite");
  const dishes = await tx
    .objectStore("dishes")
    .index("visitId")
    .getAll(id);
  for (const d of dishes) {
    if (d.photoId) await tx.objectStore("photos").delete(d.photoId);
    await tx.objectStore("dishes").delete(d.id);
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
  if (opts.visitId) {
    all = await db.getAllFromIndex("dishes", "visitId", opts.visitId);
    all = all.filter((d) => d.coupleId === opts.coupleId);
    return all.sort((a, b) => a.createdAt - b.createdAt);
  }
  if (opts.restaurantId) {
    all = await db.getAllFromIndex(
      "dishes",
      "restaurantId",
      opts.restaurantId,
    );
    all = all.filter((d) => d.coupleId === opts.coupleId);
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }
  all = await db.getAllFromIndex("dishes", "coupleId", opts.coupleId);
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveDish(dish: Dish): Promise<Dish> {
  const db = await getDb();
  await db.put("dishes", dish);
  emitChange("dishes");
  return dish;
}

export async function deleteDish(id: string): Promise<void> {
  const db = await getDb();
  const dish = await db.get("dishes", id);
  if (!dish) return;
  if (dish.photoId) await db.delete("photos", dish.photoId);
  await db.delete("dishes", id);
  emitChange("dishes");
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
