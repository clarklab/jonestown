import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { Header } from "~/components/Header";
import { Icon } from "~/components/Icon";
import { ScreenView, useScreen } from "~/components/Screen";
import { StarInput } from "~/components/Stars";
import { CompactPhotoButton } from "~/components/PhotoCapture";
import { useToast } from "~/components/Toast";
import { UserChip } from "~/components/UserChip";
import {
  useCurrentCouple,
  useCurrentUser,
  useRestaurants,
} from "~/data/hooks";
import { saveDish, savePhoto, saveVisit } from "~/data/db";
import {
  memberOf,
  type DishVerdict,
  type Restaurant,
  type UserId,
} from "~/data/types";
import { PassFailInput } from "~/components/PassFail";
import { PlaceholderArt } from "~/components/RestaurantCard";

interface PendingDish {
  tmpId: string;
  name: string;
  verdict: DishVerdict | undefined;
  notes: string;
  photoBlob: Blob | null;
}

export function AddVisitPage() {
  const { id: restaurantIdParam } = useParams<{ id: string }>();
  const restaurants = useRestaurants();
  const screen = useScreen("card");
  const couple = useCurrentCouple();
  const [user, setUser] = useCurrentUser();
  const toast = useToast();

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
        verdict: undefined,
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
    if (!restaurantId || !canSave || !couple) return;
    setSaving(true);
    const now = Date.now();
    const visitId = crypto.randomUUID();
    await saveVisit({
      id: visitId,
      coupleId: couple.id,
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
      if (d.photoBlob) photoId = await savePhoto(d.photoBlob, couple.id);
      await saveDish({
        id: crypto.randomUUID(),
        coupleId: couple.id,
        visitId,
        restaurantId,
        userId: user,
        name: d.name.trim(),
        verdict: d.verdict,
        notes: d.notes.trim() || undefined,
        photoId,
        createdAt: now,
      });
    }
    const savedDishes = dishes.filter((d) => d.name.trim()).length;
    toast.show(
      savedDishes > 0
        ? `Visit logged · ${savedDishes} dish${savedDishes === 1 ? "" : "es"}`
        : "Visit logged",
      { icon: "check_circle" },
    );
    // Hand the destination page a hint so it can pulse the just-saved visit.
    // Dismiss slides the card back down before the restaurant page takes over.
    screen.dismiss(`/r/${restaurantId}`, {
      state: { justSavedVisitId: visitId },
    });
  };

  // Back from this page lands at /r/:id when we entered via /r/:id/visit, or
  // home when we entered via the global /add picker. Either is a logical
  // parent — never the previous browser entry.
  const backTo = restaurantIdParam ? `/r/${restaurantIdParam}` : "/";

  if (restaurantPickerOpen) {
    return (
      <ScreenView screen={screen}>
        <RestaurantPicker
          restaurants={restaurants}
          onPick={(id) => {
            setRestaurantId(id);
            setRestaurantPickerOpen(false);
          }}
          onCancel={() => {
            // No restaurant chosen yet → the picker *is* the screen, so leaving
            // it leaves the whole card. Otherwise just close back to the form.
            if (!restaurantId) screen.dismiss(backTo);
            else setRestaurantPickerOpen(false);
          }}
        />
      </ScreenView>
    );
  }

  return (
    <ScreenView screen={screen}>
    <div className="pb-12">
      <Header
        back={backTo}
        onBack={() => screen.dismiss(backTo)}
        title="Log a visit"
        trailing={
          <button
            type="submit"
            form="visit-form"
            disabled={!canSave || saving}
            className="pressable relative flex items-center gap-1.5 rounded-full bg-tennis-300 px-3 py-1.5 text-sm font-bold text-ink ring-1 ring-inset ring-tennis-500/30 disabled:opacity-40"
          >
            <Icon name="check" size={18} weight={200} color="currentColor" />
            Save
            <span className="pointer-events-none absolute inset-0 -m-2" aria-hidden="true" />
          </button>
        }
      />

      <form id="visit-form" onSubmit={handleSubmit} className="px-4 pb-6">
        <RestaurantSelector
          restaurant={selectedRestaurant}
          onChange={() => setRestaurantPickerOpen(true)}
        />

        <Section title="Logging as" subtitle="Tap to switch whose half of the duel this is.">
          <UserToggle user={user} onChange={setUser} />
        </Section>

        <Section title="Your rating" subtitle="Just your half of the duel.">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-3 ring-1 ring-inset ring-line">
            <StarInput
              value={rating}
              onChange={setRating}
              size="lg"
              color={memberOf(couple, user).accent}
            />
            <span className="display-tight text-3xl tabular-nums text-ink">
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
            className="w-full rounded-2xl bg-surface px-3.5 py-3 text-base text-ink ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
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
            className="w-full resize-none rounded-2xl bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
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
            className="w-full rounded-2xl bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
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
              className="pressable relative flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-ink ring-1 ring-inset ring-line"
            >
              <Icon name="add" size={18} weight={200} color="currentColor" />
              Add dish
              <span className="pointer-events-none absolute inset-0 -m-2" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {dishes.length === 0 ? (
              <button
                type="button"
                onClick={addDish}
                className="pressable group flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-dashed ring-line"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-tennis-200 ring-1 ring-inset ring-tennis-500/30">
                  <Icon name="add" size={26} weight={200} color="var(--color-ink)" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-ink">Add your first dish</p>
                  <p className="text-xs text-ink-dim">Name it, rate it, photograph it.</p>
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
          className="pressable mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-tennis-300 py-3.5 text-base font-bold text-ink ring-1 ring-inset ring-tennis-500/30 shadow-[0_22px_50px_-12px_oklch(0.7_0.2_120_/_0.4)] disabled:opacity-40"
        >
          <Icon name="check" size={22} weight={200} color="var(--color-ink)" />
          {saving ? "Saving…" : "Save visit"}
        </button>
      </form>
    </div>
    </ScreenView>
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
      <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
        {title}
      </p>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p>
      ) : null}
      <div className="mt-2">{children}</div>
    </div>
  );
}

