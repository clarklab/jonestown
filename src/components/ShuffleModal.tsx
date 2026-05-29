import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { PublicRatingChip } from "./PublicRating";
import { useAggregates } from "~/data/hooks";
import type { RestaurantAggregate } from "~/data/types";

type FilterKey = "fresh" | "locked" | "any";

const FILTER_LABEL: Record<FilterKey, string> = {
  fresh: "Never visited",
  locked: "Neither rated",
  any: "Any spot",
};

function pickCandidates(
  list: RestaurantAggregate[],
  filter: FilterKey,
): RestaurantAggregate[] {
  if (filter === "any") return list;
  if (filter === "locked") return list.filter((a) => a.verdict.status === "locked");
  // "fresh" — neither has visited
  return list.filter((a) => a.visitCount === 0);
}

export function ShuffleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { list } = useAggregates();
  const [filter, setFilter] = useState<FilterKey>("fresh");

  const candidates = useMemo(() => {
    const filtered = pickCandidates(list, filter);
    if (filtered.length > 0) return filtered;
    // Graceful fallback chain
    if (filter === "fresh") return pickCandidates(list, "locked");
    return list;
  }, [list, filter]);

  type Phase = "spinning" | "landed";
  const [phase, setPhase] = useState<Phase>("spinning");
  const [shownIdx, setShownIdx] = useState(0);
  const [pickedIdx, setPickedIdx] = useState(0);
  const [runId, setRunId] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset spinning state every time the modal opens or filter / reroll changes.
  useEffect(() => {
    if (!open) return;
    setPhase("spinning");
  }, [open, filter, runId]);

  // The spin loop. Decelerating ticks across ~2.2s, then locks on the chosen.
  useEffect(() => {
    if (!open || phase !== "spinning") return;
    if (candidates.length === 0) {
      setPhase("landed");
      return;
    }
    if (candidates.length === 1) {
      setPickedIdx(0);
      setShownIdx(0);
      const t = setTimeout(() => setPhase("landed"), 350);
      return () => clearTimeout(t);
    }

    const chosen = Math.floor(Math.random() * candidates.length);
    setPickedIdx(chosen);

    const startTime = performance.now();
    const duration = 2300;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);

      if (t >= 1) {
        setShownIdx(chosen);
        setPhase("landed");
        return;
      }

      // Pick a "random" name to display, but avoid showing the picked one
      // too early so the reveal still feels surprising.
      let i = Math.floor(Math.random() * candidates.length);
      if (t < 0.85 && i === chosen) i = (i + 1) % candidates.length;
      setShownIdx(i);

      // Ease-out cubic for the inter-tick delay — fast at the start, slow at end.
      const eased = 1 - Math.pow(1 - t, 3);
      const interval = 55 + (380 - 55) * eased;
      timerRef.current = setTimeout(tick, interval);
    };
    tick();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, phase, runId, filter, candidates]);

  if (!open) return null;

  const shown = candidates[shownIdx];
  const picked = candidates[pickedIdx];
  const stageRestaurant = phase === "landed" ? picked : shown;

  const handleReroll = () => {
    setRunId((n) => n + 1);
    setPhase("spinning");
  };

  const handleTake = () => {
    if (!picked) return;
    onClose();
    navigate(`/r/${picked.restaurant.id}`);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-md sm:items-center"
        onClick={onClose}
      >
        <motion.div
          key="sheet"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative isolate w-full max-w-md overflow-hidden rounded-t-[36px] bg-paper p-5 ring-1 ring-inset ring-line shadow-[0_-30px_80px_-30px_oklch(0_0_0_/_0.35)] safe-bottom sm:rounded-[28px] sm:shadow-[0_30px_80px_-30px_oklch(0_0_0_/_0.35)]"
        >
          {/* Sparkle background */}
          <motion.div
            key={`spark-${runId}-${phase}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "landed" ? 0.5 : 0 }}
            transition={{ duration: 0.6 }}
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 45%, var(--color-tennis-200) 0%, transparent 70%)",
            }}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-tennis-300 ring-1 ring-inset ring-black/5">
                <Icon name="casino" size={20} variant="fill" weight={200} color="var(--color-ink)" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.22em] text-ink-dim uppercase">
                  Shuffle
                </p>
                <p className="text-xs font-medium text-ink-muted">
                  No stress. Just eat.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="pressable relative flex size-9 items-center justify-center rounded-full bg-surface ring-1 ring-inset ring-line"
            >
              <Icon name="close" size={20} color="var(--color-ink)" />
              <span className="pointer-events-none absolute inset-0 -m-2" aria-hidden="true" />
            </button>
          </div>

          {/* Filter chips */}
          <div className="mt-4 flex gap-1.5">
            {(Object.keys(FILTER_LABEL) as FilterKey[]).map((k) => {
              const active = filter === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  className={`pressable rounded-full px-3 py-1.5 text-[11px] font-bold ring-1 ring-inset transition-colors ${
                    active
                      ? "bg-tennis-300 text-ink ring-tennis-500/40"
                      : "bg-surface text-ink-muted ring-line"
                  }`}
                >
                  {FILTER_LABEL[k]}
                </button>
              );
            })}
          </div>

          {/* Stage */}
          {candidates.length === 0 ? (
            <Empty />
          ) : (
            <Stage
              restaurant={stageRestaurant}
              phase={phase}
              total={candidates.length}
            />
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={handleReroll}
              disabled={candidates.length === 0}
              className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-surface px-4 py-3 text-sm font-bold text-ink ring-1 ring-inset ring-line disabled:opacity-40"
            >
              <Icon
                name="shuffle"
                size={18}
                weight={200}
                color="var(--color-ink)"
              />
              {phase === "landed" ? "Re-roll" : "Spinning…"}
            </button>
            <button
              type="button"
              onClick={handleTake}
              disabled={phase !== "landed" || !picked}
              className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-tennis-300 px-4 py-3 text-sm font-bold text-ink ring-1 ring-inset ring-tennis-500/40 shadow-[0_18px_40px_-12px_oklch(0.7_0.2_120_/_0.45)] disabled:opacity-40"
            >
              <Icon
                name="arrow_forward"
                size={18}
                weight={200}
                color="var(--color-ink)"
              />
              Take me there
            </button>
          </div>

          {candidates.length > 0 ? (
            <p className="mt-3 text-center text-[11px] font-medium text-ink-faint">
              {candidates.length} {FILTER_LABEL[filter].toLowerCase()} spots in play
            </p>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Stage({
  restaurant,
  phase,
  total,
}: {
  restaurant: RestaurantAggregate | undefined;
  phase: "spinning" | "landed";
  total: number;
}) {
  if (!restaurant) return null;
  const { restaurant: r } = restaurant;
  return (
    <div className="mt-5 flex flex-col items-center text-center">
      {/* Center indicator bar */}
      <div className="relative w-full overflow-hidden rounded-3xl bg-surface px-5 py-7 ring-1 ring-inset ring-line">
        {/* Side glints */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 left-0 w-3"
          style={{
            background:
              "linear-gradient(90deg, var(--color-surface) 0%, transparent 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 bottom-0 w-3"
          style={{
            background:
              "linear-gradient(270deg, var(--color-surface) 0%, transparent 100%)",
          }}
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={r.id + phase}
            initial={{ opacity: 0, y: phase === "landed" ? 0 : -28, scale: phase === "landed" ? 0.92 : 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.96 }}
            transition={
              phase === "landed"
                ? { type: "spring", stiffness: 380, damping: 18 }
                : { duration: 0.06, ease: "linear" }
            }
            className="flex flex-col items-center gap-1"
          >
            <p className="text-[10px] font-bold tracking-[0.22em] text-ink-dim uppercase">
              {r.cuisine ?? r.area ?? "Spot"}
            </p>
            <h2 className="display-tight text-balance text-[32px] leading-[1.04] text-ink">
              {r.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              {r.area ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold tracking-wide text-ink-muted ring-1 ring-inset ring-line">
                  <Icon name="location_on" size={12} variant="fill" color="var(--color-ink-faint)" />
                  {r.area}
                </span>
              ) : null}
              {r.publicRating ? (
                <PublicRatingChip rating={r.publicRating} size="sm" />
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>

        {phase === "landed" ? <Burst /> : null}
      </div>
      {phase === "landed" ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-tennis-100 px-3 py-1 text-[11px] font-bold tracking-[0.16em] text-tennis-800 uppercase ring-1 ring-inset ring-tennis-500/30">
          <Icon name="auto_awesome" size={14} variant="fill" color="var(--color-tennis-700)" />
          You're going here
        </p>
      ) : (
        <p className="mt-3 text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
          Rolling through {total} candidates…
        </p>
      )}
    </div>
  );
}

function Burst() {
  // Five tiny sparkles bursting out from the center of the stage on landing.
  const sparks = Array.from({ length: 6 });
  return (
    <div className="pointer-events-none absolute inset-0">
      {sparks.map((_, i) => {
        const angle = (i / sparks.length) * Math.PI * 2;
        const dx = Math.cos(angle) * 120;
        const dy = Math.sin(angle) * 80;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{ x: dx, y: dy, opacity: [0, 1, 0], scale: [0.6, 1.2, 0.8] }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: i * 0.02 }}
            className="absolute top-1/2 left-1/2"
          >
            <Icon name="auto_awesome" size={16} variant="fill" color="var(--color-tennis-600)" />
          </motion.span>
        );
      })}
    </div>
  );
}

function Empty() {
  return (
    <div className="mt-6 flex flex-col items-center gap-2 rounded-3xl bg-surface px-5 py-8 text-center ring-1 ring-inset ring-line">
      <div className="flex size-12 items-center justify-center rounded-full bg-tennis-200">
        <Icon name="restaurant" size={24} variant="fill" color="var(--color-ink)" />
      </div>
      <p className="display text-lg text-ink">You've hit them all.</p>
      <p className="max-w-[28ch] text-xs text-ink-muted">
        Try a different filter or add a new restaurant to the map.
      </p>
    </div>
  );
}
