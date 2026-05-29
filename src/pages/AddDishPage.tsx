import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "~/components/Header";
import { Icon } from "~/components/Icon";
import { PassFailInput, VerdictPill } from "~/components/PassFail";
import { PhotoCapture } from "~/components/PhotoCapture";
import { useToast } from "~/components/Toast";
import { UserChip } from "~/components/UserChip";
import { useCurrentCouple, useCurrentUser, useDishes } from "~/data/hooks";
import { deleteDish, saveDish, savePhoto } from "~/data/db";
import { formatDateLong } from "~/utils/format";
import { getDb } from "~/data/db";
import { type DishVerdict, type Visit } from "~/data/types";

export function AddDishPage() {
  const { id: restaurantId, visitId } = useParams<{
    id: string;
    visitId: string;
  }>();
  const navigate = useNavigate();
  const couple = useCurrentCouple();
  const [user] = useCurrentUser();
  const toast = useToast();
  const existingDishes = useDishes({ visitId });
  const [visit, setVisit] = useState<Visit | null>(null);

  useEffect(() => {
    if (!visitId) return;
    void getDb().then((db) =>
      db.get("visits", visitId).then((v) => setVisit(v ?? null)),
    );
  }, [visitId]);

  const [name, setName] = useState("");
  const [verdict, setVerdict] = useState<DishVerdict | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);

  if (!restaurantId || !visitId) {
    return null;
  }

  const canSave = name.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !couple) return;
    setSaving(true);
    let photoId: string | undefined;
    if (photoBlob) photoId = await savePhoto(photoBlob, couple.id);
    const dishName = name.trim();
    await saveDish({
      id: crypto.randomUUID(),
      coupleId: couple.id,
      visitId,
      restaurantId,
      userId: user,
      name: dishName,
      verdict,
      notes: notes.trim() || undefined,
      photoId,
      createdAt: Date.now(),
    });
    setName("");
    setVerdict(undefined);
    setNotes("");
    setPhotoBlob(null);
    setSaving(false);
    toast.show(`${dishName} added`, { icon: "restaurant" });
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
            className="pressable relative flex items-center gap-1.5 rounded-full bg-tennis-300 px-3 py-1.5 text-sm font-bold text-ink ring-1 ring-inset ring-tennis-500/30 disabled:opacity-40"
          >
            <Icon name="check" size={18} weight={200} color="currentColor" />
            Add
            <span className="pointer-events-none absolute inset-0 -m-2" aria-hidden="true" />
          </button>
        }
      />

      <div className="px-4">
        {visit ? (
          <div className="rounded-2xl bg-surface p-3 ring-1 ring-inset ring-line">
            <div className="flex items-center gap-2">
              <UserChip id={visit.userId} size="sm" />
              <span className="text-sm font-bold text-ink-muted">
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
              className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase"
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
              className="mt-1.5 w-full rounded-2xl bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
            />
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
              Order again?
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">
              Skip if it was just meh.
            </p>
            <div className="mt-2">
              <PassFailInput value={verdict} onChange={setVerdict} size="md" />
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="dish-notes"
              className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase"
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
              className="mt-1.5 w-full resize-none rounded-2xl bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
            />
          </div>

          <button
            type="submit"
            disabled={!canSave || saving}
            className="pressable mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-tennis-300 py-3.5 text-base font-bold text-ink ring-1 ring-inset ring-tennis-500/30 shadow-[0_22px_50px_-12px_oklch(0.7_0.2_120_/_0.4)] disabled:opacity-40"
          >
            <Icon name="check" size={22} weight={200} color="var(--color-ink)" />
            {saving ? "Adding…" : "Add dish"}
          </button>
        </form>

        {existingDishes.length > 0 ? (
          <section className="mt-8">
            <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
              Dishes on this visit
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {existingDishes.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-inset ring-line"
                >
                  <UserChip id={d.userId} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{d.name}</p>
                    {d.notes ? (
                      <p className="line-clamp-1 text-[11px] text-ink-dim">
                        {d.notes}
                      </p>
                    ) : null}
                  </div>
                  <VerdictPill verdict={d.verdict} size="sm" showLabel={false} />
                  <button
                    type="button"
                    onClick={() => deleteDish(d.id)}
                    className="text-xs font-bold text-ink-faint hover:text-ink"
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
          className="mt-6 w-full rounded-2xl bg-surface py-3 text-sm font-bold text-ink-muted ring-1 ring-inset ring-line"
        >
          Done
        </button>
      </div>
    </div>
  );
}
