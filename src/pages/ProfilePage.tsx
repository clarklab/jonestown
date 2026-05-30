import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Header } from "~/components/Header";
import { Icon } from "~/components/Icon";
import { VerdictPill } from "~/components/PassFail";
import { UserChip } from "~/components/UserChip";
import {
  useAggregates,
  useAllDishes,
  useAllVisits,
  useCurrentCouple,
  useCurrentUser,
} from "~/data/hooks";
import { memberOf, type UserId } from "~/data/types";
import { exportAll, getDb, setUnlocked } from "~/data/db";

export function ProfilePage() {
  const [user, setUser] = useCurrentUser();
  const couple = useCurrentCouple();
  const visits = useAllVisits();
  const dishes = useAllDishes();
  const aggs = useAggregates();
  const [confirmClear, setConfirmClear] = useState(false);

  const myVisits = visits.filter((v) => v.userId === user);
  const myDishes = dishes.filter((d) => d.userId === user);

  const ratedCount = aggs.list.filter(
    (a) => a.ratingByUser[user] !== undefined,
  ).length;

  const favoriteDishes = useMemo(() => {
    const rank = (d: { verdict?: "yes" | "no"; rating?: number }) =>
      d.verdict === "yes"
        ? 2
        : d.verdict === "no"
          ? 0
          : d.rating !== undefined
            ? d.rating / 5
            : 1; // meh in the middle
    return [...myDishes]
      .filter((d) => d.verdict === "yes")
      .sort((a, b) => rank(b) - rank(a) || b.createdAt - a.createdAt)
      .slice(0, 5);
  }, [myDishes]);

  const avgRating = useMemo(() => {
    const all = myVisits
      .filter((v) => v.rating !== undefined)
      .map((v) => v.rating!);
    if (!all.length) return undefined;
    return all.reduce((s, n) => s + n, 0) / all.length;
  }, [myVisits]);

  const partner: UserId = user === "a" ? "b" : "a";

  // Number of restaurants where you've reviewed but partner hasn't, and vice versa.
  const yourSoloUnlocks = aggs.list.filter(
    (a) =>
      a.ratingByUser[user] !== undefined &&
      a.ratingByUser[partner] === undefined,
  ).length;
  const partnerSoloUnlocks = aggs.list.filter(
    (a) =>
      a.ratingByUser[partner] !== undefined &&
      a.ratingByUser[user] === undefined,
  ).length;

  const handleExport = async () => {
    if (!couple) return;
    const blob = await exportAll(couple.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${couple.slug}-${new Date().toISOString().slice(0, 10)}.json`;
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

  const u = memberOf(couple, user);
  return (
    <div className="pb-12">
      <Header />
      <section className="px-5">
        <p className="text-[11px] font-bold tracking-[0.22em] text-ink-dim uppercase">
          Profile
        </p>
        <h1 className="display-tight mt-1 text-3xl tracking-tight text-ink">
          Hey, <span style={{ color: u.accent }}>{u.name}</span>.
        </h1>
      </section>

      <section className="mt-5 px-4">
        <div className="rounded-3xl bg-surface p-1.5 ring-1 ring-inset ring-line">
          <div className="flex rounded-[20px] bg-surface-2 p-1">
            {(["a", "b"] as UserId[]).map((id) => {
              const active = user === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setUser(id)}
                  className="relative flex flex-1 items-center justify-center gap-2 rounded-2xl py-2 text-sm font-bold"
                >
                  {active ? (
                    <motion.span
                      layoutId="profile-active"
                      className="absolute inset-0 rounded-2xl bg-surface shadow-[0_8px_24px_-12px_oklch(0_0_0_/_0.18)] ring-1 ring-inset ring-line"
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    />
                  ) : null}
                  <span className="relative flex items-center gap-2">
                    <UserChip id={id} size="sm" />
                    <span
                      style={{
                        color: active ? memberOf(couple, id).accent : "var(--color-ink-dim)",
                      }}
                    >
                      {memberOf(couple, id).name}
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

      <section className="mt-5 px-4">
        <div className="rounded-3xl bg-surface p-4 ring-1 ring-inset ring-line">
          <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
            Two-fork standoff
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Places only one of you has hit.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StandoffSide
              user={user}
              label="You're waiting on"
              count={yourSoloUnlocks}
            />
            <StandoffSide
              user={partner}
              label={`${memberOf(couple, partner).name} is waiting on`}
              count={partnerSoloUnlocks}
            />
          </div>
        </div>
      </section>

      {favoriteDishes.length > 0 ? (
        <section className="mt-8 px-5">
          <div className="flex items-center gap-2">
            <Icon name="favorite" size={18} variant="fill" color={u.accent} />
            <h2 className="display text-lg text-ink">Your top dishes</h2>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {favoriteDishes.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-inset ring-line"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{d.name}</p>
                  {d.notes ? (
                    <p className="line-clamp-1 text-xs text-ink-dim italic">
                      "{d.notes}"
                    </p>
                  ) : null}
                </div>
                <VerdictPill verdict={d.verdict} size="md" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 px-4">
        <h2 className="display text-lg px-1 text-ink">Settings</h2>
        <div className="mt-2 flex flex-col gap-2">
          <SettingRow
            icon={<Icon name="swap_horiz" size={22} color="currentColor" />}
            label="Switch user"
            description="Toggle between the two of you above."
          />
          <Link
            to="/admin"
            className="pressable flex items-center gap-3 rounded-2xl bg-surface p-3 text-left ring-1 ring-inset ring-line"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-tennis-200 ring-1 ring-inset ring-tennis-500/30">
              <Icon name="checklist" size={22} color="var(--color-ink)" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink">
                Catalog
              </span>
              <span className="block text-xs text-ink-dim">
                Every spot we've found — tap to add what's missing.
              </span>
            </span>
            <Icon name="chevron_right" size={22} color="var(--color-ink-faint)" />
          </Link>
          <button
            type="button"
            onClick={handleExport}
            className="pressable flex items-center gap-3 rounded-2xl bg-surface p-3 text-left ring-1 ring-inset ring-line"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-tennis-200 ring-1 ring-inset ring-tennis-500/30">
              <Icon name="download" size={22} color="var(--color-ink)" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink">
                Export everything
              </span>
              <span className="block text-xs text-ink-dim">
                Download a JSON snapshot with photos.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setUnlocked(false);
              window.location.reload();
            }}
            className="pressable flex items-center gap-3 rounded-2xl bg-surface p-3 text-left ring-1 ring-inset ring-line"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 ring-1 ring-inset ring-line">
              <Icon name="lock" size={22} color="var(--color-ink-dim)" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink">
                Lock app
              </span>
              <span className="block text-xs text-ink-dim">
                Require the PIN again on this device.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className={`pressable flex items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-inset transition-colors ${
              confirmClear
                ? "bg-angie-50 ring-angie-200"
                : "bg-surface ring-line"
            }`}
          >
            <span
              className={`flex size-10 items-center justify-center rounded-xl ring-1 ring-inset ${
                confirmClear
                  ? "bg-angie-200/50 ring-angie-200"
                  : "bg-surface-2 ring-line"
              }`}
            >
              <Icon
                name="delete"
                size={22}
                color={confirmClear ? "var(--color-angie-700)" : "var(--color-ink-dim)"}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink">
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
        <p className="text-center text-[11px] font-bold tracking-[0.22em] text-ink-faint uppercase">
          Made for Jonestown, TX
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
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-inset ring-line">
      <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
        {label}
      </p>
      <p className="display-tight mt-1.5 text-3xl tabular-nums text-ink">{value}</p>
    </div>
  );
}

function StandoffSide({
  user,
  label,
  count,
}: {
  user: UserId;
  label: string;
  count: number;
}) {
  const couple = useCurrentCouple();
  const u = memberOf(couple, user);
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-3 ring-1 ring-inset ring-line"
      style={{ background: `linear-gradient(135deg, ${u.accent}18, transparent 80%)` }}
    >
      <p className="text-[10px] font-bold tracking-[0.16em] text-ink-dim uppercase">
        {label}
      </p>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="display-tight text-3xl tabular-nums" style={{ color: u.accent }}>
          {count}
        </span>
        <span className="text-xs font-bold text-ink-faint">
          spot{count === 1 ? "" : "s"}
        </span>
      </div>
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
    <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-inset ring-line">
      <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 ring-1 ring-inset ring-line text-ink-muted">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink">{label}</span>
        <span className="block text-xs text-ink-dim">{description}</span>
      </span>
    </div>
  );
}