/**
 * Inline who's-reviewing switch. Tapping the other half flips the active user
 * right here on the form — no need to dip back into the header picker. The
 * highlight slides between the two via a shared `layoutId`.
 */
function UserToggle({
  user,
  onChange,
}: {
  user: UserId;
  onChange: (id: UserId) => void;
}) {
  const couple = useCurrentCouple();
  return (
    <div
      role="group"
      aria-label="Logging as"
      className="inline-flex items-center gap-1 rounded-2xl bg-surface p-1 ring-1 ring-inset ring-line"
    >
      {(["a", "b"] as UserId[]).map((slot) => {
        const m = memberOf(couple, slot);
        const active = user === slot;
        return (
          <button
            key={slot}
            type="button"
            onClick={() => onChange(slot)}
            aria-pressed={active}
            className="pressable relative flex items-center gap-2 rounded-xl px-3 py-2"
          >
            {active ? (
              <motion.span
                layoutId="user-toggle-active"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-xl bg-tennis-200 ring-1 ring-inset ring-tennis-500/30"
              />
            ) : null}
            <span className="relative z-10">
              <UserChip id={slot} size="sm" />
            </span>
            <span
              className={`relative z-10 text-sm font-bold transition-colors ${
                active ? "text-ink" : "text-ink-faint"
              }`}
            >
              {m.name}
            </span>
          </button>
        );
      })}
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
      <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
        Restaurant
      </p>
      <button
        type="button"
        onClick={onChange}
        className="pressable mt-2 flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left ring-1 ring-inset ring-line"
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
            <span className="rounded-full bg-tennis-200 px-2.5 py-1 text-[10px] font-bold tracking-wide text-ink uppercase">
              Change
            </span>
          </>
        ) : (
          <>
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-tennis-200 ring-1 ring-inset ring-tennis-500/30">
              <Icon name="search" size={22} color="var(--color-ink)" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">Choose a restaurant</p>
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
      className="rounded-2xl bg-surface p-3 ring-1 ring-inset ring-line"
    >
      <div className="flex gap-3">
        <CompactPhotoButton
          blob={dish.photoBlob}
          onChange={(b) => onChange({ photoBlob: b })}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
              Dish {index + 1}
            </p>
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove dish"
              className="pressable relative flex size-7 items-center justify-center rounded-full text-ink-faint hover:text-ink"
            >
              <Icon name="delete" size={18} color="currentColor" />
              <span className="pointer-events-none absolute inset-0 -m-2" aria-hidden="true" />
            </button>
          </div>
          <input
            type="text"
            name={`dish-name-${dish.tmpId}`}
            aria-label="Dish name"
            placeholder="Smoked brisket"
            value={dish.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="mt-0.5 w-full bg-transparent text-base font-bold text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <div className="mt-2">
            <PassFailInput
              value={dish.verdict}
              onChange={(v) => onChange({ verdict: v })}
              size="sm"
            />
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
        className="mt-2 w-full resize-none rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-faint ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
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
            className="pressable relative rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-ink-muted ring-1 ring-inset ring-line"
          >
            Cancel
            <span className="pointer-events-none absolute inset-0 -m-2" aria-hidden="true" />
          </button>
        }
      />
      <div className="px-4">
        <div className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5 ring-1 ring-inset ring-line">
          <Icon name="search" size={22} color="var(--color-ink-dim)" />
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
              className="pressable flex items-center gap-3 rounded-2xl bg-surface p-3 text-left ring-1 ring-inset ring-line"
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
