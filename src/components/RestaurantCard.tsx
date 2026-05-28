import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { usePhotoUrl } from "~/data/hooks";
import type { RestaurantAggregate } from "~/data/types";
import { BothChip, UserChip } from "./UserChip";
import { Stars } from "./Stars";
import { formatRelativeDate } from "~/utils/format";

export function RestaurantCard({ agg }: { agg: RestaurantAggregate }) {
  const { restaurant, topDishes, combinedRating, bothRated, lastVisit } = agg;
  const heroPhoto = topDishes.find((d) => d.photoId)?.photoId;
  const photoUrl = usePhotoUrl(heroPhoto);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
    >
      <Link
        to={`/r/${restaurant.id}`}
        className="pressable relative flex gap-3 overflow-hidden rounded-3xl bg-bg-card p-3 ring-1 ring-inset ring-white/5"
      >
        <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-bg-soft outline-1 -outline-offset-1 outline-white/10">
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
          {combinedRating !== undefined ? (
            <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-full bg-bg/85 px-1.5 py-0.5 backdrop-blur-md ring-1 ring-white/15">
              <svg viewBox="0 0 24 24" className="size-3 shrink-0">
                <path
                  d="M12 2l2.86 6.7 7.14.6-5.43 4.7 1.65 7.0L12 17.27 5.78 21l1.65-7L2 9.3l7.14-.6L12 2z"
                  fill="var(--color-gold)"
                />
              </svg>
              <span className="text-[11px] font-semibold tabular-nums text-ink">
                {combinedRating.toFixed(1)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col py-0.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="display truncate text-[19px] leading-tight text-ink">
              {restaurant.name}
            </h3>
          </div>
          {restaurant.cuisine || restaurant.area ? (
            <p className="mt-0.5 truncate text-xs text-ink-dim">
              {[restaurant.cuisine, restaurant.area]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}

          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <div className="flex flex-col gap-1">
              {agg.ratingByUser.clark !== undefined ||
              agg.ratingByUser.angie !== undefined ? (
                <div className="flex items-center gap-1.5">
                  {agg.ratingByUser.clark !== undefined ? (
                    <Pill
                      avatar={<UserChip id="clark" size="xs" />}
                      value={agg.ratingByUser.clark}
                    />
                  ) : null}
                  {agg.ratingByUser.angie !== undefined ? (
                    <Pill
                      avatar={<UserChip id="angie" size="xs" />}
                      value={agg.ratingByUser.angie}
                    />
                  ) : null}
                </div>
              ) : (
                <span className="text-[11px] tracking-wide text-ink-faint uppercase">
                  Unrated
                </span>
              )}
              <p className="text-[11px] text-ink-dim">
                {agg.visitCount === 0
                  ? "No visits yet"
                  : `${agg.visitCount} visit${agg.visitCount === 1 ? "" : "s"} · ${lastVisit ? formatRelativeDate(lastVisit) : ""}`}
              </p>
            </div>
            {bothRated ? <BothChip size="sm" /> : null}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function Pill({
  avatar,
  value,
}: {
  avatar: React.ReactNode;
  value: number;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-bg-soft py-0.5 pr-1.5 pl-0.5 ring-1 ring-inset ring-white/5">
      {avatar}
      <Stars value={value} size="xs" />
      <span className="text-[10px] font-semibold tabular-nums text-ink-muted">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export function PlaceholderArt({
  seed,
  name,
}: {
  seed: string;
  name: string;
}) {
  // Hash seed to a pair of warm hues
  let h = 0;
  for (let i = 0; i < seed.length; i++)
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = (h % 60) + 10; // 10..70
  const b = ((h >> 8) % 60) + 30; // 30..90
  const initial = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase();
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: `radial-gradient(120% 120% at 25% 20%, oklch(0.7 0.16 ${a}) 0%, oklch(0.32 0.12 ${b}) 65%, oklch(0.2 0.06 ${b}) 100%)`,
      }}
    >
      <span className="display text-3xl text-bg/70">{initial}</span>
    </div>
  );
}
