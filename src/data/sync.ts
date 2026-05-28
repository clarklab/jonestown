/**
 * Per-couple sync layer.
 *
 * - On startup, pull /api/state?slug=… and merge into IndexedDB by timestamp.
 * - On every local mutation, push the changed record (with current slug)
 *   to /api/state.
 * - Poll /api/state every POLL_MS to pick up partner mutations.
 * - Photos POST to /api/photo (multipart, includes slug) and are addressed
 *   by id thereafter.
 *
 * Sync is best-effort. If the API is unreachable (dev without netlify dev,
 * offline, etc.) the app keeps working from IndexedDB alone.
 */

import {
  emitChange,
  getCurrentCoupleId,
  getCouple,
  getDb,
  listDishes,
  listRestaurants,
  listVisits,
  onChange,
  registerPhotoHooks,
} from "./db";
import type { Dish, Photo, Restaurant, Visit } from "./types";

const POLL_MS = 30_000;
const PUSH_DEBOUNCE_MS = 800;

type RecordType = "restaurants" | "visits" | "dishes";

interface ServerState {
  slug: string;
  restaurants: Restaurant[];
  visits: Visit[];
  dishes: Dish[];
  serverTime: number;
}

let pushQueue = new Map<string, { table: RecordType; record: unknown }>();
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let lastServerTime = 0;
let syncEnabled = true;
let currentSlug: string | null = null;

const listeners = new Set<(state: SyncStatus) => void>();
const status: SyncStatus = {
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  lastPulledAt: 0,
  lastPushedAt: 0,
  inFlight: 0,
  reachable: true,
};

export interface SyncStatus {
  online: boolean;
  lastPulledAt: number;
  lastPushedAt: number;
  inFlight: number;
  reachable: boolean;
}

export function getStatus(): SyncStatus {
  return { ...status };
}

export function subscribeStatus(fn: (s: SyncStatus) => void): () => void {
  listeners.add(fn);
  fn({ ...status });
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn({ ...status });
}

async function refreshCurrentSlug(): Promise<string | null> {
  const id = await getCurrentCoupleId();
  if (!id) {
    currentSlug = null;
    return null;
  }
  const c = await getCouple(id);
  currentSlug = c?.slug ?? null;
  return currentSlug;
}

export function startSync(): () => void {
  if (typeof window === "undefined") return () => {};

  registerPhotoHooks({
    onPhotoSaved: (p) => void uploadPhotoToServer(p),
    onPhotoMiss: (id) => downloadPhotoFromServer(id),
  });

  const onlineHandler = () => {
    status.online = true;
    notify();
    void pull();
  };
  const offlineHandler = () => {
    status.online = false;
    notify();
  };
  window.addEventListener("online", onlineHandler);
  window.addEventListener("offline", offlineHandler);

  const unsubscribeChanges = onChange((table) => {
    if (table === "couples" || table === "meta") {
      void refreshCurrentSlug().then(() => void pull());
      return;
    }
    if (
      table === "restaurants" ||
      table === "visits" ||
      table === "dishes"
    ) {
      void enqueueAllOfTable(table as RecordType);
    }
  });

  void refreshCurrentSlug().then(() => void pull());
  pollTimer = setInterval(() => {
    if (status.online) void pull();
  }, POLL_MS);

  return () => {
    window.removeEventListener("online", onlineHandler);
    window.removeEventListener("offline", offlineHandler);
    unsubscribeChanges();
    if (pollTimer) clearInterval(pollTimer);
    if (pushTimer) clearTimeout(pushTimer);
  };
}

async function enqueueAllOfTable(table: RecordType) {
  const id = await getCurrentCoupleId();
  if (!id) return;
  let records: Array<{ id: string }> = [];
  if (table === "restaurants") records = await listRestaurants(id);
  else if (table === "visits") records = await listVisits({ coupleId: id });
  else records = await listDishes({ coupleId: id });
  for (const rec of records) {
    pushQueue.set(`${table}:${rec.id}`, { table, record: rec });
  }
  schedulePush();
}

function schedulePush() {
  if (!syncEnabled) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void flushPush();
  }, PUSH_DEBOUNCE_MS);
}

async function flushPush() {
  if (!status.online) return;
  if (pushQueue.size === 0) return;
  if (!currentSlug) await refreshCurrentSlug();
  if (!currentSlug) return;
  const batch = Array.from(pushQueue.values());
  pushQueue = new Map();
  status.inFlight += batch.length;
  notify();
  try {
    for (const item of batch) {
      const ok = await postRecord(currentSlug, item.table, item.record);
      if (!ok) {
        const id = (item.record as { id: string }).id;
        pushQueue.set(`${item.table}:${id}`, item);
      }
    }
    status.lastPushedAt = Date.now();
    status.reachable = true;
  } catch {
    status.reachable = false;
  } finally {
    status.inFlight = Math.max(0, status.inFlight - batch.length);
    notify();
  }
  if (pushQueue.size > 0) schedulePush();
}

