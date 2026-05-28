import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Header } from "~/components/Header";
import { Stars } from "~/components/Stars";
import { UserChip } from "~/components/UserChip";
import { useAllDishes, useAllVisits, usePhotoUrl, useRestaurants } from "~/data/hooks";
import { formatDate, formatRelativeDate } from "~/utils/format";
import type { Dish, UserId, Visit } from "~/data/types";

type Filter = "all" | "clark" | "angie";

export function LogPage() {
  const visits = useAllVisits();
  const dishes = useAllDishes();
  const restaurants = useRestaurants();
  const [filter, setFilter] = useState<Filter>("all");

  const restaurantById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of restaurants) map[r.id] = r.name;
    return map;
  }, [restaurants]);

  const dishesByVisit = useMemo(() => {
    const map: Record<string, Dish[]> = {};
    for (const d of dishes) {
      (map[d.visitId] ||= []).push(d);
    }
    return map;
  }, [dishes]);

  const filteredVisits = useMemo(() => {
    if (filter === "all") return visits;
    return visits.filter((v) => v.userId === filter);
  }, [visits, filter]);

  return (
    <div className="pb-12">
      <Header />
      <section className="px-5">
        <p className="text-[11px] tracking-[0.22em] text-flame-200/80 uppercase">
          The Log
        </p>
        <h1 className="display mt-1 text-3xl tracking-tight text-ink">
          Every visit, every dish.
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Scroll back through your history.
        </p>

        <div className="mt-4 inline-flex rounded-full bg-bg-card p-1 ring-1 ring-inset ring-white/5">
          {(["all", "clark", "angie"] as Filter[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`pressable rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === k
                  ? "bg-bg text-ink ring-1 ring-inset ring-white/10"
                  : "text-ink-dim"
              }`}
            >
              {k === "all" ? "All" : k === "clark" ? "Clark" : "Angie"}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 flex flex-col gap-3 px-4">
        {filteredVisits.length === 0 ? (
          <div className="rounded-3xl bg-bg-card p-8 text-center ring-1 ring-inset ring-white/5">
            <p className="display text-xl text-ink">Nothing logged yet</p>
            <p className="mt-1 text-sm text-ink-dim">
              Tap the big + to start.
            </p>
          </div>
        ) : (
          filteredVisits.map((v) => (
            <LogVisitCard
              key={v.id}
              visit={v}
              restaurantName={restaurantById[v.restaurantId] ?? "—"}
              dishes={dishesByVisit[v.id] ?? []}
            />
          ))
        )}
      </section>
    </div>
  );
}

function LogVisitCard({
  visit,
  restaurantName,
  dishes,
}: {
  visit: Visit;
  restaurantName: string;
  dishes: Dish[];
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl bg-bg-card ring-1 ring-inset ring-white/5"
    >
      <Link to={`/r/${visit.restaurantId}`} className="block">
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] tracking-[0.18em] text-ink-dim uppercase">
              {formatRelativeDate(visit.date)} · {formatDate(visit.date)}
            </p>
            <h3 className="display mt-1 truncate text-xl text-ink">
              {restaurantName}
            </h3>
            {visit.notes ? (
              <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                {visit.notes}
              </p>
            ) : null}
            <div className="mt-2 flex items-center gap-2">
              <UserChip id={visit.userId as UserId} size="sm" showName />
              {visit.rating !== undefined ? (
                <>
                  <span className="text-ink-faint">·</span>
                  <Stars value={visit.rating} size="sm" />
                  <span className="text-xs tabular-nums text-ink-muted">
                    {visit.rating.toFixed(1)}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
      {dishes.length > 0 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-4">
          {dishes.map((d) => (
            <DishThumb key={d.id} dish={d} />
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}

function DishThumb({ dish }: { dish: Dish }) {
  const url = usePhotoUrl(dish.photoId);
  return (
    <div className="w-32 shrink-0 overflow-hidden rounded-2xl bg-bg-soft ring-1 ring-inset ring-white/5">
      <div className="relative aspect-square overflow-hidden bg-bg-soft">
        {url ? (
          <img
            src={url}
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="display text-xl text-ink-faint">
              {dish.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="line-clamp-1 text-xs font-medium text-ink">{dish.name}</p>
        <div className="mt-0.5 flex items-center justify-between">
          <Stars value={dish.rating} size="xs" />
          <span className="text-[10px] tabular-nums text-ink-muted">
            {dish.rating.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}
