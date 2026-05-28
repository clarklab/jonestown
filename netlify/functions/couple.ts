import { getStore } from "@netlify/blobs";

/**
 * Couple registry. Two endpoints:
 *
 *   POST /api/couple/claim  body{ slug, name, town, members, badge }
 *     - 200 { ok: true } if slug was free and is now claimed
 *     - 409 { ok: false, reason: "taken" } if already exists
 *
 *   GET  /api/couple/lookup?slug=…
 *     - 200 { slug, name, town, members, badge } if found
 *     - 404 if not found
 */

interface CoupleRecord {
  slug: string;
  name: string;
  town: string;
  members: unknown;
  badge: unknown;
  claimedAt: number;
}

function getCoupleStore() {
  return getStore({ name: "jonestown-couples", consistency: "strong" });
}

function valid(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(slug);
}

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const action = segments[segments.length - 1];

  try {
    if (req.method === "POST" && action === "claim") {
      const body = (await req.json()) as CoupleRecord;
      if (!body.slug || !valid(body.slug)) {
        return json({ ok: false, reason: "invalid" }, 400);
      }
      const store = getCoupleStore();
      const existing = await store.get(body.slug, { type: "json" });
      if (existing) {
        return json({ ok: false, reason: "taken" }, 409);
      }
      await store.setJSON(body.slug, {
        slug: body.slug,
        name: body.name ?? "",
        town: body.town ?? "",
        members: body.members ?? [],
        badge: body.badge ?? null,
        claimedAt: Date.now(),
      });
      return json({ ok: true });
    }

    if (req.method === "GET" && action === "lookup") {
      const slug = url.searchParams.get("slug");
      if (!slug || !valid(slug)) {
        return json({ error: "invalid slug" }, 400);
      }
      const store = getCoupleStore();
      const existing = (await store.get(slug, { type: "json" })) as
        | CoupleRecord
        | null;
      if (!existing) return json({ error: "not found" }, 404);
      return json(existing);
    }

    return json({ error: "method not allowed" }, 405);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

export const config = { path: "/api/couple/*" };
