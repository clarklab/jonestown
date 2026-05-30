import { motion } from "framer-motion";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Header } from "~/components/Header";
import { Icon } from "~/components/Icon";
import { Stars, UserStars } from "~/components/Stars";
import { VerdictPill } from "~/components/PassFail";
import { UserChip } from "~/components/UserChip";
import { DuelScore, GapBar, VerdictBadge } from "~/components/Duel";
import { VsPublic } from "~/components/PublicRating";
import {
  useAggregate,
  useCurrentUser,
  useDishes,
  usePhotoUrl,
  useRestaurant,
  useVisits,
} from "~/data/hooks";
import { formatDate, formatRelativeDate } from "~/utils/format";
import { USERS, type Dish, type UserId, type Visit } from "~/data/types";
import { PlaceholderArt } from "~/components/RestaurantCard";

export function RestaurantPage() {
  const { id } = useParams<{ id: string }>();
  const restaurant = useRestaurant(id);
  const agg = useAggregate(id);
  const visits = useVisits(id);
  const dishes = useDishes({ restaurantId: id });
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser] = useCurrentUser();
  const justSavedVisitId = (location.state as { justSavedVisitId?: string } | null)
    ?.justSavedVisitId;

  if (!restaurant || !agg) {
    return (
      <div className="px-4 py-16 text-center">
        <Header back />
        <p className="mt-12 text-ink-muted">Restaurant not found.</p>
      </div>
    );
  }

  const verdict = agg.verdict;
  const heroPhoto = dishes.find((d) => d.photoId)?.photoId;
  const missingUser: UserId | null =
    verdict.status === "solo"
      ? verdict.clark === undefined
        ? "a"
        : "b"
      : null;

  return (
    <div className="relative pb-12">
      <Header back transparent />

      {/* Hero photo strip */}
      <section className="relative isolate -mt-16 h-64 overflow-hidden">
        <HeroPhotoOrArt photoId={heroPhoto} seed={restaurant.id} name={restaurant.name} />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, oklch(0 0 0 / 0.0) 30%, oklch(0.99 0.005 100 / 0.5) 75%, var(--color-paper) 100%)",
          }}
        />
      </section>

      <section className="relative -mt-16 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="display-tight text-[34px] leading-[1.04] tracking-tight text-balance text-ink">
              {restaurant.name}
            </h1>
            {restaurant.cuisine || restaurant.area ? (
              <p className="mt-0.5 text-sm font-medium text-ink-muted">
                {[restaurant.cuisine, restaurant.area]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
          <VerdictBadge verdict={verdict} size="md" />
        </div>

        {restaurant.address ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ink-dim">
            <Icon name="location_on" size={14} color="currentColor" />
            {restaurant.address}
          </p>
        ) : null}

        {/* The hero duel */}
        <div className="mt-5 rounded-3xl bg-surface p-5 ring-1 ring-inset ring-line">
          <DuelScore verdict={verdict} size="lg" />
          {verdict.clark !== undefined && verdict.angie !== undefined ? (
            <div className="mt-5">
              <GapBar verdict={verdict} />
              <p className="mt-1 text-center text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
                {verdict.status === "unanimous"
                  ? "agreed within ½ star"
                  : verdict.status === "split"
                    ? `split by ${verdict.gap?.toFixed(1)} stars`
                    : `divided by ${verdict.gap?.toFixed(1)} stars`}
              </p>
            </div>
          ) : verdict.status === "solo" && missingUser ? (
            <WaitingOn missing={missingUser} />
          ) : (
            <LockedNotice />
          )}
        </div>

        <VsPublic verdict={verdict} publicRating={restaurant.publicRating} />

        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate(`/r/${restaurant.id}/visit`)}
            className="pressable flex w-full items-center justify-center gap-2 rounded-2xl bg-tennis-300 py-3.5 text-base font-bold text-ink ring-1 ring-inset ring-tennis-500/30 shadow-[0_18px_40px_-12px_oklch(0.7_0.2_120_/_0.45)]"
          >
            <Icon name="add" size={22} weight={200} color="var(--color-ink)" />
            {missingUser === currentUser
              ? `Be the second fork`
              : agg.visitCountByUser[currentUser] > 0
                ? "Log another visit"
                : "Log your visit"}
          </button>
        </div>

        {restaurant.notes ? (
          <p className="mt-4 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm font-medium text-ink-muted ring-1 ring-inset ring-line">
            {restaurant.notes}
          </p>
        ) : null}
      </section>

      {/* Side-by-side per-user takes */}
      <section className="mt-8 px-4">
        <div className="px-1">
          <h2 className="display text-lg text-ink">The takes</h2>
          <p className="text-xs text-ink-dim">
            Each side of the booth, summarized.
          </p>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TakeCard
            user="a"
            rating={verdict.clark}
            visitCount={agg.visitCountByUser.a}
            dishes={dishes.filter((d) => d.userId === "a")}
            visits={visits.filter((v) => v.userId === "a")}
          />
          <TakeCard
            user="b"
            rating={verdict.angie}
            visitCount={agg.visitCountByUser.b}
            dishes={dishes.filter((d) => d.userId === "b")}
            visits={visits.filter((v) => v.userId === "b")}
          />
        </div>
      </section>

      {dishes.length > 0 ? (
        <section className="mt-8 px-5">
          <h2 className="display text-lg text-ink">Every dish ordered</h2>
          <p className="text-xs text-ink-dim">
            Two-fork menu. Tap into a visit to add more.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {dishes.map((d) => (
              <DishTile key={d.id} dish={d} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 px-5">
        <h2 className="display text-lg text-ink">Visit log</h2>
        <p className="text-xs text-ink-dim">
          {visits.length === 0
            ? "No visits logged yet."
            : `${visits.length} logged visit${visits.length === 1 ? "" : "s"}.`}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {visits.map((v) => (
            <VisitRow
              key={v.id}
              visit={v}
              justSaved={v.id === justSavedVisitId}
            />
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

function WaitingOn({ missing }: { missing: UserId }) {
  const u = USERS[missing];
  return (
    <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-surface-2 px-3 py-2 ring-1 ring-inset ring-line">
      <span
        className="flex size-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
        style={{ background: u.accent }}
      >
        {u.initial}
      </span>
      <span className="text-xs font-bold text-ink-muted">
        Waiting on {u.name} to weigh in.
      </span>
    </div>
  );
}

function LockedNotice() {
  return (
    <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-surface-2 px-3 py-2 ring-1 ring-inset ring-line">
      <Icon name="lock" size={16} variant="fill" color="var(--color-ink-faint)" />
      <span className="text-xs font-bold text-ink-muted">
        Both of you need to rate to unlock this on the map.
      </span>
    </div>
  );
}

function TakeCard({
  user,
  rating,
  visitCount,
  dishes,
  visits,
}: {
  user: UserId;
  rating: number | undefined;
  visitCount: number;
  dishes: Dish[];
  visits: Visit[];
}) {
  const u = USERS[user];
  const latestNote = visits.find((v) => v.notes)?.notes;
  // Surface the strongest-signal dish first: "yes" verdicts win.
  const topDish =
    dishes.find((d) => d.verdict === "yes") ??
    [...dishes].sort(
      (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    )[0];
  return (
    <div className="relative overflow-hidden rounded-3xl bg-surface p-4 ring-1 ring-inset ring-line">
      <div
        className="absolute -top-10 -right-10 size-32 rounded-full opacity-25 blur-2xl"
        style={{ background: u.accent }}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserChip id={user} size="md" />
          <span className="text-sm font-bold text-ink">{u.name}</span>
        </div>
        <span className="text-[10px] font-bold tracking-[0.16em] text-ink-faint uppercase">
          {visitCount === 0 ? "Not yet" : `${visitCount} visits`}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <p
          className="display-tight text-4xl tabular-nums"
          style={{
            color: rating !== undefined ? "var(--color-ink)" : "var(--color-ink-faint)",
          }}
        >
          {rating !== undefined ? rating.toFixed(1) : "—"}
        </p>
        {rating !== undefined ? (
          <span className="text-sm font-bold text-ink-faint">/5</span>
        ) : null}
      </div>
      <div className="mt-1">
        <UserStars user={user} value={rating} size="md" />
      </div>
      {topDish ? (
        <p className="mt-3 text-xs font-medium text-ink-muted">
          <span className="font-bold text-ink">Top dish:</span>{" "}
          {topDish.name}
        </p>
      ) : null}
      {latestNote ? (
        <p className="mt-2 line-clamp-3 text-xs text-ink-dim italic">
          "{latestNote}"
        </p>
      ) : null}
    </div>
  );
}

function DishTile({ dish }: { dish: Dish }) {
  const url = usePhotoUrl(dish.photoId);
  const u = USERS[dish.userId];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="overflow-hidden rounded-2xl bg-surface ring-1 ring-inset ring-line"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
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
            <span className="display-tight text-3xl text-ink/35">
              {dish.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute top-1.5 right-1.5">
          <UserChip id={dish.userId} size="xs" />
        </div>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-bold text-ink">
          {dish.name}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          {dish.verdict ? (
            <VerdictPill verdict={dish.verdict} size="sm" />
          ) : dish.rating !== undefined ? (
            // Legacy v1 data — keep showing the original star rating.
            <span className="flex items-center gap-1">
              <Stars value={dish.rating} size="xs" color={u.accent} />
              <span className="text-[10px] font-bold tabular-nums text-ink-muted">
                {dish.rating.toFixed(1)}
              </span>
            </span>
          ) : (
            <span className="text-[10px] font-bold tracking-wide text-ink-faint uppercase">
              Meh
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function VisitRow({ visit, justSaved }: { visit: Visit; justSaved?: boolean }) {
  const u = USERS[visit.userId];
  return (
    <motion.div
      initial={justSaved ? { scale: 0.98, opacity: 0.9 } : false}
      animate={
        justSaved
          ? {
              scale: [0.98, 1.02, 1],
              boxShadow: [
                "0 0 0 0px var(--color-tennis-500)",
                "0 0 0 6px oklch(0.86 0.24 119 / 0.5)",
                "0 0 0 0px var(--color-tennis-500)",
              ],
            }
          : {}
      }
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl"
    >
    <Link
      to={`/r/${visit.restaurantId}/dish/${visit.id}`}
      className={`pressable flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-inset ${
        justSaved ? "ring-tennis-500/40" : "ring-line"
      }`}
    >
      <UserChip id={visit.userId} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-bold text-ink">
            {formatDate(visit.date)}
          </p>
          <p className="shrink-0 text-[11px] font-medium text-ink-dim">
            {formatRelativeDate(visit.date)}
          </p>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Stars value={visit.rating ?? 0} size="xs" color={u.accent} />
            {visit.rating !== undefined ? (
              <span className="text-[11px] font-bold tabular-nums text-ink-muted">
                {visit.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
          {visit.occasion ? (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold tracking-wide text-ink-dim uppercase">
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
      <Icon name="chevron_right" size={22} color="var(--color-ink-faint)" />
    </Link>
    </motion.div>
  );
}
