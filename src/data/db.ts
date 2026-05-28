import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { Dish, Photo, Restaurant, UserId, Visit } from "./types";
import { SEED_RESTAURANTS } from "./seed";

interface JonestownDB extends DBSchema {
  restaurants: {
    key: string;
    value: Restaurant;
    indexes: { name: string };
  };
  visits: {
    key: string;
    value: Visit;
    indexes: { restaurantId: string; userId: UserId; date: number };
  };
  dishes: {
    key: string;
    value: Dish;
    indexes: { visitId: string; restaurantId: string; userId: UserId };
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
const DB_VERSION = 1;

let _dbPromise: Promise<IDBPDatabase<JonestownDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<JonestownDB>> {
  if (!_dbPromise) {
    _dbPromise = openDB<JonestownDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("restaurants")) {
          const store = db.createObjectStore("restaurants", { keyPath: "id" });
          store.createIndex("name", "name");
        }
        if (!db.objectStoreNames.contains("visits")) {
          const store = db.createObjectStore("visits", { keyPath: "id" });
          store.createIndex("restaurantId", "restaurantId");
          store.createIndex("userId", "userId");
          store.createIndex("date", "date");
        }
        if (!db.objectStoreNames.contains("dishes")) {
          const store = db.createObjectStore("dishes", { keyPath: "id" });
          store.createIndex("visitId", "visitId");
          store.createIndex("restaurantId", "restaurantId");
          store.createIndex("userId", "userId");
        }
        if (!db.objectStoreNames.contains("photos")) {
          db.createObjectStore("photos", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
    });
  }
  return _dbPromise;
}

export async function ensureSeeded(): Promise<void> {
  const db = await getDb();
  const seededFlag = await db.get("meta", "seeded:v1");
  if (seededFlag) return;
  const tx = db.transaction(["restaurants", "meta"], "readwrite");
  const now = Date.now();
  for (const r of SEED_RESTAURANTS) {
    await tx.objectStore("restaurants").put({
      ...r,
      createdAt: now,
      updatedAt: now,
    });
  }
  await tx.objectStore("meta").put({ key: "seeded:v1", value: true });
  await tx.done;
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

// ---- Restaurants ----

export async function listRestaurants(): Promise<Restaurant[]> {
  const db = await getDb();
  const all = await db.getAll("restaurants");
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

export async function listVisits(restaurantId?: string): Promise<Visit[]> {
  const db = await getDb();
  const all = restaurantId
    ? await db.getAllFromIndex("visits", "restaurantId", restaurantId)
    : await db.getAll("visits");
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

export async function listDishes(filter?: {
  restaurantId?: string;
  visitId?: string;
}): Promise<Dish[]> {
  const db = await getDb();
  if (filter?.visitId) {
    const dishes = await db.getAllFromIndex(
      "dishes",
      "visitId",
      filter.visitId,
    );
    return dishes.sort((a, b) => a.createdAt - b.createdAt);
  }
  if (filter?.restaurantId) {
    const dishes = await db.getAllFromIndex(
      "dishes",
      "restaurantId",
      filter.restaurantId,
    );
    return dishes.sort((a, b) => b.createdAt - a.createdAt);
  }
  const all = await db.getAll("dishes");
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

// Optional sync hooks — wired up by sync.ts. Keeps db.ts free of server deps.
let onPhotoSaved: ((p: Photo) => void) | null = null;
let onPhotoMiss: ((id: string) => Promise<Blob | null>) | null = null;

export function registerPhotoHooks(hooks: {
  onPhotoSaved?: (p: Photo) => void;
  onPhotoMiss?: (id: string) => Promise<Blob | null>;
}): void {
  onPhotoSaved = hooks.onPhotoSaved ?? onPhotoSaved;
  onPhotoMiss = hooks.onPhotoMiss ?? onPhotoMiss;
}

export async function savePhoto(blob: Blob): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const photo: Photo = { id, blob, createdAt: Date.now() };
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
  // Local miss — see if a sync hook can pull it
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

// ---- User preference ----

export async function getCurrentUser(): Promise<UserId> {
  const db = await getDb();
  const m = await db.get("meta", "currentUser");
  return ((m?.value as UserId) ?? "clark") as UserId;
}

export async function setCurrentUser(id: UserId): Promise<void> {
  const db = await getDb();
  await db.put("meta", { key: "currentUser", value: id });
  emitChange("meta");
}

// ---- Export / Import ----

export async function exportAll(): Promise<Blob> {
  const db = await getDb();
  const [restaurants, visits, dishes, photos] = await Promise.all([
    db.getAll("restaurants"),
    db.getAll("visits"),
    db.getAll("dishes"),
    db.getAll("photos"),
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
    version: 1,
    exportedAt: Date.now(),
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