async function postRecord(
  slug: string,
  table: RecordType,
  record: unknown,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/state?slug=${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ table, record }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function pull(): Promise<void> {
  if (!status.online) return;
  if (!currentSlug) await refreshCurrentSlug();
  if (!currentSlug) return;
  try {
    const res = await fetch(
      `/api/state?slug=${encodeURIComponent(currentSlug)}`,
      { method: "GET" },
    );
    if (!res.ok) {
      status.reachable = false;
      notify();
      return;
    }
    const state = (await res.json()) as ServerState;
    status.reachable = true;
    status.lastPulledAt = Date.now();
    notify();

    if (state.serverTime <= lastServerTime) return;
    lastServerTime = state.serverTime;

    await mergeIntoLocal(state);
  } catch {
    status.reachable = false;
    notify();
  }
}

async function mergeIntoLocal(remote: ServerState) {
  const db = await getDb();

  const txR = db.transaction("restaurants", "readwrite");
  let touchedR = false;
  for (const rr of remote.restaurants ?? []) {
    const local = await txR.objectStore("restaurants").get(rr.id);
    if (!local || (rr.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
      await txR.objectStore("restaurants").put(rr);
      touchedR = true;
    }
  }
  await txR.done;

  const txV = db.transaction("visits", "readwrite");
  let touchedV = false;
  for (const rv of remote.visits ?? []) {
    const local = await txV.objectStore("visits").get(rv.id);
    if (!local || rv.createdAt > local.createdAt) {
      await txV.objectStore("visits").put(rv);
      touchedV = true;
    }
  }
  await txV.done;

  const txD = db.transaction("dishes", "readwrite");
  let touchedD = false;
  for (const rd of remote.dishes ?? []) {
    const local = await txD.objectStore("dishes").get(rd.id);
    if (!local || rd.createdAt > local.createdAt) {
      await txD.objectStore("dishes").put(rd);
      touchedD = true;
    }
  }
  await txD.done;

  if (touchedR) emitChange("restaurants");
  if (touchedV) emitChange("visits");
  if (touchedD) emitChange("dishes");
}

/* ------------- Photos ------------- */

const photoUploadInflight = new Set<string>();

export async function uploadPhotoToServer(photo: Photo): Promise<boolean> {
  if (!status.online) return false;
  if (photoUploadInflight.has(photo.id)) return true;
  if (!currentSlug) await refreshCurrentSlug();
  if (!currentSlug) return false;
  photoUploadInflight.add(photo.id);
  status.inFlight += 1;
  notify();
  try {
    const form = new FormData();
    form.append("id", photo.id);
    form.append("slug", currentSlug);
    form.append("file", photo.blob, `${photo.id}.webp`);
    const res = await fetch("/api/photo", { method: "POST", body: form });
    return res.ok;
  } catch {
    return false;
  } finally {
    photoUploadInflight.delete(photo.id);
    status.inFlight = Math.max(0, status.inFlight - 1);
    notify();
  }
}

export async function downloadPhotoFromServer(
  id: string,
): Promise<Blob | null> {
  if (!currentSlug) await refreshCurrentSlug();
  const qs = currentSlug ? `?slug=${encodeURIComponent(currentSlug)}` : "";
  try {
    const res = await fetch(`/api/photo/${id}${qs}`);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

/* ------------- Couple claim ------------- */

/**
 * Try to claim a slug on the server. Returns true if claim succeeded,
 * false if the slug is taken. If the server is unreachable, treat as
 * "claimed locally" (true) — the app is still usable from this device.
 */
export async function claimCoupleOnServer(payload: {
  slug: string;
  name: string;
  town: string;
  members: unknown;
  badge: unknown;
}): Promise<{ ok: boolean; reason?: "taken" | "offline" }> {
  try {
    const res = await fetch("/api/couple/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.status === 409) return { ok: false, reason: "taken" };
    if (!res.ok) return { ok: true, reason: "offline" };
    return { ok: true };
  } catch {
    return { ok: true, reason: "offline" };
  }
}

/**
 * Look up a couple by slug on the server. Used by the join flow.
 */
export async function lookupCoupleOnServer(slug: string): Promise<{
  found: boolean;
  couple?: { slug: string; name: string; town: string; members: unknown; badge: unknown };
}> {
  try {
    const res = await fetch(
      `/api/couple/lookup?slug=${encodeURIComponent(slug)}`,
    );
    if (res.status === 404) return { found: false };
    if (!res.ok) return { found: false };
    const data = (await res.json()) as {
      slug: string;
      name: string;
      town: string;
      members: unknown;
      badge: unknown;
    };
    return { found: true, couple: data };
  } catch {
    return { found: false };
  }
}

export function disableSync() {
  syncEnabled = false;
}
