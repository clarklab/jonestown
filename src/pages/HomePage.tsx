import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Header } from "~/components/Header";
import { Icon } from "~/components/Icon";
import { CoupleBadge } from "~/components/UserChip";
import { RestaurantCard } from "~/components/RestaurantCard";
import { ShuffleModal } from "~/components/ShuffleModal";
import { TownMap } from "~/components/TownMap";
import { useAggregates, useCurrentCouple } from "~/data/hooks";
import type { RestaurantAggregate, VerdictStatus } from "~/data/types";

type SortKey =
  | "all"
  | "locked"
  | "solo"
  | "unanimous"
  | "divided"
  | "top"
  | "recent";

const SORT_LABELS: Record<SortKey, string> = {
  all: "All",
  locked: "Locked",
  solo: "Half-lit",
  unanimous: "Unanimous",
  divided: "Divided",
  top: "Top",
  recent: "Recent",
};

export function HomePage() {
  const couple = useCurrentCouple();
  const aggs = useAggregates();
  const [sort, setSort] = useState<SortKey>("all");
  const [query, setQuery] = useState("");
  const [shuffleOpen, setShuffleOpen] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");

  const filtered = useMemo(() => {
    let list = [...aggs.list];
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.restaurant.name.toLowerCase().includes(q) ||
          a.restaurant.cuisine?.toLowerCase().includes(q) ||
          a.restaurant.area?.toLowerCase().includes(q),
      );
    }
    list = applySort(list, sort);
    return list;
  }, [aggs.list, sort, query]);

  return (
    <div className="relative">
      <Header transparent />

      {/* Map hero */}
      <section className="relative isolate -mt-16 px-4 pt-20 pb-4">
        <div className="relative overflow-hidden rounded-[28px] bg-surface ring-1 ring-line shadow-[0_30px_80px_-30px_oklch(0_0_0_/_0.2)]">
          <TownMap aggregates={aggs.list} className="h-[440px] w-full" />

          {/* Floating progress meter */}
          <div className="absolute top-4 left-4 right-4 flex items-center gap-2">
            <ProgressChip
              unlocked={aggs.bothRatedCount}
              total={aggs.totalCount}
            />
            <div className="ml-auto flex items-center gap-1.5 rounded-full bg-paper/85 py-1 pr-2.5 pl-1 backdrop-blur-md ring-1 ring-inset ring-line">
              <CoupleBadge size="sm" />
              <span className="text-[10px] font-bold tracking-[0.16em] text-ink-muted uppercase">
                {couple?.town?.split(",").pop()?.trim() || "Your town"}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
            <LegendChip color="oklch(0 0 0 / 0.55)" label="Locked" />
            <LegendChip color="oklch(0.95 0.06 60)" label="1 fork" border="oklch(0.6 0.18 100)" />
            <LegendChip
              color="var(--color-tennis-300)"
              label="Both ★"
              border="oklch(0.7 0.21 122)"
            />
            <LegendChip
              color="oklch(0.93 0.14 25)"
              label="Divided"
              border="oklch(0.55 0.21 25)"
            />
          </div>

          {aggs.bothRatedCount === 0 &&
          aggs.list.filter((a) => a.verdict.status === "solo").length === 0 ? (
            <MapEmptyNudge />
          ) : null}
        </div>

        {/* Big tagline */}
        <div className="mt-5">
          <p className="text-[11px] font-bold tracking-[0.22em] text-ink-dim uppercase">
            {couple?.town ?? "Your town"}
          </p>
          <h1 className="display-tight mt-1 text-[40px] leading-[0.95] tracking-tight text-balance text-ink">
            Eat the whole map.
          </h1>
          <p className="mt-2 max-w-[40ch] text-pretty text-sm text-ink-muted">
            Every restaurant in town is a fog tile. Both of you have to rate
            it before it unlocks. Find them. Argue about them.
          </p>
        </div>

        <BigProgressMeter
          unlocked={aggs.bothRatedCount}
          solo={aggs.list.filter((a) => a.verdict.status === "solo").length}
          total={aggs.totalCount}
        />

        <ShuffleCTA onOpen={() => setShuffleOpen(true)} />
      </section>

      {/* Search + filter */}
      <section className="px-4">
        <div className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5 ring-1 ring-inset ring-line">
          <Icon name="search" size={22} color="var(--color-ink-dim)" />
          <input
            type="search"
            name="q"
            placeholder="Search restaurants, cuisine, area…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
            className="w-full bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <ViewToggle view={view} onChange={setView} />
        </div>

        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSort(k)}
              className={`pressable shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 ring-inset transition-colors ${
                sort === k
                  ? "bg-tennis-300 text-ink ring-tennis-500/40"
                  : "bg-surface text-ink-muted ring-line"
              }`}
            >
              {SORT_LABELS[k]}
            </button>
          ))}
        </div>
      </section>

      {/* List */}
      <section className="mt-4 flex flex-col gap-2.5 px-4">
        {filtered.length === 0 ? (
          <EmptyState query={query} />
        ) : (
          filtered.map((agg) => (
            <RestaurantCard key={agg.restaurant.id} agg={agg} />
          ))
        )}
      </section>

      <section className="mx-4 mt-5 mb-2">
        <Link
          to="/add/restaurant"
          className="pressable group flex items-center gap-3 rounded-3xl bg-surface p-4 ring-1 ring-inset ring-line"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-tennis-200 ring-1 ring-inset ring-tennis-500/30">
            <Icon name="add" size={26} weight={700} color="var(--color-ink)" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-ink">Add a restaurant</p>
            <p className="text-xs text-ink-dim">
              Something new opens? Drop it on the map.
            </p>
          </div>
        </Link>
      </section>

      <ShuffleModal
        open={shuffleOpen}
        onClose={() => setShuffleOpen(false)}
      />
    </div>
  );
}

