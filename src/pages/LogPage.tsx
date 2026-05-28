import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Header } from "~/components/Header";
import { Stars } from "~/components/Stars";
import { UserChip } from "~/components/UserChip";
import {
  useAllDishes,
  useAllVisits,
  useCurrentCouple,
  usePhotoUrl,
  useRestaurants,
} from "~/data/hooks";
import { formatDate, formatRelativeDate } from "~/utils/format";
import { memberOf, type Dish, type UserId, type Visit } from "~/data/types";

type Filter = "all" | "a" | "b" | "duels";

export function LogPage() {
  const couple = useCurrentCouple();
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

  const dayDuels = useMemo(() => {
    const buckets = new Map<string, Visit[]>();
    for (const v of visits) {
      const day = new Date(v.date);
      day.setHours(0, 0, 0, 0);
      const key = `${v.restaurantId}::${day.getTime()}`;
      const arr = buckets.get(key) ?? [];
      arr.push(v);
      buckets.set(key, arr);
    }
    return Array.from(buckets.entries())
      .map(([key, vs]) => ({
        key,
        visits: vs,
        date: Math.max(...vs.map((v) => v.date)),
        bothPresent:
          vs.some((v) => v.userId === "a") && vs.some((v) => v.userId === "b"),
      }))
      .sort((a, b) => b.date - a.date);
  }, [visits]);

  const filteredVisits = useMemo(() => {
    if (filter === "a") return visits.filter((v) => v.userId === "a");
    if (filter === "b") return visits.filter((v) => v.userId === "b");
    return visits;
  }, [visits, filter]);

  const memberA = memberOf(couple, "a");
  const memberB = memberOf(couple, "b");

  return (
    <div className="pb-12">
      <Header />
      <section className="px-5">
        <p className="text-[11px] font-bold tracking-[0.22em] text-ink-dim uppercase">
          The Log
        </p>
        <h1 className="display-tight mt-1 text-3xl tracking-tight text-ink">
          Every visit, every dish.
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Scroll back through your history.
        </p>

        <div className="mt-4 inline-flex rounded-full bg-surface p-1 ring-1 ring-inset ring-line">
          {(["all", "a", "b", "duels"] as Filter[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`pressable rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                filter === k
                  ? "bg-tennis-300 text-ink ring-1 ring-inset ring-tennis-500/30"
                  : "text-ink-dim"
              }`}
            >
              {k === "all"
                ? "All"
                : k === "a"
                  ? memberA.name
                  : k === "b"
                    ? memberB.name
                    : "Duels"}
            </button>
          ))}
        </div>
      </section>

      {filter === "duels" ? (
        <section className="mt-5 flex flex-col gap-3 px-4">
          {dayDuels.length === 0 ? (
            <EmptyState message="No same-day duels yet." />
          ) : (
            dayDuels.map((d) => (
              <DuelDayCard
                key={d.key}
                visits={d.visits}
                restaurantName={
                  restaurantById[d.visits[0]?.restaurantId ?? ""] ?? "—"
                }
                dishesByVisit={dishesByVisit}
                bothPresent={d.bothPresent}
              />
            ))
          )}
        </section>
      ) : (
        <section className="mt-5 flex flex-col gap-3 px-4">
          {filteredVisits.length === 0 ? (
            <EmptyState message="Nothing logged yet." />
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
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl bg-surface p-8 text-center ring-1 ring-inset ring-line">
      <p className="display text-xl text-ink">{message}</p>
      <p className="mt-1 text-sm text-ink-dim">Tap the big + to start.</p>
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
  const couple = useCurrentCouple();
  const u = memberOf(couple, visit.userId as UserId);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl bg-surface ring-1 ring-inset ring-line"
    >
      <Link to={`/r/${visit.restaurantId}`} className="block">
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
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
                  <Stars value={visit.rating} size="sm" color={u.accent} />
                  <span className="text-xs font-bold tabular-nums text-ink-muted">
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
  const couple = useCurrentCouple();
  const url = usePhotoUrl(dish.photoId);
  const member = memberOf(couple, dish.userId);
  return (
    <div className="w-32 shrink-0 overflow-hidden rounded-2xl bg-surface ring-1 ring-inset ring-line">
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        {url ? (
          <img
            src={url}
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, var(--color-tennis-100), var(--color-tennis-200))",
            }}
          >
            <span className="display-tight text-xl text-ink/40">
              {dish.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="line-clamp-1 text-xs font-bold text-ink">{dish.name}</p>
        <div className="mt-0.5 flex items-center justify-between">
          <Stars value={dish.rating} size="xs" color={member.accent} />
          <span className="text-[10px] font-bold tabular-nums text-ink-muted">
            {dish.rating.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}

function DuelDayCard({
  visits,
  restaurantName,
  dishesByVisit,
  bothPresent,
}: {
  visits: Visit[];
  restaurantName: string;
  dishesByVisit: Record<string, Dish[]>;
  bothPresent: boolean;
}) {
  const aVisit = visits.find((v) => v.userId === "a");
  const bVisit = visits.find((v) => v.userId === "b");
  const date = Math.max(...visits.map((v) => v.date));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl bg-surface ring-1 ring-inset ring-line"
    >
      <Link to={`/r/${visits[0]?.restaurantId ?? ""}`} className="block">
        <div className="flex items-start justify-between gap-3 p-4 pb-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
              {formatRelativeDate(date)} · {formatDate(date)}
            </p>
            <h3 className="display mt-1 truncate text-xl text-ink">
              {restaurantName}
            </h3>
          </div>
          {bothPresent ? (
            <span className="rounded-full bg-tennis-300 px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-ink uppercase">
              Same day duel
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-0 border-t border-line">
          <DuelHalf
            user="a"
            visit={aVisit}
            dishes={aVisit ? (dishesByVisit[aVisit.id] ?? []) : []}
          />
          <div className="border-l border-line">
            <DuelHalf
              user="b"
              visit={bVisit}
              dishes={bVisit ? (dishesByVisit[bVisit.id] ?? []) : []}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function DuelHalf({
  user,
  visit,
  dishes,
}: {
  user: UserId;
  visit: Visit | undefined;
  dishes: Dish[];
}) {
  const couple = useCurrentCouple();
  const u = memberOf(couple, user);
  return (
    <div
      className="relative flex flex-col gap-2 p-4"
      style={{
        background: `linear-gradient(180deg, ${u.accent}10, transparent 60%)`,
      }}
    >
      <div className="flex items-center gap-2">
        <UserChip id={user} size="sm" />
        <span className="text-xs font-bold text-ink">{u.name}</span>
      </div>
      {visit ? (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="display-tight text-2xl tabular-nums text-ink">
              {visit.rating !== undefined ? visit.rating.toFixed(1) : "—"}
            </span>
            {visit.rating !== undefined ? (
              <span className="text-[11px] font-bold text-ink-faint">/5</span>
            ) : null}
          </div>
          <Stars value={visit.rating ?? 0} size="sm" color={u.accent} />
          {visit.notes ? (
            <p className="line-clamp-3 text-xs text-ink-dim italic">
              "{visit.notes}"
            </p>
          ) : null}
          {dishes.length > 0 ? (
            <p className="mt-1 text-[11px] font-bold text-ink-muted">
              {dishes.length} dish{dishes.length === 1 ? "" : "es"}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-xs font-medium text-ink-faint italic">
          No visit on this day.
        </p>
      )}
    </div>
  );
}
