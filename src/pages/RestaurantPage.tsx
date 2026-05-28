import { motion } from "framer-motion";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRightIcon,
  MapPinIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { Header } from "~/components/Header";
import { Stars } from "~/components/Stars";
import { UserChip } from "~/components/UserChip";
import {
  useAggregate,
  useDishes,
  usePhotoUrl,
  useRestaurant,
  useVisits,
} from "~/data/hooks";
import { formatDate, formatRelativeDate } from "~/utils/format";
import { USERS, type Dish, type Visit } from "~/data/types";
import { PlaceholderArt } from "~/components/RestaurantCard";

export function RestaurantPage() {
  const { id } = useParams<{ id: string }>();
  const restaurant = useRestaurant(id);
  const agg = useAggregate(id);
  const visits = useVisits(id);
  const dishes = useDishes({ restaurantId: id });
  const navigate = useNavigate();

  if (!restaurant) {
    return (
      <div className="px-4 py-16 text-center">
        <Header back />
        <p className="mt-12 text-ink-muted">Restaurant not found.</p>
      </div>
    );
  }

  const heroPhoto = dishes.find((d) => d.photoId)?.photoId;

  return (
    <div className="relative pb-12">
      <Header back transparent />

      <section className="relative -mt-16 h-72 overflow-hidden">
        <HeroPhotoOrArt photoId={heroPhoto} seed={restaurant.id} name={restaurant.name} />
        <div
          className="absolute inset-x-0 bottom-0 h-2/3"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, oklch(0.16 0.014 60 / 0.65) 60%, var(--color-bg) 100%)",
          }}
        />
      </section>

      <section className="relative -mt-20 px-5">
        <h1
          className="display text-[36px] leading-[1.04] tracking-tight text-balance text-ink"
          style={{ textShadow: "0 2px 16px oklch(0 0 0 / 0.45)" }}
        >
          {restaurant.name}
        </h1>
        {restaurant.cuisine || restaurant.area ? (
          <p className="mt-1 text-sm text-ink-muted">
            {[restaurant.cuisine, restaurant.area].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {restaurant.address ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-dim">
            <MapPinIcon className="size-3.5 shrink-0 stroke-current" />
            {restaurant.address}
          </p>
        ) : null}

        {agg ? <ScoreBlock agg={agg} /> : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => navigate(`/r/${restaurant.id}/visit`)}
            className="pressable flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-bg shadow-[0_18px_40px_-12px_oklch(0.65_0.21_46_/_0.6)]"
            style={{
              background:
                "radial-gradient(120% 120% at 30% 25%, oklch(0.82 0.18 60) 0%, oklch(0.62 0.21 40) 80%)",
            }}
          >
            <PlusIcon className="size-5 stroke-bg [stroke-width:2.5]" />
            Log a visit
          </button>
        </div>

        {restaurant.notes ? (
          <p className="mt-4 rounded-2xl bg-bg-card/60 px-3.5 py-2.5 text-sm text-ink-muted ring-1 ring-inset ring-white/5">
            {restaurant.notes}
          </p>
        ) : null}
      </section>

      {dishes.length > 0 ? (
        <section className="mt-8 px-5">
          <h2 className="display text-lg text-ink">Dishes</h2>
          <p className="text-xs text-ink-dim">
            Every dish, every visit. Long-list the menu.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {dishes.map((d) => (
              <DishTile key={d.id} dish={d} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 px-5">
        <h2 className="display text-lg text-ink">Visits</h2>
        <p className="text-xs text-ink-dim">
          {visits.length === 0
            ? "No visits logged yet."
            : `${visits.length} logged visit${visits.length === 1 ? "" : "s"}.`}
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {visits.map((v) => (
            <VisitRow key={v.id} visit={v} />
          ))}
        </div>
      </section>
    </div>
  );
}

function HeroPhotoOrArt({
  photoId,
  seed,
  name,
}: {
  photoId?: string;
  seed: string;
  name: string;
}) {
  const url = usePhotoUrl(photoId);
  if (url) {
    return (
      <motion.img
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        src={url}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
    );
  }
  return (
    <div className="absolute inset-0">
      <PlaceholderArt seed={seed} name={name} />
    </div>
  );
}

function ScoreBlock({ agg }: { agg: NonNullable<ReturnType<typeof useAggregate>> }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <ScoreCard
        label="Clark"
        accent={USERS.clark.accent}
        value={agg.ratingByUser.clark}
        count={agg.visitCountByUser.clark}
      />
      <ScoreCard
        label="Angie"
        accent={USERS.angie.accent}
        value={agg.ratingByUser.angie}
        count={agg.visitCountByUser.angie}
      />
      {agg.combinedRating !== undefined ? (
        <div className="col-span-2 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-flame-500/15 via-flame-500/10 to-flame-300/10 px-4 py-3 ring-1 ring-inset ring-flame-400/20">
          <div>
            <p className="text-[11px] tracking-[0.18em] text-flame-200/80 uppercase">
              Combined
            </p>
            <p className="display text-3xl tabular-nums text-ink">
              {agg.combinedRating.toFixed(1)}
              <span className="text-base text-ink-faint">/5</span>
            </p>
          </div>
          <Stars value={agg.combinedRating} size="lg" />
        </div>
      ) : null}
    </div>
  );
}

function ScoreCard({
  label,
  accent,
  value,
  count,
}: {
  label: string;
  accent: string;
  value: number | undefined;
  count: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-bg-card px-3.5 py-3 ring-1 ring-inset ring-white/5">
      <div
        className="absolute -top-8 -right-8 size-24 rounded-full opacity-25 blur-2xl"
        style={{ background: accent }}
        aria-hidden="true"
      />
      <p className="text-[11px] tracking-[0.18em] text-ink-dim uppercase">
        {label}
      </p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className="display text-3xl tabular-nums text-ink">
          {value !== undefined ? value.toFixed(1) : "—"}
        </p>
        {value !== undefined ? (
          <span className="text-xs text-ink-faint">/5</span>
        ) : null}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <Stars value={value ?? 0} size="xs" />
        <span className="text-[11px] text-ink-dim">
          {count === 0
            ? "no visits"
            : `${count} visit${count === 1 ? "" : "s"}`}
        </span>
      </div>
    </div>
  );
}

function DishTile({ dish }: { dish: Dish }) {
  const url = usePhotoUrl(dish.photoId);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="overflow-hidden rounded-2xl bg-bg-card ring-1 ring-inset ring-white/5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-bg-soft">
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
                "linear-gradient(140deg, oklch(0.32 0.06 60), oklch(0.22 0.04 50))",
            }}
          >
            <span className="display text-3xl text-ink-faint">
              {dish.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute top-1.5 right-1.5">
          <UserChip id={dish.userId} size="xs" />
        </div>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-medium text-ink">
          {dish.name}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <Stars value={dish.rating} size="xs" />
          <span className="text-[11px] font-semibold tabular-nums text-ink-muted">
            {dish.rating.toFixed(1)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function VisitRow({ visit }: { visit: Visit }) {
  return (
    <Link
      to={`/r/${visit.restaurantId}/dish/${visit.id}`}
      className="pressable flex items-center gap-3 rounded-2xl bg-bg-card p-3 ring-1 ring-inset ring-white/5"
    >
      <UserChip id={visit.userId} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium text-ink">
            {formatDate(visit.date)}
          </p>
          <p className="shrink-0 text-[11px] text-ink-dim">
            {formatRelativeDate(visit.date)}
          </p>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Stars value={visit.rating ?? 0} size="xs" />
            {visit.rating !== undefined ? (
              <span className="text-[11px] tabular-nums text-ink-muted">
                {visit.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
          {visit.occasion ? (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] tracking-wide text-ink-dim uppercase">
              {visit.occasion}
            </span>
          ) : null}
        </div>
        {visit.notes ? (
          <p className="mt-1 line-clamp-2 text-xs text-ink-dim">
            {visit.notes}
          </p>
        ) : null}
      </div>
      <ChevronRightIcon className="size-5 shrink-0 stroke-ink-faint" />
    </Link>
  );
}
