import { useMemo, useState } from "react";
import { motion } from "framer-motion";
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
  formatPolygonForClaude,
  polygonCentroid,
  type Vertex,
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
      <Header back="/me" title="Catalog" />

      <section className="px-4">
        <DiscoverySection />

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
 * "Send bounds to Claude" — pan/zoom a Leaflet map to frame the area you
 * want investigated, copy the resulting bounding box (plus an OSM + Google
 * Maps link, plus a prompt template) to the clipboard, and paste it into
 * a chat with Claude. Claude does the actual research pass and pushes a
 * catalog update.
 *
 * No live API call — the live Overpass query was nice but the curated
 * catalog (built by Claude during a chat session) is higher quality.
 */
function DiscoverySection() {
  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const ready = vertices.length >= 3;
  const center = polygonCentroid(vertices);

  const handleAdd = (v: Vertex) => {
    setVertices((vs) => [...vs, v]);
  };
  const handleUndo = () => {
    setVertices((vs) => vs.slice(0, -1));
  };
  const handleClear = () => {
    setVertices([]);
  };
  const handleCopy = async () => {
    if (!ready) return;
    const text = formatPolygonForClaude(vertices);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.show("Polygon copied — paste in chat with Claude", {
        icon: "content_copy",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.show("Clipboard blocked — copy from the preview below", {
        icon: "warning",
      });
    }
  };

  return (
    <div className="rounded-3xl bg-surface p-4 ring-1 ring-inset ring-line">
      <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
        Discover
      </p>
      <h2 className="display-tight mt-1 text-[22px] leading-tight tracking-tight text-ink">
        Find more spots in town.
      </h2>
      <p className="mt-1 text-xs text-ink-muted">
        Tap the map to draw a polygon around the area you want researched —
        wrap it around the lake / your side of the river / whatever shape
        fits. Three corners minimum. Then copy and paste it to Claude.
      </p>

      <div className="mt-3 aspect-[5/4] w-full">
        <DiscoveryMap
          vertices={vertices}
          onVertexAdd={handleAdd}
          className="h-full w-full"
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleUndo}
          disabled={vertices.length === 0}
          className="pressable inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 text-xs font-bold text-ink ring-1 ring-inset ring-line disabled:opacity-40"
        >
          <Icon name="undo" size={14} weight={300} color="currentColor" />
          Undo
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={vertices.length === 0}
          className="pressable inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 text-xs font-bold text-ink ring-1 ring-inset ring-line disabled:opacity-40"
        >
          <Icon name="restart_alt" size={14} weight={300} color="currentColor" />
          Clear
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!ready}
          className="pressable ml-auto inline-flex items-center gap-1.5 rounded-full bg-tennis-300 px-3 py-2 text-xs font-bold text-ink ring-1 ring-inset ring-tennis-500/30 disabled:opacity-40"
        >
          <Icon
            name={copied ? "check" : "content_copy"}
            size={14}
            weight={300}
            color="var(--color-ink)"
          />
          {copied ? "Copied" : "Copy for Claude"}
        </button>
      </div>

      <div className="mt-3 rounded-2xl bg-surface-2 p-3 ring-1 ring-inset ring-line">
        <p className="text-[10px] font-bold tracking-[0.18em] text-ink-dim uppercase">
          Current polygon
        </p>
        {vertices.length === 0 ? (
          <p className="mt-1 text-[11px] text-ink-faint">
            Tap the map to drop your first corner.
          </p>
        ) : (
          <>
            <p className="mt-0.5 font-mono text-[11px] text-ink">
              {vertices.length} corner{vertices.length === 1 ? "" : "s"}
              {center
                ? ` · center ${center.lat}, ${center.lng}`
                : ""}
            </p>
            {!ready ? (
              <p className="mt-0.5 text-[10px] text-ink-faint">
                Need at least 3 to make a shape.
              </p>
            ) : null}
            <details className="mt-2 group">
              <summary className="cursor-pointer list-none text-[10px] font-bold tracking-wide text-ink-dim uppercase group-open:text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <Icon
                    name="chevron_right"
                    size={12}
                    color="currentColor"
                    className="transition-transform group-open:rotate-90"
                  />
                  Preview message
                </span>
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-ink p-2.5 font-mono text-[10px] leading-snug whitespace-pre-wrap text-paper/90">
                {ready
                  ? formatPolygonForClaude(vertices)
                  : "Add at least one more corner."}
              </pre>
            </details>
          </>
        )}
      </div>
    </div>
  );
}

