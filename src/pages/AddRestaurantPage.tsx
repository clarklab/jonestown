import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "~/components/Header";
import { Icon } from "~/components/Icon";
import { PublicRatingChip } from "~/components/PublicRating";
import { useToast } from "~/components/Toast";
import { saveRestaurant } from "~/data/db";
import { useCurrentCouple, useRestaurants } from "~/data/hooks";
import { CATALOG_ENTRIES } from "~/data/seed";
import type { Restaurant } from "~/data/types";

/**
 * Adding a restaurant has two paths:
 *
 *   1. Autocomplete against the catalog (fastest). Type "taco" → tap a
 *      result → it joins your map with every metadata field already filled
 *      in (cuisine, area, address, public rating, outbound links).
 *
 *   2. Manual entry (fallback). For spots that aren't in the catalog yet —
 *      revealed via "Add manually" link below the search results.
 */
export function AddRestaurantPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const couple = useCurrentCouple();
  const existing = useRestaurants();
  const [query, setQuery] = useState("");
  const [manualOpen, setManualOpen] = useState(false);

  const existingIds = useMemo(
    () => new Set(existing.map((r) => r.id)),
    [existing],
  );

  // Catalog entries the couple doesn't already have on the map.
  const candidates = useMemo(
    () => CATALOG_ENTRIES.filter((c) => !existingIds.has(c.id)),
    [existingIds],
  );

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return candidates.slice(0, 8);
    return candidates
      .filter((c) => {
        const hay =
          `${c.name} ${c.cuisine ?? ""} ${c.area ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }, [candidates, query]);

  const addFromCatalog = async (entry: (typeof CATALOG_ENTRIES)[number]) => {
    if (!couple) return;
    await saveRestaurant({ ...entry, coupleId: couple.id });
    toast.show(`${entry.name} added to the map`, { icon: "add_location" });
    navigate(`/r/${entry.id}`, { state: { justAdded: true } });
  };

  return (
    <div className="pb-12">
      <Header back="/add" title="Add a restaurant" />

      <section className="px-4">
        <p className="text-sm text-ink-muted">
          Search your town's catalog. Tap to add — we'll fill in the address,
          links, and public rating for you.
        </p>

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5 ring-1 ring-inset ring-line focus-within:ring-tennis-500/40">
          <Icon name="search" size={22} color="var(--color-ink-dim)" />
          <input
            type="search"
            name="q"
            placeholder="Search restaurants, cuisine, area…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {results.length === 0 ? (
            <div className="rounded-2xl bg-surface p-4 text-center ring-1 ring-inset ring-line">
              <p className="display text-base text-ink">No match in catalog</p>
              <p className="mt-0.5 text-xs text-ink-dim">
                {query
                  ? `Nothing matches "${query}".`
                  : "Catalog is empty — try adding manually."}
              </p>
            </div>
          ) : (
            results.map((c) => (
              <CatalogRow
                key={c.id}
                entry={c}
                onAdd={() => void addFromCatalog(c)}
              />
            ))
          )}
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => setManualOpen((o) => !o)}
            className="pressable flex w-full items-center justify-between gap-3 rounded-2xl bg-surface-2 p-3 text-left ring-1 ring-inset ring-line"
          >
            <span className="flex items-center gap-2">
              <Icon name="edit" size={18} color="var(--color-ink)" />
              <span className="text-sm font-bold text-ink">
                Don't see it? Add manually
              </span>
            </span>
            <Icon
              name={manualOpen ? "expand_less" : "expand_more"}
              size={20}
              color="var(--color-ink-faint)"
            />
          </button>

          {manualOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="mt-3"
            >
              <ManualEntryForm
                onSaved={(r) => {
                  toast.show(`${r.name} added to the map`, {
                    icon: "add_location",
                  });
                  navigate(`/r/${r.id}`, { state: { justAdded: true } });
                }}
              />
            </motion.div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function CatalogRow({
  entry,
  onAdd,
}: {
  entry: (typeof CATALOG_ENTRIES)[number];
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="pressable flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left ring-1 ring-inset ring-line"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-tennis-100 ring-1 ring-inset ring-tennis-500/20">
        <Icon
          name="restaurant"
          size={22}
          variant="fill"
          color="var(--color-tennis-800)"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="display truncate text-base leading-tight text-ink">
          {entry.name}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {entry.cuisine || entry.area ? (
            <span className="truncate text-xs text-ink-dim">
              {[entry.cuisine, entry.area].filter(Boolean).join(" · ")}
            </span>
          ) : null}
          {entry.publicRating ? (
            <PublicRatingChip rating={entry.publicRating} size="sm" />
          ) : null}
        </div>
      </div>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tennis-300 text-ink ring-1 ring-inset ring-tennis-500/30">
        <Icon name="add" size={20} weight={300} color="var(--color-ink)" />
      </span>
    </button>
  );
}

function ManualEntryForm({
  onSaved,
}: {
  onSaved: (r: Restaurant) => void;
}) {
  const couple = useCurrentCouple();
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !couple) return;
    setSaving(true);
    const id = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);
    const restName = name.trim();
    const saved = await saveRestaurant({
      id,
      coupleId: couple.id,
      name: restName,
      cuisine: cuisine.trim() || undefined,
      area: area.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      links: website.trim() ? { website: website.trim() } : undefined,
    });
    onSaved(saved);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Field label="Name" required>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Burnt Ends Smokehouse"
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
      <Field label="Website">
        <input
          type="url"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-2xl bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
        />
      </Field>
      <Field label="Notes">
        <textarea
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Patio · drive-thru only · open late…"
          rows={2}
          className="w-full resize-none rounded-2xl bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
        />
      </Field>

      <button
        type="submit"
        disabled={!canSave || saving}
        className="pressable mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-tennis-300 py-3 text-base font-bold text-ink ring-1 ring-inset ring-tennis-500/30 disabled:opacity-40"
      >
        <Icon name="check" size={20} weight={300} color="var(--color-ink)" />
        {saving ? "Saving…" : "Save restaurant"}
      </button>
    </form>
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
