import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Header } from "~/components/Header";
import { StarInput } from "~/components/Stars";
import { CompactPhotoButton } from "~/components/PhotoCapture";
import { UserChip } from "~/components/UserChip";
import { useCurrentUser, useRestaurants } from "~/data/hooks";
import {
  saveDish,
  savePhoto,
  saveVisit,
} from "~/data/db";
import type { Restaurant } from "~/data/types";
import { PlaceholderArt } from "~/components/RestaurantCard";

interface PendingDish {
  tmpId: string;
  name: string;
  rating: number;
  notes: string;
  photoBlob: Blob | null;
}

export function AddVisitPage() {
  const { id: restaurantIdParam } = useParams<{ id: string }>();
  const restaurants = useRestaurants();
  const navigate = useNavigate();
  const [user] = useCurrentUser();

  const [restaurantId, setRestaurantId] = useState<string | null>(
    restaurantIdParam ?? null,
  );
  const [date, setDate] = useState<number>(Date.now());
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [occasion, setOccasion] = useState("");
  const [dishes, setDishes] = useState<PendingDish[]>([]);
  const [saving, setSaving] = useState(false);
  const [restaurantPickerOpen, setRestaurantPickerOpen] = useState(
    !restaurantIdParam,
  );

  const selectedRestaurant = useMemo(
    () => restaurants.find((r) => r.id === restaurantId) ?? null,
    [restaurants, restaurantId],
  );

  useEffect(() => {
    if (restaurantIdParam) setRestaurantId(restaurantIdParam);
  }, [restaurantIdParam]);

  const addDish = () =>
    setDishes((ds) => [
      ...ds,
      {
        tmpId: crypto.randomUUID(),
        name: "",
        rating: 0,
        notes: "",
        photoBlob: null,
      },
    ]);
  const removeDish = (tmpId: string) =>
    setDishes((ds) => ds.filter((d) => d.tmpId !== tmpId));
  const patchDish = (tmpId: string, patch: Partial<PendingDish>) =>
    setDishes((ds) =>
      ds.map((d) => (d.tmpId === tmpId ? { ...d, ...patch } : d)),
    );

  const canSave =
    !!restaurantId && (rating > 0 || dishes.some((d) => d.name.trim()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !canSave) return;
    setSaving(true);
    const now = Date.now();
    const visitId = crypto.randomUUID();
    await saveVisit({
      id: visitId,
      restaurantId,
      userId: user,
      date,
      rating: rating > 0 ? rating : undefined,
      notes: notes.trim() || undefined,
      occasion: occasion.trim() || undefined,
      createdAt: now,
    });
    for (const d of dishes) {
      if (!d.name.trim()) continue;
      let photoId: string | undefined;
      if (d.photoBlob) photoId = await savePhoto(d.photoBlob);
      await saveDish({
        id: crypto.randomUUID(),
        visitId,
        restaurantId,
        userId: user,
        name: d.name.trim(),
        rating: d.rating,
        notes: d.notes.trim() || undefined,
        photoId,
        createdAt: now,
      });
    }
    navigate(`/r/${restaurantId}`);
  };

  if (restaurantPickerOpen) {
    return (
      <RestaurantPicker
        restaurants={restaurants}
        onPick={(id) => {
          setRestaurantId(id);
          setRestaurantPickerOpen(false);
        }}
        onCancel={() => {
          if (!restaurantId) navigate(-1);
          else setRestaurantPickerOpen(false);
        }}
      />
    );
  }

  return (
    <div className="pb-12">
      <Header
        back
        title="Log a visit"
        trailing={
          <button
            type="submit"
            form="visit-form"
            disabled={!canSave || saving}
            className="pressable relative flex items-center gap-1.5 rounded-full bg-flame-500/20 px-3 py-1.5 text-sm font-semibold text-flame-100 ring-1 ring-inset ring-flame-400/30 disabled:opacity-40"
          >
            <CheckIcon className="size-4 stroke-current [stroke-width:2.5]" />
            Save
            <span
              className="pointer-events-none absolute inset-0 -m-2"
              aria-hidden="true"
            />
          </button>
        }
      />

      <form id="visit-form" onSubmit={handleSubmit} className="px-4 pb-6">
        <RestaurantSelector
          restaurant={selectedRestaurant}
          onChange={() => setRestaurantPickerOpen(true)}
        />

        <Section title="Logging as">
          <UserBadge user={user} />
        </Section>

        <Section title="Overall rating" subtitle="How was the whole vibe?">
          <div className="flex items-center justify-between gap-3">
            <StarInput value={rating} onChange={setRating} size="lg" />
            <span className="display text-3xl tabular-nums text-ink">
              {rating > 0 ? rating.toFixed(1) : "—"}
            </span>
          </div>
        </Section>

        <Section title="When">
          <input
            type="date"
            name="date"
            aria-label="Date"
            value={toDateValue(date)}
            onChange={(e) => setDate(fromDateValue(e.target.value))}
            className="w-full rounded-xl bg-bg-card px-3.5 py-3 text-base text-ink ring-1 ring-inset ring-white/5 [color-scheme:dark] focus:outline-none focus-visible:ring-flame-400/40"
          />
        </Section>

        <Section title="Notes" subtitle="Quick thoughts, vibes, who came along.">
          <textarea
            name="notes"
            aria-label="Notes"
            placeholder="Patio was empty, music too loud, the wine list slaps…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl bg-bg-card px-3.5 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-white/5 focus:outline-none focus-visible:ring-flame-400/40"
          />
        </Section>

        <Section title="Occasion" subtitle="Optional. Date night, lunch, drop-in…">
          <input
            type="text"
            name="occasion"
            aria-label="Occasion"
            placeholder="Date night"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            className="w-full rounded-xl bg-bg-card px-3.5 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-white/5 focus:outline-none focus-visible:ring-flame-400/40"
          />
        </Section>

        <div className="mt-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="display text-xl text-ink">Dishes</p>
              <p className="text-xs text-ink-dim">
                Photograph everything. Future-you will thank you.
              </p>
            </div>
            <button
              type="button"
              onClick={addDish}
              className="pressable relative flex items-center gap-1.5 rounded-full bg-bg-card px-3 py-1.5 text-xs font-semibold text-ink-muted ring-1 ring-inset ring-white/5"
            >
              <PlusIcon className="size-4 stroke-current [stroke-width:2]" />
              Add dish
              <span
                className="pointer-events-none absolute inset-0 -m-2"
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {dishes.length === 0 ? (
              <button
                type="button"
                onClick={addDish}
                className="pressable group flex items-center gap-3 rounded-2xl bg-bg-card p-4 ring-1 ring-dashed ring-white/10"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-flame-500/10 ring-1 ring-inset ring-flame-400/20">
                  <PlusIcon className="size-6 stroke-flame-200 [stroke-width:2]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-ink">
                    Add your first dish
                  </p>
                  <p className="text-xs text-ink-dim">
                    Name it, rate it, photograph it.
                  </p>
                </div>
              </button>
            ) : (
              dishes.map((d, i) => (
                <PendingDishCard
                  key={d.tmpId}
                  dish={d}
                  index={i}
                  onChange={(patch) => patchDish(d.tmpId, patch)}
                  onRemove={() => removeDish(d.tmpId)}
                />
              ))
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSave || saving}
          className="pressable mt-8 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold text-bg shadow-[0_22px_50px_-12px_oklch(0.65_0.21_46_/_0.6)] disabled:opacity-40"
          style={{
            background:
              "radial-gradient(120% 120% at 30% 25%, oklch(0.82 0.18 60) 0%, oklch(0.62 0.21 40) 80%)",
          }}
        >
          <CheckIcon className="size-5 stroke-bg [stroke-width:2.5]" />
          {saving ? "Saving…" : "Save visit"}
        </button>
      </form>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <p className="text-[11px] tracking-[0.18em] text-ink-dim uppercase">
        {title}
      </p>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p>
      ) : null}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function UserBadge({ user }: { user: "clark" | "angie" }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl bg-bg-card px-3 py-2 ring-1 ring-inset ring-white/5">
      <UserChip id={user} size="md" />
      <span className="text-sm font-medium text-ink">
        {user === "clark" ? "Clark" : "Angie"}
      </span>
      <span className="text-xs text-ink-faint">switch in header</span>
    </div>
  );
}

