import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "~/components/Header";
import { Icon } from "~/components/Icon";
import { useToast } from "~/components/Toast";
import { saveRestaurant } from "~/data/db";

export function AddRestaurantPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    const id = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);
    const restName = name.trim();
    await saveRestaurant({
      id,
      name: restName,
      cuisine: cuisine.trim() || undefined,
      area: area.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    toast.show(`${restName} added to the map`, { icon: "add_location" });
    navigate(`/r/${id}`);
  };

  return (
    <div className="pb-12">
      <Header
        back
        title="Add restaurant"
        trailing={
          <button
            type="submit"
            form="restaurant-form"
            disabled={!canSave || saving}
            className="pressable relative flex items-center gap-1.5 rounded-full bg-tennis-300 px-3 py-1.5 text-sm font-bold text-ink ring-1 ring-inset ring-tennis-500/30 disabled:opacity-40"
          >
            <Icon name="check" size={18} weight={200} color="currentColor" />
            Save
            <span className="pointer-events-none absolute inset-0 -m-2" aria-hidden="true" />
          </button>
        }
      />
      <form
        id="restaurant-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 px-4"
      >
        <Field label="Name" required>
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Burnt Ends Smokehouse"
            autoFocus
            className="w-full rounded-2xl bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
          />
        </Field>
        <Field label="Cuisine">
          <input
            type="text"
            name="cuisine"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            placeholder="BBQ · Tex-Mex · Pizza"
            className="w-full rounded-2xl bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
          />
        </Field>
        <Field label="Area">
          <input
            type="text"
            name="area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Jonestown · Lago Vista · Lake Travis"
            className="w-full rounded-2xl bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
          />
        </Field>
        <Field label="Address">
          <input
            type="text"
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, city, ZIP"
            className="w-full rounded-2xl bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
          />
        </Field>
        <Field label="Notes">
          <textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Patio · drive-thru only · open late…"
            rows={3}
            className="w-full resize-none rounded-2xl bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
          />
        </Field>

        <button
          type="submit"
          disabled={!canSave || saving}
          className="pressable mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-tennis-300 py-3.5 text-base font-bold text-ink ring-1 ring-inset ring-tennis-500/30 shadow-[0_22px_50px_-12px_oklch(0.7_0.2_120_/_0.4)] disabled:opacity-40"
        >
          <Icon name="check" size={22} weight={200} color="var(--color-ink)" />
          {saving ? "Saving…" : "Save restaurant"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
        {label}
        {required ? <span className="ml-1 text-angie-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