function ShuffleCTA({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="pressable group relative mt-3 flex w-full items-center gap-3 overflow-hidden rounded-3xl bg-tennis-300 p-4 text-left ring-1 ring-inset ring-tennis-500/30 shadow-[0_22px_50px_-20px_oklch(0.7_0.2_120_/_0.45)]"
    >
      <motion.div
        aria-hidden="true"
        animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
        transition={{
          duration: 1.6,
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: 3.5,
        }}
        className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-paper ring-1 ring-inset ring-black/5"
      >
        <Icon name="casino" size={26} variant="fill" weight={700} color="var(--color-ink)" />
      </motion.div>
      <div className="min-w-0 flex-1">
        <p className="display-tight text-[20px] leading-tight text-ink">
          Can't pick? Roll for it.
        </p>
        <p className="text-xs font-medium text-ink/70">
          We'll spin a spot you haven't tried yet.
        </p>
      </div>
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-full bg-paper/70 ring-1 ring-inset ring-black/5"
      >
        <Icon name="arrow_forward" size={20} weight={700} color="var(--color-ink)" />
      </span>
    </button>
  );
}

function applySort(list: RestaurantAggregate[], sort: SortKey) {
  switch (sort) {
    case "locked":
      return list.filter((a) => a.verdict.status === "locked");
    case "solo":
      return list.filter((a) => a.verdict.status === "solo");
    case "unanimous":
      return list.filter((a) => a.verdict.status === "unanimous");
    case "divided":
      return list.filter(
        (a) =>
          a.verdict.status === "divided" || a.verdict.status === "split",
      );
    case "top":
      return [...list].sort(
        (a, b) =>
          (b.combinedRating ?? -1) - (a.combinedRating ?? -1) ||
          a.restaurant.name.localeCompare(b.restaurant.name),
      );
    case "recent":
      return [...list].sort(
        (a, b) => (b.lastVisit ?? 0) - (a.lastVisit ?? 0),
      );
    case "all":
    default:
      return [...list].sort((a, b) => {
        const order: Record<VerdictStatus, number> = {
          unanimous: 0,
          split: 1,
          divided: 2,
          solo: 3,
          locked: 4,
        };
        return (
          order[a.verdict.status] - order[b.verdict.status] ||
          a.restaurant.name.localeCompare(b.restaurant.name)
        );
      });
  }
}