function RestaurantSelector({
  restaurant,
  onChange,
}: {
  restaurant: Restaurant | null;
  onChange: () => void;
}) {
  return (
    <div className="mt-2">
      <p className="text-[11px] tracking-[0.18em] text-ink-dim uppercase">
        Restaurant
      </p>
      <button
        type="button"
        onClick={onChange}
        className="pressable mt-2 flex w-full items-center gap-3 rounded-2xl bg-bg-card p-3 text-left ring-1 ring-inset ring-white/5"
      >
        {restaurant ? (
          <>
            <div className="relative size-12 shrink-0 overflow-hidden rounded-xl">
              <PlaceholderArt seed={restaurant.id} name={restaurant.name} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="display truncate text-lg text-ink">
                {restaurant.name}
              </p>
              {restaurant.cuisine ? (
                <p className="truncate text-xs text-ink-dim">
                  {restaurant.cuisine}
                </p>
              ) : null}
            </div>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] tracking-wide text-ink-dim uppercase">
              Change
            </span>
          </>
        ) : (
          <>
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-flame-500/15 ring-1 ring-inset ring-flame-400/20">
              <MagnifyingGlassIcon className="size-5 stroke-flame-200" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">
                Choose a restaurant
              </p>
              <p className="text-xs text-ink-dim">From your Jonestown list</p>
            </div>
          </>
        )}
      </button>
    </div>
  );
}

