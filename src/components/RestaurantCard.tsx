import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { usePhotoUrl } from "~/data/hooks";
import type { RestaurantAggregate } from "~/data/types";
import { DuelInline, VerdictBadge } from "./Duel";
import { Icon } from "./Icon";
import { formatRelativeDate } from "~/utils/format";

export function RestaurantCard({ agg }: { agg: RestaurantAggregate }) {
  const { restaurant, topDishes, verdict, lastVisit } = agg;
  const heroPhoto = topDishes.find((d) => d.photoId)?.photoId;
  const photoUrl = usePhotoUrl(heroPhoto);
  const isLocked = verdict.status === "locked";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
    >
      <Link
        to={`/r/${restaurant.id}`}
        className="pressable group relative flex gap-3 overflow-hidden rounded-3xl bg-surface p-3 ring-1 ring-inset ring-line"
      >
        <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-surface-2 outline-1 -outline-offset-1 outline-black/5">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
              loading="lazy"
            />
          ) : (
            <PlaceholderArt seed={restaurant.id} name={restaurant.name} />
          )}
          {isLocked ? (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/85 backdrop-blur-md">
              <Icon name="lock" size={26} variant="fill" color="var(--color-ink-faint)" />
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col py-0.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="display truncate text-[19px] leading-tight text-ink">
              {restaurant.name}
            </h3>
            <VerdictBadge verdict={verdict} size="sm" />
          </div>
          {restaurant.cuisine || restaurant.area ? (
            <p className="mt-0.5 truncate text-xs text-ink-dim">
              {[restaurant.cuisine, restaurant.area]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}

          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <DuelInline verdict={verdict} />
            <span className="shrink-0 text-[11px] font-medium text-ink-faint">
              {agg.visitCount === 0
                ? "—"
                : `${agg.visitCount} visit${agg.visitCount === 1 ? "" : "s"} · ${
                    lastVisit ? formatRelativeDate(lastVisit) : ""
                  }`}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function PlaceholderArt({
  seed,
  name,
}: {
  seed: string;
  name: string;
}) {
  let h = 0;
  for (let i = 0; i < seed.length; i++)
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = (h % 120) + 60; // 60..180
  const b = ((h >> 8) % 120) + 60; // hue 60..180
  const initial = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase();
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: `linear-gradient(135deg, oklch(0.92 0.16 ${a}) 0%, oklch(0.84 0.18 ${b}) 100%)`,
      }}
    >
      <span className="display-tight text-3xl text-ink/65">{initial}</span>
    </div>
  );
}
