import { getStore } from "@netlify/blobs";

/**
 * Per-couple state document. Each couple's state lives at `state-{slug}.json`
 * in the `jonestown-state` blob store. All requests must carry `?slug=…`.
 *
 *   GET  /api/state?slug=…            → full state for that couple
 *   POST /api/state?slug=… body{table,record}  → upsert a single record
 *   DELETE /api/state?slug=…&table=…&id=…      → remove a record
 */

interface ServerState {
  slug: string;
  restaurants: Array<
    Record<string, unknown> & { id: string; updatedAt?: number }
  >;
  visits: Array<Record<string, unknown> & { id: string; createdAt: number }>;
  dishes: Array<Record<string, unknown> & { id: string; createdAt: number }>;
  serverTime: number;
}

function emptyState(slug: string): ServerState {
  return {
    slug,
    restaurants: [],
    visits: [],
    dishes: [],
    serverTime: 0,
  };
}

function getStateStore() {
  return getStore({ name: "jonestown-state", consistency: "strong" });
}

function key(slug: string) {
  return `state-${slug}.json`;
}

async function readState(slug: string): Promise<ServerState> {
  const store = getStateStore();
  const json = await store.get(key(slug), { type: "json" });
  if (!json) return emptyState(slug);
  const state = json as ServerState;
  state.slug = slug;
  return state;
}

async function writeState(slug: string, state: ServerState): Promise<void> {
  const store = getStateStore();
  await store.setJSON(key(slug), {
    ...state,
    slug,
    serverTime: Date.now(),
  });
}

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug || !/^[a-z0-9-]{2,48}$/.test(slug)) {
    return jsonResponse({ error: "missing or invalid slug" }, 400);
  }

  try {
    if (req.method === "GET") {
      const state = await readState(slug);
      return jsonResponse(state);
    }

    if (req.method === "POST") {
      const body = (await req.json()) as {
        table: "restaurants" | "visits" | "dishes";
        record: Record<string, unknown> & { id: string };
      };
      if (!body.table || !body.record?.id) {
        return jsonResponse({ error: "missing table/record" }, 400);
      }
      const state = await readState(slug);
      if (
        body.table !== "restaurants" &&
        body.table !== "visits" &&
        body.table !== "dishes"
      ) {
        return jsonResponse({ error: "invalid table" }, 400);
      }
      const list = (state[body.table] ?? []) as Array<
        Record<string, unknown> & { id: string }
      >;
      const idx = list.findIndex((r) => r.id === body.record.id);
      if (idx >= 0) {
        // Stale-write guard: refuse to overwrite a newer record with an
        // older one. Restaurants use updatedAt; visits/dishes use createdAt.
        const existing = list[idx];
        const tsField = body.table === "restaurants" ? "updatedAt" : "createdAt";
        const existingTs = Number(existing[tsField] ?? 0);
        const incomingTs = Number(body.record[tsField] ?? 0);
        if (existingTs > 0 && incomingTs > 0 && incomingTs < existingTs) {
          return jsonResponse(
            { ok: false, reason: "stale", existingTs, incomingTs },
            409,
          );
        }
        list[idx] = body.record;
      } else {
        list.push(body.record);
      }
      (state[body.table] as unknown) = list;
      await writeState(slug, state);
      return jsonResponse({ ok: true, serverTime: state.serverTime });
    }

    if (req.method === "DELETE") {
      const table = url.searchParams.get("table") as
        | "restaurants"
        | "visits"
        | "dishes"
        | null;
      const id = url.searchParams.get("id");
      if (!table || !id) {
        return jsonResponse({ error: "missing table/id" }, 400);
      }
      const state = await readState(slug);
      const list = state[table] as Array<{ id: string }>;
      (state[table] as unknown) = list.filter((r) => r.id !== id);
      await writeState(slug, state);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "method not allowed" }, 405);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 500);
  }
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

export const config = { path: "/api/state" };