function PendingDishCard({
  dish,
  index,
  onChange,
  onRemove,
}: {
  dish: PendingDish;
  index: number;
  onChange: (patch: Partial<PendingDish>) => void;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="rounded-2xl bg-bg-card p-3 ring-1 ring-inset ring-white/5"
    >
      <div className="flex gap-3">
        <CompactPhotoButton
          blob={dish.photoBlob}
          onChange={(b) => onChange({ photoBlob: b })}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] tracking-[0.18em] text-ink-dim uppercase">
              Dish {index + 1}
            </p>
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove dish"
              className="pressable relative flex size-7 items-center justify-center rounded-full text-ink-faint hover:text-ink"
            >
              <TrashIcon className="size-4 stroke-current" />
              <span
                className="pointer-events-none absolute inset-0 -m-2"
                aria-hidden="true"
              />
            </button>
          </div>
          <input
            type="text"
            name={`dish-name-${dish.tmpId}`}
            aria-label="Dish name"
            placeholder="Smoked brisket"
            value={dish.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="mt-0.5 w-full bg-transparent text-base font-medium text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <StarInput
              value={dish.rating}
              onChange={(v) => onChange({ rating: v })}
              size="md"
            />
            <span className="text-xs tabular-nums text-ink-muted">
              {dish.rating > 0 ? dish.rating.toFixed(1) : "—"}
            </span>
          </div>
        </div>
      </div>
      <textarea
        name={`dish-notes-${dish.tmpId}`}
        aria-label="Dish notes"
        placeholder="Pink-edged, peppery bark, a little dry on the flat…"
        value={dish.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        rows={2}
        className="mt-2 w-full resize-none rounded-xl bg-bg-soft px-3 py-2 text-sm text-ink placeholder:text-ink-faint ring-1 ring-inset ring-white/5 focus:outline-none focus-visible:ring-flame-400/40"
      />
    </motion.div>
  );
}

function RestaurantPicker({
  restaurants,
  onPick,
  onCancel,
}: {
  restaurants: Restaurant[];
  onPick: (id: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return restaurants;
    return restaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.cuisine?.toLowerCase().includes(q) ||
        r.area?.toLowerCase().includes(q),
    );
  }, [restaurants, query]);
  return (
    <div>
      <Header
        title="Choose a restaurant"
        trailing={
          <button
            type="button"
            onClick={onCancel}
            className="pressable relative rounded-full bg-bg-card/70 px-3 py-1.5 text-xs font-medium text-ink-muted ring-1 ring-inset ring-white/10"
          >
            Cancel
            <span
              className="pointer-events-none absolute inset-0 -m-2"
              aria-hidden="true"
            />
          </button>
        }
      />
      <div className="px-4">
        <div className="flex items-center gap-2 rounded-2xl bg-bg-card px-3 py-2.5 ring-1 ring-inset ring-white/5">
          <MagnifyingGlassIcon className="size-5 shrink-0 stroke-ink-dim" />
          <input
            type="search"
            name="q"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search restaurants"
            autoFocus
            className="w-full bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r.id)}
              className="pressable flex items-center gap-3 rounded-2xl bg-bg-card p-3 text-left ring-1 ring-inset ring-white/5"
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl">
                <PlaceholderArt seed={r.id} name={r.name} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="display truncate text-base text-ink">{r.name}</p>
                {r.cuisine || r.area ? (
                  <p className="truncate text-xs text-ink-dim">
                    {[r.cuisine, r.area].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function toDateValue(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fromDateValue(v: string) {
  const [y, m, d] = v.split("-").map(Number);
  const date = new Date();
  date.setFullYear(y, (m ?? 1) - 1, d ?? 1);
  date.setHours(12, 0, 0, 0);
  return date.getTime();
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}
