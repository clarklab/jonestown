import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "~/components/Header";
import { Icon } from "~/components/Icon";
import { PublicRatingChip } from "~/components/PublicRating";
import { useToast } from "~/components/Toast";
import { useCurrentCouple, useRestaurants } from "~/data/hooks";
import { saveRestaurant } from "~/data/db";
import { CATALOG_ENTRIES } from "~/data/seed";
import type { Restaurant } from "~/data/types";
import {
  DiscoveryMap,
  type DiscoverResult,
  type DiscoverState,
} from "~/components/DiscoveryMap";

type Filter = "missing" | "added" | "all";

/**
 * Admin page — the whole catalog as one big checklist. Lets you bulk-add
 * the spots you haven't put on the map yet. Bookmarkable URL only;
 * there's no nav link, so it stays out of the way.
 */
export function AdminPage() {
  const couple = useCurrentCouple();
  const existing = useRestaurants();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("missing");
  const [query, setQuery] = useState("");
  const [bulkInProgress, setBulkInProgress] = useState(false);

  const existingIds = useMemo(
    () => new Set(existing.map((r) => r.id)),
    [existing],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return CATALOG_ENTRIES.filter((c) => {
      if (filter === "missing" && existingIds.has(c.id)) return false;
      if (filter === "added" && !existingIds.has(c.id)) return false;
      if (q) {
        const hay =
          `${c.name} ${c.cuisine ?? ""} ${c.area ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filter, existingIds, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof CATALOG_ENTRIES> = {};
    for (const c of filtered) {
      const key = c.area ?? "Other";
      (groups[key] ||= []).push(c);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const missingCount = useMemo(
    () =>
      CATALOG_ENTRIES.filter((c) => !existingIds.has(c.id)).length,
    [existingIds],
  );

  const addOne = async (entry: (typeof CATALOG_ENTRIES)[number]) => {
    if (!couple) return;
    await saveRestaurant({ ...entry, coupleId: couple.id });
    toast.show(`${entry.name} added`, { icon: "add_location" });
  };

  const addAll = async () => {
    if (!couple) return;
    setBulkInProgress(true);
    let added = 0;
    for (const c of CATALOG_ENTRIES) {
      if (existingIds.has(c.id)) continue;
      await saveRestaurant({ ...c, coupleId: couple.id });
      added += 1;
    }
    setBulkInProgress(false);
    toast.show(
      added > 0
        ? `Added ${added} spot${added === 1 ? "" : "s"}`
        : "Everything's already on the map",
      { icon: "check_circle" },
    );
  };

  return (
    <div className="pb-12">
      <Header back title="Catalog" />

      <section className="px-4">
        <DiscoverySection
          existingIds={existingIds}
          catalogIds={
            new Set(CATALOG_ENTRIES.map((c) => c.id))
          }
        />

        <div className="mt-6 rounded-3xl bg-surface p-4 ring-1 ring-inset ring-line">
          <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
            Catalog
          </p>
          <h1 className="display-tight mt-1 text-[28px] leading-tight tracking-tight text-ink">
            Every spot we know about.
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Tap to add anything that should be on your map. Closed spots are
            already filtered out.
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-ink-muted">
              {existing.length} on map · {missingCount} in catalog · {CATALOG_ENTRIES.length} total
            </p>
            <button
              type="button"
              onClick={addAll}
              disabled={missingCount === 0 || bulkInProgress}
              className="pressable flex items-center gap-1.5 rounded-full bg-tennis-300 px-3 py-1.5 text-xs font-bold text-ink ring-1 ring-inset ring-tennis-500/30 disabled:opacity-40"
            >
              <Icon name="library_add" size={16} weight={300} color="currentColor" />
              {bulkInProgress ? "Adding…" : "Add all missing"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5 ring-1 ring-inset ring-line focus-within:ring-tennis-500/40">
          <Icon name="search" size={22} color="var(--color-ink-dim)" />
          <input
            type="search"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>

        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {(["missing", "added", "all"] as Filter[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`pressable shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 ring-inset transition-colors ${
                filter === k
                  ? "bg-tennis-300 text-ink ring-tennis-500/40"
                  : "bg-surface text-ink-muted ring-line"
              }`}
            >
              {k === "missing"
                ? `Missing (${CATALOG_ENTRIES.filter((c) => !existingIds.has(c.id)).length})`
                : k === "added"
                  ? `Added (${CATALOG_ENTRIES.filter((c) => existingIds.has(c.id)).length})`
                  : `All (${CATALOG_ENTRIES.length})`}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-5">
          {grouped.length === 0 ? (
            <div className="rounded-2xl bg-surface p-6 text-center ring-1 ring-inset ring-line">
              <Icon name="check_circle" size={28} variant="fill" color="var(--color-tennis-600)" />
              <p className="display mt-2 text-base text-ink">
                Nothing matches.
              </p>
            </div>
          ) : (
            grouped.map(([area, items]) => (
              <div key={area} className="flex flex-col gap-2">
                <p className="text-[11px] font-bold tracking-[0.22em] text-ink-dim uppercase px-1">
                  {area}
                </p>
                {items.map((c) => (
                  <Row
                    key={c.id}
                    entry={c}
                    added={existingIds.has(c.id)}
                    onAdd={() => void addOne(c)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Row({
  entry,
  added,
  onAdd,
}: {
  entry: (typeof CATALOG_ENTRIES)[number];
  added: boolean;
  onAdd: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-inset ring-line"
    >
      <div className="min-w-0 flex-1">
        <p className="display truncate text-base leading-tight text-ink">
          {entry.name}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {entry.cuisine ? (
            <span className="text-xs text-ink-dim">{entry.cuisine}</span>
          ) : null}
          {entry.publicRating ? (
            <PublicRatingChip rating={entry.publicRating} size="sm" />
          ) : null}
          <LinkChips links={entry.links} />
        </div>
        {entry.address ? (
          <p className="mt-0.5 truncate text-[11px] text-ink-faint">
            {entry.address}
          </p>
        ) : null}
      </div>
      {added ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-tennis-100 px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-tennis-800 uppercase ring-1 ring-inset ring-tennis-500/30">
          <Icon name="check" size={12} weight={300} color="currentColor" />
          On map
        </span>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${entry.name}`}
          className="pressable flex size-9 items-center justify-center rounded-full bg-tennis-300 text-ink ring-1 ring-inset ring-tennis-500/30"
        >
          <Icon name="add" size={20} weight={300} color="var(--color-ink)" />
        </button>
      )}
    </motion.div>
  );
}

