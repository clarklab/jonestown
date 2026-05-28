import { getStore } from "@netlify/blobs";

/**
 * Single-document state for the Jonestown two-person review club.
 *
 * GET  /api/state               → full state (restaurants, visits, dishes, photoIndex)
 * POST /api/state               → upsert a single record { table, record }
 * DELETE /api/state?table=…&id=…→ remove a record
 *
 * Records use `updatedAt` (restaurants) or `createdAt` (visits/dishes) for
 * last-write-wins merge on the client. The server is dumb — it just owns the
 * canonical bag.
 */

interface ServerState {
  restaurants: Array<Record<string, unknown> & { id: string; updatedAt?: number; hidden?: boolean }>;
  visits: Array<Record<string, unknown> & { id: string; createdAt: number }>;
  dishes: Array<Record<string, unknown> & { id: string; createdAt: number }>;
  serverTime: number;
}

const EMPTY: ServerState = {
  restaurants: [],
  visits: [],
  dishes: [],
  serverTime: 0,
};

function getStateStore() {
  return getStore({ name: "jonestown-state", consistency: "strong" });
}

async function readState(): Promise<ServerState> {
  const store = getStateStore();
  const json = await store.get("state.json", { type: "json" });
  if (!json) return EMPTY;
  return json as ServerState;
}

async function writeState(state: ServerState): Promise<void> {
  const store = getStateStore();
  await store.setJSON("state.json", { ...state, serverTime: Date.now() });
}

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  try {
    if (req.method === "GET") {
      const state = await readState();
      return jsonResponse(state);
    }

    if (req.method === "POST") {
      const body = (await req.json()) as {
        table: keyof ServerState;
        record: { id: string };
      };
      if (!body.table || !body.record?.id) {
        return jsonResponse({ error: "missing table/record" }, 400);
      }
      const state = await readState();
      const tableKey = body.table;
      if (tableKey === "serverTime") {
        return jsonResponse({ error: "invalid table" }, 400);
      }
      const list = (state[tableKey] ?? []) as Array<{ id: string }>;
      const idx = list.findIndex((r) => r.id === body.record.id);
      if (idx >= 0) {
        list[idx] = body.record;
      } else {
        list.push(body.record);
      }
      (state[tableKey] as unknown) = list;
      await writeState(state);
      return jsonResponse({ ok: true, serverTime: state.serverTime });
    }

    if (req.method === "DELETE") {
      const table = url.searchParams.get("table") as keyof ServerState | null;
      const id = url.searchParams.get("id");
      if (!table || !id || table === "serverTime") {
        return jsonResponse({ error: "missing table/id" }, 400);
      }
      const state = await readState();
      const list = state[table] as Array<{ id: string }>;
      const next = list.filter((r) => r.id !== id);
      (state[table] as unknown) = next;
      await writeState(state);
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