function MapEmptyNudge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 24, delay: 0.3 }}
      className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 rounded-2xl bg-paper/90 px-4 py-3 text-center backdrop-blur-md ring-1 ring-inset ring-line shadow-[0_18px_40px_-12px_oklch(0_0_0_/_0.18)]"
    >
      <div className="flex size-9 items-center justify-center rounded-full bg-tennis-300">
        <Icon name="my_location" size={20} variant="fill" weight={600} color="var(--color-ink)" />
      </div>
      <p className="display-tight text-base text-ink">
        Your town's still fogged in.
      </p>
      <p className="max-w-[28ch] text-xs text-ink-muted">
        Tap the big{" "}
        <span className="inline-flex size-4 -translate-y-px items-center justify-center rounded-full bg-tennis-300">
          <Icon name="add" size={12} weight={700} color="var(--color-ink)" />
        </span>{" "}
        to log your first visit. Pins unlock as you both rate.
      </p>
    </motion.div>
  );
}

function ProgressChip({
  unlocked,
  total,
}: {
  unlocked: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-paper/85 py-1 pr-3 pl-1 backdrop-blur-md ring-1 ring-inset ring-line">
      <span className="flex size-7 items-center justify-center rounded-full bg-tennis-300 text-[11px] font-bold text-ink">
        {unlocked}
      </span>
      <span className="text-[11px] font-bold tracking-wide text-ink-muted">
        of {total} unlocked
      </span>
    </div>
  );
}

function LegendChip({
  color,
  label,
  border,
}: {
  color: string;
  label: string;
  border?: string;
}) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-paper/85 px-2 py-0.5 text-[10px] font-bold tracking-wide text-ink-muted backdrop-blur-md ring-1 ring-inset ring-line">
      <span
        className="size-2.5 rounded-full"
        style={{
          background: color,
          boxShadow: border ? `inset 0 0 0 1.5px ${border}` : undefined,
        }}
      />
      {label}
    </span>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: "map" | "list";
  onChange: (v: "map" | "list") => void;
}) {
  return (
    <div className="flex rounded-full bg-surface-2 p-0.5 ring-1 ring-inset ring-line">
      {(["map", "list"] as const).map((v) => {
        const active = view === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-label={`${v} view`}
            className={`pressable relative flex size-7 items-center justify-center rounded-full ${active ? "bg-paper shadow-sm" : ""}`}
          >
            <Icon name={v === "map" ? "map" : "grid_view"} size={18} color="currentColor" />
          </button>
        );
      })}
    </div>
  );
}

function BigProgressMeter({
  unlocked,
  solo,
  total,
}: {
  unlocked: number;
  solo: number;
  total: number;
}) {
  const pctUnlocked = total ? (unlocked / total) * 100 : 0;
  const pctSolo = total ? (solo / total) * 100 : 0;
  const remaining = total - unlocked - solo;

  return (
    <div className="mt-5 rounded-3xl bg-surface p-4 ring-1 ring-inset ring-line">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-ink-dim uppercase">
            Town progress
          </p>
          <p className="display-tight mt-1 text-3xl tabular-nums text-ink">
            {unlocked}
            <span className="text-ink-faint">/{total}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold tracking-[0.22em] text-ink-dim uppercase">
            Still hidden
          </p>
          <p className="display-tight mt-1 text-3xl tabular-nums text-ink-faint">
            {remaining}
          </p>
        </div>
      </div>
      <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-line">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctUnlocked}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.1 }}
          className="absolute inset-y-0 left-0 rounded-full bg-tennis-300"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctSolo}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.18 }}
          className="absolute inset-y-0 rounded-full bg-tennis-200"
          style={{ left: `${pctUnlocked}%` }}
        />
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] font-medium text-ink-dim">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-tennis-300" />
          {unlocked} unanimous
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-tennis-200" />
          {solo} half-lit
        </span>
      </div>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl bg-surface p-8 text-center ring-1 ring-inset ring-line">
      <p className="display text-xl text-ink">
        {query ? "No matches" : "Nothing yet"}
      </p>
      <p className="max-w-xs text-sm text-ink-dim">
        {query
          ? `Nothing matches "${query}". Try another spelling.`
          : "Add a restaurant to start building the map of town."}
      </p>
    </div>
  );
}