function LinkChips({
  links,
}: {
  links: Restaurant["links"];
}) {
  if (!links) return null;
  const chips: Array<{ icon: string; label: string }> = [];
  if (links.google) chips.push({ icon: "place", label: "Google" });
  if (links.website) chips.push({ icon: "language", label: "Web" });
  if (links.order) chips.push({ icon: "delivery_dining", label: "Order" });
  if (!chips.length) return null;
  return (
    <span className="flex items-center gap-1">
      {chips.map((c) => (
        <span
          key={c.label}
          className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold tracking-tight text-ink-muted ring-1 ring-inset ring-line"
        >
          <Icon name={c.icon} size={10} color="currentColor" />
          {c.label}
        </span>
      ))}
    </span>
  );
}

/**
 * "Find more spots" — interactive Leaflet map + Overpass-backed scrape.
 * The visible map bounds become the search bbox when you tap Search.
 * Results display below as one-tap "Add to map" rows, de-duped against
 * what's already in the user's restaurants and the static catalog (by
 * slug match on the name, which is best-effort).
 */
function DiscoverySection({
  existingIds,
  catalogIds,
}: {
  existingIds: Set<string>;
  catalogIds: Set<string>;
}) {
  const couple = useCurrentCouple();
  const toast = useToast();
  const [state, setState] = useState<DiscoverState>({ phase: "idle" });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const search = async (bbox: string) => {
    setState({ phase: "loading", bbox });
    try {
      const res = await fetch(
        `/api/discover?bbox=${encodeURIComponent(bbox)}`,
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setState({
          phase: "error",
          bbox,
          message: body.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      const body = (await res.json()) as {
        bbox: string;
        count: number;
        results: DiscoverResult[];
      };
      setState({ phase: "loaded", bbox, results: body.results });
    } catch (err) {
      setState({
        phase: "error",
        bbox,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  /** A discovered result is "already on map" if its OSM id is in
   *  existingIds or we've already added it this session. We can't dedupe
   *  perfectly against the static catalog because the slugs differ, but
   *  name-based collision is a reasonable signal. */
  const isDuplicate = (r: DiscoverResult) => {
    if (existingIds.has(r.id) || addedIds.has(r.id)) return true;
    const slugified = slugify(r.name);
    if (catalogIds.has(slugified)) return true;
    if (existingIds.has(slugified)) return true;
    return false;
  };

  const addOne = async (r: DiscoverResult) => {
    if (!couple) return;
    const id = r.id;
    const newRestaurant = mapDiscoverToRestaurant(r);
    await saveRestaurant({ ...newRestaurant, coupleId: couple.id });
    setAddedIds((prev) => new Set(prev).add(id));
    toast.show(`${r.name} added`, { icon: "add_location" });
  };

  const addAll = async () => {
    if (!couple) return;
    if (state.phase !== "loaded") return;
    const queue = state.results.filter((r) => !isDuplicate(r));
    if (queue.length === 0) return;
    for (const r of queue) {
      const newRestaurant = mapDiscoverToRestaurant(r);
      await saveRestaurant({ ...newRestaurant, coupleId: couple.id });
    }
    setAddedIds((prev) => {
      const next = new Set(prev);
      for (const r of queue) next.add(r.id);
      return next;
    });
    toast.show(
      `Added ${queue.length} new spot${queue.length === 1 ? "" : "s"}`,
      { icon: "check_circle" },
    );
  };

  const newlyDiscovered =
    state.phase === "loaded"
      ? state.results.filter((r) => !isDuplicate(r))
      : [];
  const knownInArea =
    state.phase === "loaded"
      ? state.results.filter((r) => isDuplicate(r))
      : [];

  return (
    <div className="rounded-3xl bg-surface p-4 ring-1 ring-inset ring-line">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
            Discover
          </p>
          <h2 className="display-tight mt-1 text-[22px] leading-tight tracking-tight text-ink">
            Find more spots in town.
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Pan / zoom the map to where you want to look, then tap{" "}
            <span className="font-bold text-ink">Search this area</span>.
            We pull from OpenStreetMap — coverage depends on what
            volunteers have tagged.
          </p>
        </div>
      </div>

      <div className="mt-3 aspect-[5/4] w-full">
        <DiscoveryMap
          state={state}
          onSearch={search}
          excludeIds={
            new Set(
              state.phase === "loaded"
                ? state.results.filter(isDuplicate).map((r) => r.id)
                : [],
            )
          }
          highlightId={highlightId}
          onHighlight={setHighlightId}
          className="h-full w-full"
        />
      </div>

      {state.phase === "error" ? (
        <div className="mt-3 rounded-2xl bg-angie-50 px-3 py-2 text-sm font-medium text-angie-700 ring-1 ring-inset ring-angie-200">
          Couldn't reach Overpass — {state.message}. Try again in a sec.
        </div>
      ) : null}

      {state.phase === "loaded" ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
              {newlyDiscovered.length === 0
                ? "Nothing new in this area"
                : `${newlyDiscovered.length} new spot${
                    newlyDiscovered.length === 1 ? "" : "s"
                  }`}
            </p>
            {newlyDiscovered.length > 0 ? (
              <button
                type="button"
                onClick={addAll}
                className="pressable inline-flex items-center gap-1 rounded-full bg-tennis-300 px-2.5 py-1 text-[11px] font-bold text-ink ring-1 ring-inset ring-tennis-500/30"
              >
                <Icon name="library_add" size={13} weight={300} color="currentColor" />
                Add all
              </button>
            ) : null}
          </div>

          <AnimatePresence initial={false}>
            {newlyDiscovered.map((r) => (
              <DiscoveredRow
                key={r.id}
                result={r}
                onAdd={() => void addOne(r)}
                onHover={() => setHighlightId(r.id)}
                onLeave={() => setHighlightId(null)}
              />
            ))}
          </AnimatePresence>

          {knownInArea.length > 0 ? (
            <details className="rounded-2xl bg-surface-2 p-3 ring-1 ring-inset ring-line">
              <summary className="cursor-pointer text-[11px] font-bold tracking-wide text-ink-dim uppercase">
                {knownInArea.length} already on map
              </summary>
              <ul className="mt-2 flex flex-col gap-0.5">
                {knownInArea.map((r) => (
                  <li
                    key={r.id}
                    className="text-xs text-ink-faint"
                  >
                    · {r.name}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DiscoveredRow({
  result,
  onAdd,
  onHover,
  onLeave,
}: {
  result: DiscoverResult;
  onAdd: () => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="flex items-center gap-3 rounded-2xl bg-paper p-3 ring-1 ring-inset ring-line"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tennis-100 ring-1 ring-inset ring-tennis-500/20">
        <Icon
          name={amenityIcon(result.amenity)}
          size={20}
          variant="fill"
          color="var(--color-tennis-800)"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="display truncate text-base leading-tight text-ink">
          {result.name}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-ink-dim">
          {result.cuisine ? <span>{result.cuisine}</span> : null}
          {result.website ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold tracking-tight text-ink-muted ring-1 ring-inset ring-line">
              <Icon name="language" size={10} color="currentColor" />
              Web
            </span>
          ) : null}
          {result.phone ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold tracking-tight text-ink-muted ring-1 ring-inset ring-line">
              <Icon name="call" size={10} color="currentColor" />
              Phone
            </span>
          ) : null}
        </div>
        {result.address ? (
          <p className="mt-0.5 truncate text-[11px] text-ink-faint">
            {result.address}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onAdd}
        aria-label={`Add ${result.name}`}
        className="pressable flex size-9 items-center justify-center rounded-full bg-tennis-300 text-ink ring-1 ring-inset ring-tennis-500/30"
      >
        <Icon name="add" size={20} weight={300} color="var(--color-ink)" />
      </button>
    </motion.div>
  );
}

function amenityIcon(amenity: string): string {
  switch (amenity) {
    case "cafe":
      return "local_cafe";
    case "bar":
    case "pub":
      return "local_bar";
    case "fast_food":
      return "lunch_dining";
    case "ice_cream":
      return "icecream";
    case "food_court":
      return "ramen_dining";
    default:
      return "restaurant";
  }
}

function mapDiscoverToRestaurant(r: DiscoverResult): Omit<Restaurant, "createdAt" | "updatedAt"> {
  // Try to infer area from common Lake Travis towns; fall back to "Discovered".
  const lat = r.lat;
  const lon = r.lon;
  // crude bands; keeps Jonestown / Lago Vista / Lake Travis labels working
  const area =
    lat > 30.48 && lon < -97.92
      ? "Jonestown"
      : lat > 30.45 && lon < -97.92
        ? "Lago Vista"
        : "Lake Travis";
  return {
    id: r.id,
    name: r.name,
    cuisine: r.cuisine,
    area,
    address: r.address,
    phone: r.phone,
    links: r.website ? { website: r.website } : undefined,
  };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
