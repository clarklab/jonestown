import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownTrayIcon,
  ArrowsRightLeftIcon,
  HeartIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Header } from "~/components/Header";
import { Stars } from "~/components/Stars";
import { UserChip } from "~/components/UserChip";
import {
  useAggregates,
  useAllDishes,
  useAllVisits,
  useCurrentUser,
} from "~/data/hooks";
import { USERS, type UserId } from "~/data/types";
import { exportAll, getDb } from "~/data/db";

export function ProfilePage() {
  const [user, setUser] = useCurrentUser();
  const visits = useAllVisits();
  const dishes = useAllDishes();
  const aggs = useAggregates();
  const [confirmClear, setConfirmClear] = useState(false);

  const myVisits = visits.filter((v) => v.userId === user);
  const myDishes = dishes.filter((d) => d.userId === user);

  const ratedCount = aggs.list.filter(
    (a) => a.ratingByUser[user] !== undefined,
  ).length;

  const favoriteDishes = useMemo(
    () =>
      [...myDishes]
        .sort((a, b) => b.rating - a.rating || b.createdAt - a.createdAt)
        .slice(0, 5),
    [myDishes],
  );

  const avgRating = useMemo(() => {
    const all = [
      ...myVisits.filter((v) => v.rating !== undefined).map((v) => v.rating!),
      ...myDishes.map((d) => d.rating),
    ];
    if (!all.length) return undefined;
    return all.reduce((s, n) => s + n, 0) / all.length;
  }, [myVisits, myDishes]);

  const handleExport = async () => {
    const blob = await exportAll();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jonestown-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    const db = await getDb();
    const tx = db.transaction(
      ["restaurants", "visits", "dishes", "photos", "meta"],
      "readwrite",
    );
    await Promise.all([
      tx.objectStore("restaurants").clear(),
      tx.objectStore("visits").clear(),
      tx.objectStore("dishes").clear(),
      tx.objectStore("photos").clear(),
      tx.objectStore("meta").clear(),
    ]);
    await tx.done;
    window.location.reload();
  };

  return (
    <div className="pb-12">
      <Header />
      <section className="px-5">
        <p className="text-[11px] tracking-[0.22em] text-flame-200/80 uppercase">
          Profile
        </p>
        <h1 className="display mt-1 text-3xl tracking-tight text-ink">
          Hey, {USERS[user].name}.
        </h1>
      </section>

      <section className="mt-5 px-4">
        <div className="rounded-3xl bg-bg-card p-1.5 ring-1 ring-inset ring-white/5">
          <div className="flex rounded-[20px] bg-bg/40 p-1">
            {(["clark", "angie"] as UserId[]).map((id) => {
              const active = user === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setUser(id)}
                  className="relative flex flex-1 items-center justify-center gap-2 rounded-2xl py-2 text-sm font-semibold"
                >
                  {active ? (
                    <motion.span
                      layoutId="profile-active"
                      className="absolute inset-0 rounded-2xl bg-bg-card shadow-[0_8px_24px_-12px_oklch(0_0_0_/_0.8)] ring-1 ring-inset ring-white/10"
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    />
                  ) : null}
                  <span className="relative flex items-center gap-2">
                    <UserChip id={id} size="sm" />
                    <span
                      className={active ? "text-ink" : "text-ink-dim"}
                    >
                      {USERS[id].name}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 px-4">
        <Stat label="Visits" value={myVisits.length} />
        <Stat label="Dishes" value={myDishes.length} />
        <Stat label="Restaurants" value={ratedCount} />
        <Stat
          label="Avg rating"
          value={avgRating !== undefined ? avgRating.toFixed(1) : "—"}
        />
      </section>

      {favoriteDishes.length > 0 ? (
        <section className="mt-8 px-5">
          <div className="flex items-center gap-2">
            <HeartIcon className="size-4 stroke-flame-300" />
            <h2 className="display text-lg text-ink">Your top dishes</h2>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {favoriteDishes.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-2xl bg-bg-card p-3 ring-1 ring-inset ring-white/5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {d.name}
                  </p>
                  <Stars value={d.rating} size="xs" />
                </div>
                <span className="display text-xl tabular-nums text-ink">
                  {d.rating.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 px-4">
        <h2 className="display text-lg px-1 text-ink">Settings</h2>
        <div className="mt-2 flex flex-col gap-2">
          <SettingRow
            icon={<ArrowsRightLeftIcon className="size-5 stroke-current" />}
            label="Switch user"
            description="Toggle between Clark and Angie above."
          />
          <button
            type="button"
            onClick={handleExport}
            className="pressable flex items-center gap-3 rounded-2xl bg-bg-card p-3 text-left ring-1 ring-inset ring-white/5"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-flame-500/10 ring-1 ring-inset ring-flame-400/20">
              <ArrowDownTrayIcon className="size-5 stroke-flame-200" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">
                Export everything
              </span>
              <span className="block text-xs text-ink-dim">
                Download a JSON snapshot with photos.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className={`pressable flex items-center gap-3 rounded-2xl bg-bg-card p-3 text-left ring-1 ring-inset transition-colors ${
              confirmClear
                ? "ring-flame-500/40 bg-flame-500/10"
                : "ring-white/5"
            }`}
          >
            <span
              className={`flex size-10 items-center justify-center rounded-xl ring-1 ring-inset ${
                confirmClear
                  ? "bg-flame-500/20 ring-flame-400/30"
                  : "bg-white/5 ring-white/10"
              }`}
            >
              <TrashIcon
                className={`size-5 stroke-current ${
                  confirmClear ? "text-flame-100" : "text-ink-muted"
                }`}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">
                {confirmClear ? "Tap again to confirm" : "Reset all data"}
              </span>
              <span className="block text-xs text-ink-dim">
                Wipes restaurants, visits, dishes, and photos.
              </span>
            </span>
          </button>
        </div>
      </section>

      <section className="mt-10 px-5">
        <p className="text-center text-[11px] tracking-[0.22em] text-ink-faint uppercase">
          Made with love for Jonestown, TX
        </p>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-bg-card p-3.5 ring-1 ring-inset ring-white/5">
      <p className="text-[11px] tracking-[0.18em] text-ink-dim uppercase">
        {label}
      </p>
      <p className="display mt-1.5 text-3xl tabular-nums text-ink">{value}</p>
    </div>
  );
}

function SettingRow({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-bg-card p-3 ring-1 ring-inset ring-white/5">
      <span className="flex size-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-inset ring-white/10 text-ink-muted">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-ink-dim">{description}</span>
      </span>
    </div>
  );
}
