import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Header } from "~/components/Header";
import { HeroShader } from "~/components/HeroShader";
import { RestaurantCard } from "~/components/RestaurantCard";
import { useAggregates } from "~/data/hooks";
import type { RestaurantAggregate } from "~/data/types";

type SortKey = "all" | "unrated" | "top" | "recent" | "both";

const SORT_LABELS: Record<SortKey, string> = {
  all: "All",
  unrated: "Unrated",
  top: "Top",
  recent: "Recent",
  both: "Both ★",
};

export function HomePage() {
  const aggs = useAggregates();
  const [sort, setSort] = useState<SortKey>("all");
  const [query, setQuery] = useState("");

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

  const pctRated =
    aggs.totalCount === 0
      ? 0
      : Math.round((aggs.ratedCount / aggs.totalCount) * 100);

  return (
    <div className="relative">
      <Header transparent />

      <section className="relative isolate -mt-16 overflow-hidden pt-20 pb-8">
        <HeroShader
          intensity={0.95}
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px]"
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px]"
          style={{
            background:
              "linear-gradient(to bottom, oklch(0 0 0 / 0.32) 0%, transparent 18%, transparent 60%, var(--color-bg) 100%)",
          }}
        />
        <div className="px-5">
          <p className="text-[11px] tracking-[0.22em] text-flame-200/80 uppercase">
            Jonestown, TX · 78645
          </p>
          <h1
            className="display mt-2 max-w-[14ch] text-[44px] leading-[1.02] tracking-tight text-balance text-ink"
            style={{ textShadow: "0 2px 24px oklch(0 0 0 / 0.45)" }}
          >
            Two forks,
            <br />
            <span className="display-italic text-flame-200">one town.</span>
          </h1>
          <p
            className="mt-3 max-w-[34ch] text-pretty text-sm text-ink-muted"
            style={{ textShadow: "0 1px 16px oklch(0 0 0 / 0.5)" }}
          >
            Clark & Angie's private supper club. Rate every restaurant, log
            every dish, agree to disagree.
          </p>

          <Progress
            pct={pctRated}
            ratedCount={aggs.ratedCount}
            bothRatedCount={aggs.bothRatedCount}
            totalCount={aggs.totalCount}
          />
        </div>
      </section>

      <section className="px-4">
        <div className="flex items-center gap-2 rounded-2xl bg-bg-card px-3 py-2.5 ring-1 ring-inset ring-white/5">
          <MagnifyingGlassIcon className="size-5 shrink-0 stroke-ink-dim" />
          <input
            type="search"
            name="q"
            placeholder="Search restaurants, cuisine, area…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
            className="w-full bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>

        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSort(k)}
              className={`pressable shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors ${
                sort === k
                  ? "bg-flame-500/15 text-flame-200 ring-flame-400/30"
                  : "bg-bg-card text-ink-muted ring-white/5"
              }`}
            >
              {SORT_LABELS[k]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 flex flex-col gap-2.5 px-4">
        {filtered.length === 0 ? (
          <EmptyState query={query} />
        ) : (
          filtered.map((agg) => (
            <RestaurantCard key={agg.restaurant.id} agg={agg} />
          ))
        )}
      </section>

      <section className="mx-4 mt-5">
        <Link
          to="/add/restaurant"
          className="pressable group flex items-center gap-3 rounded-3xl bg-bg-card p-4 ring-1 ring-inset ring-white/5"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-flame-500/15 ring-1 ring-inset ring-flame-400/20">
            <PlusIcon className="size-6 stroke-flame-200 [stroke-width:2]" />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-ink">
              Add a restaurant
            </p>
            <p className="text-xs text-ink-dim">
              Something new opens? Drop it in.
            </p>
          </div>
        </Link>
      </section>
    </div>
  );
}

function applySort(list: RestaurantAggregate[], sort: SortKey) {
  switch (sort) {
    case "unrated":
      return list.filter((a) => a.combinedRating === undefined);
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
    case "both":
      return list.filter((a) => a.bothRated);
    case "all":
    default:
      return list;
  }
}

function Progress({
  pct,
  ratedCount,
  bothRatedCount,
  totalCount,
}: {
  pct: number;
  ratedCount: number;
  bothRatedCount: number;
  totalCount: number;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl bg-bg-card/80 backdrop-blur-md p-3.5 ring-1 ring-inset ring-white/10">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-4 shrink-0 stroke-flame-300" />
          <p className="text-[11px] tracking-[0.18em] text-ink-dim uppercase">
            Town progress
          </p>
        </div>
        <p className="text-sm font-semibold tabular-nums text-ink">
          {ratedCount}
          <span className="text-ink-faint">/{totalCount}</span>
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.1 }}
          className="h-full rounded-full"
          style={{
            background:
              "linear-gradient(90deg, oklch(0.55 0.2 38), oklch(0.82 0.18 60), oklch(0.88 0.14 86))",
          }}
        />
      </div>
      <p className="mt-2.5 text-xs text-ink-dim">
        <span className="font-semibold text-ink-muted">{bothRatedCount}</span>{" "}
        rated by both · keep going.
      </p>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl bg-bg-card p-8 text-center ring-1 ring-inset ring-white/5">
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
