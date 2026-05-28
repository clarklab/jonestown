import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckIcon } from "@heroicons/react/24/outline";
import { Header } from "~/components/Header";
import { Stars, StarInput } from "~/components/Stars";
import { PhotoCapture } from "~/components/PhotoCapture";
import { UserChip } from "~/components/UserChip";
import { useCurrentUser, useDishes } from "~/data/hooks";
import { deleteDish, saveDish, savePhoto } from "~/data/db";
import { formatDateLong } from "~/utils/format";
import { getDb } from "~/data/db";
import type { Visit } from "~/data/types";

export function AddDishPage() {
  const { id: restaurantId, visitId } = useParams<{
    id: string;
    visitId: string;
  }>();
  const navigate = useNavigate();
  const [user] = useCurrentUser();
  const existingDishes = useDishes({ visitId });
  const [visit, setVisit] = useState<Visit | null>(null);

  useEffect(() => {
    if (!visitId) return;
    void getDb().then((db) => db.get("visits", visitId).then((v) => setVisit(v ?? null)));
  }, [visitId]);

  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);

  if (!restaurantId || !visitId) {
    return null;
  }

  const canSave = name.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    let photoId: string | undefined;
    if (photoBlob) photoId = await savePhoto(photoBlob);
    await saveDish({
      id: crypto.randomUUID(),
      visitId,
      restaurantId,
      userId: user,
      name: name.trim(),
      rating,
      notes: notes.trim() || undefined,
      photoId,
      createdAt: Date.now(),
    });
    setName("");
    setRating(0);
    setNotes("");
    setPhotoBlob(null);
    setSaving(false);
  };

  return (
    <div className="pb-12">
      <Header
        back
        title="Add a dish"
        trailing={
          <button
            type="submit"
            form="dish-form"
            disabled={!canSave || saving}
            className="pressable relative flex items-center gap-1.5 rounded-full bg-flame-500/20 px-3 py-1.5 text-sm font-semibold text-flame-100 ring-1 ring-inset ring-flame-400/30 disabled:opacity-40"
          >
            <CheckIcon className="size-4 stroke-current [stroke-width:2.5]" />
            Add
            <span
              className="pointer-events-none absolute inset-0 -m-2"
              aria-hidden="true"
            />
          </button>
        }
      />

      <div className="px-4">
        {visit ? (
          <div className="rounded-2xl bg-bg-card p-3 ring-1 ring-inset ring-white/5">
            <div className="flex items-center gap-2">
              <UserChip id={visit.userId} size="sm" />
              <span className="text-sm text-ink-muted">
                {formatDateLong(visit.date)}
              </span>
            </div>
            {visit.notes ? (
              <p className="mt-1.5 line-clamp-2 text-xs text-ink-dim">
                {visit.notes}
              </p>
            ) : null}
          </div>
        ) : null}

        <form id="dish-form" onSubmit={handleSubmit} className="mt-5">
          <PhotoCapture blob={photoBlob} onChange={setPhotoBlob} />

          <div className="mt-5">
            <label
              htmlFor="dish-name"
              className="text-[11px] tracking-[0.18em] text-ink-dim uppercase"
            >
              Dish name
            </label>
            <input
              id="dish-name"
              type="text"
              name="dish-name"
              placeholder="Spicy tuna roll"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="mt-1.5 w-full rounded-xl bg-bg-card px-3.5 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-white/5 focus:outline-none focus-visible:ring-flame-400/40"
            />
          </div>

          <div className="mt-5">
            <p className="text-[11px] tracking-[0.18em] text-ink-dim uppercase">
              Rating
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <StarInput value={rating} onChange={setRating} size="lg" />
              <span className="display text-3xl tabular-nums text-ink">
                {rating > 0 ? rating.toFixed(1) : "—"}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="dish-notes"
              className="text-[11px] tracking-[0.18em] text-ink-dim uppercase"
            >
              Notes
            </label>
            <textarea
              id="dish-notes"
              name="dish-notes"
              placeholder="Get it again? What was special?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1.5 w-full resize-none rounded-xl bg-bg-card px-3.5 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-white/5 focus:outline-none focus-visible:ring-flame-400/40"
            />
          </div>

          <button
            type="submit"
            disabled={!canSave || saving}
            className="pressable mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold text-bg shadow-[0_22px_50px_-12px_oklch(0.65_0.21_46_/_0.6)] disabled:opacity-40"
            style={{
              background:
                "radial-gradient(120% 120% at 30% 25%, oklch(0.82 0.18 60) 0%, oklch(0.62 0.21 40) 80%)",
            }}
          >
            <CheckIcon className="size-5 stroke-bg [stroke-width:2.5]" />
            {saving ? "Adding…" : "Add dish"}
          </button>
        </form>

        {existingDishes.length > 0 ? (
          <section className="mt-8">
            <p className="text-[11px] tracking-[0.18em] text-ink-dim uppercase">
              Dishes on this visit
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {existingDishes.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-2xl bg-bg-card p-3 ring-1 ring-inset ring-white/5"
                >
                  <UserChip id={d.userId} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {d.name}
                    </p>
                    <Stars value={d.rating} size="xs" />
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                    {d.rating.toFixed(1)}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteDish(d.id)}
                    className="text-xs text-ink-faint hover:text-ink"
                    aria-label={`Remove ${d.name}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <button
          type="button"
          onClick={() => navigate(`/r/${restaurantId}`)}
          className="mt-6 w-full rounded-xl bg-bg-card py-3 text-sm font-medium text-ink-muted ring-1 ring-inset ring-white/5"
        >
          Done
        </button>
      </div>
    </div>
  );
}
