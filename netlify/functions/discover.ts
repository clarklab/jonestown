import { getStore } from "@netlify/blobs";

/**
 * /api/discover?bbox=south,west,north,east
 *
 * Queries the public Overpass API (OpenStreetMap data) for any food-serving
 * amenity inside the given bbox and returns a normalized list. Free, no key
 * required, but coverage depends on OSM volunteers — for small towns it's
 * usually a few dozen entries at most.
 *
 * Results are cached for 24h in a Netlify Blob keyed by the bbox so repeated
 * "Search this area" presses don't hammer Overpass.
 */

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

interface DiscoverResult {
  /** Stable id derived from osm type+id so repeated discoveries dedupe. */
  id: string;
  name: string;
  lat: number;
  lon: number;
  amenity: string;
  cuisine?: string;
  address?: string;
  phone?: string;
  website?: string;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function getCache() {
  try {
    return getStore({ name: "jonestown-overpass", consistency: "eventual" });
  } catch {
    return null;
  }
}

function cacheKey(bbox: string) {
  return `bbox:${bbox}`;
}

function bboxValid(parts: string[]): parts is [string, string, string, string] {
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = Number(p);
    return Number.isFinite(n) && Math.abs(n) <= 180;
  });
}

function compactAddress(tags: Record<string, string>): string | undefined {
  const street = [tags["addr:housenumber"], tags["addr:street"]]
    .filter(Boolean)
    .join(" ");
  const cityZip = [tags["addr:city"], tags["addr:state"], tags["addr:postcode"]]
    .filter(Boolean)
    .join(" ");
  const full = [street, cityZip].filter(Boolean).join(", ");
  return full || undefined;
}

function prettyCuisine(raw: string | undefined, amenity: string): string {
  if (raw) {
    return raw
      .split(/[;,]/)
      .map((s) =>
        s
          .trim()
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      )
      .join(" · ");
  }
  switch (amenity) {
    case "cafe":
      return "Café";
    case "fast_food":
      return "Fast food";
    case "bar":
      return "Bar";
    case "pub":
      return "Pub";
    case "food_court":
      return "Food court";
    default:
      return "Restaurant";
  }
}

async function queryOverpass(bbox: string): Promise<OverpassElement[]> {
  // bbox in Overpass query is south,west,north,east — same order we accept.
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"~"^(restaurant|cafe|fast_food|bar|pub|food_court|ice_cream)$"](${bbox});
      way["amenity"~"^(restaurant|cafe|fast_food|bar|pub|food_court|ice_cream)$"](${bbox});
    );
    out tags center 200;
  `.trim();

  let lastError: string | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) {
        lastError = `${endpoint} → ${res.status}`;
        continue;
      }
      const json = (await res.json()) as { elements?: OverpassElement[] };
      return json.elements ?? [];
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`overpass unreachable: ${lastError ?? "unknown"}`);
}

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const bbox = url.searchParams.get("bbox");
  if (!bbox) {
    return json({ error: "missing bbox" }, 400);
  }
  const parts = bbox.split(",");
  if (!bboxValid(parts)) {
    return json({ error: "bbox must be south,west,north,east in degrees" }, 400);
  }

  // Cache first
  const cache = getCache();
  const key = cacheKey(bbox);
  if (cache) {
    try {
      const cached = await cache.get(key, { type: "json" });
      if (cached) return json(cached);
    } catch {
      // ignore cache failures
    }
  }

  try {
    const elements = await queryOverpass(bbox);
    const results: DiscoverResult[] = [];
    for (const el of elements) {
      const tags = el.tags ?? {};
      const name = tags.name?.trim();
      if (!name) continue;
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat === undefined || lon === undefined) continue;
      results.push({
        id: `osm-${el.type[0]}${el.id}`,
        name,
        lat,
        lon,
        amenity: tags.amenity ?? "restaurant",
        cuisine: prettyCuisine(tags.cuisine, tags.amenity ?? "restaurant"),
        address: compactAddress(tags),
        phone: tags.phone || tags["contact:phone"] || undefined,
        website:
          tags.website || tags["contact:website"] || tags.url || undefined,
      });
    }
    // De-dupe by name + nearby lat/lon (handles OSM having both a node and a way)
    const seen = new Map<string, DiscoverResult>();
    for (const r of results) {
      const dedupeKey = `${r.name.toLowerCase()}::${r.lat.toFixed(4)}::${r.lon.toFixed(4)}`;
      if (!seen.has(dedupeKey)) seen.set(dedupeKey, r);
    }
    const deduped = Array.from(seen.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const payload = { bbox, count: deduped.length, results: deduped };

    if (cache) {
      try {
        await cache.setJSON(key, payload, {
          metadata: { cachedAt: Date.now() },
        });
      } catch {
        // ignore cache write failure
      }
    }

    return json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 502);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "private, max-age=120",
    },
  });
}

export const config = { path: "/api/discover" };
