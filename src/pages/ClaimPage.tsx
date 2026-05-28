import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Icon } from "~/components/Icon";
import {
  ensureSeeded,
  saveCouple,
  setCurrentCoupleId,
  setCurrentUser,
} from "~/data/db";
import { claimCoupleOnServer } from "~/data/sync";
import {
  COUPLE_BADGES,
  MEMBER_COLORS,
  type Couple,
  type CoupleBadge,
  type MemberSlot,
} from "~/data/types";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function ClaimPage() {
  const navigate = useNavigate();
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [town, setTown] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [accentA, setAccentA] = useState(MEMBER_COLORS[0].accent);
  const [accentB, setAccentB] = useState(MEMBER_COLORS[1].accent);
  const [badge, setBadge] = useState<CoupleBadge>(COUPLE_BADGES[0]);
  const [me, setMe] = useState<MemberSlot>("a");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computedSlug = useMemo(() => {
    if (slugTouched && slug) return slug;
    const base =
      nameA && nameB
        ? `${nameA}-and-${nameB}`
        : nameA || nameB || "";
    return slugify(base);
  }, [slug, slugTouched, nameA, nameB]);

  const canSubmit =
    nameA.trim().length > 0 &&
    nameB.trim().length > 0 &&
    computedSlug.length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);

    const a = nameA.trim();
    const b = nameB.trim();
    const cleanSlug = slugify(computedSlug);
    if (!cleanSlug) {
      setError("Pick a club code.");
      setSaving(false);
      return;
    }
    const couple: Couple = {
      id: crypto.randomUUID(),
      slug: cleanSlug,
      name: `${a} + ${b}`,
      town: town.trim() || "Your town",
      badge,
      members: [
        { slot: "a", name: a, initial: a.charAt(0).toUpperCase(), accent: accentA },
        { slot: "b", name: b, initial: b.charAt(0).toUpperCase(), accent: accentB },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const claim = await claimCoupleOnServer({
      slug: couple.slug,
      name: couple.name,
      town: couple.town,
      members: couple.members,
      badge: couple.badge,
    });
    if (!claim.ok && claim.reason === "taken") {
      setError(`The code "${cleanSlug}" is taken. Pick another.`);
      setSaving(false);
      return;
    }

    await saveCouple(couple);
    await setCurrentCoupleId(couple.id);
    await ensureSeeded(couple.id);
    await setCurrentUser(me);

    navigate("/", { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-10 pb-16 safe-bottom">
      <header className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-tennis-300 ring-1 ring-inset ring-black/5">
          <span className="display-tight text-[22px] leading-none">J</span>
        </div>
        <div>
          <p className="display-tight text-xl text-ink">Jonestown</p>
          <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
            Two-fork supper club
          </p>
        </div>
      </header>

      <h1 className="display-tight mt-7 text-[34px] leading-[1] tracking-tight text-balance text-ink">
        Start your club.
      </h1>
      <p className="mt-2 text-pretty text-sm text-ink-muted">
        Pick a code, pick your colors, pick the spot you call home. You'll
        be able to share the code with your partner so they can join.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Your name" required>
            <input
              type="text"
              name="nameA"
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              placeholder="Clark"
              autoFocus
              className="w-full rounded-2xl bg-surface px-3 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
            />
          </Field>
          <Field label="Their name" required>
            <input
              type="text"
              name="nameB"
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              placeholder="Angie"
              className="w-full rounded-2xl bg-surface px-3 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
            />
          </Field>
        </div>

        <Field label="Your town">
          <input
            type="text"
            name="town"
            value={town}
            onChange={(e) => setTown(e.target.value)}
            placeholder="Jonestown, TX 78645"
            className="w-full rounded-2xl bg-surface px-3 py-3 text-base text-ink placeholder:text-ink-faint ring-1 ring-inset ring-line focus:outline-none focus-visible:ring-tennis-500/40"
          />
          <p className="mt-1 text-xs text-ink-faint">
            Just for show on your map. You'll add real spots inside.
          </p>
        </Field>

        <Field label="Club code">
          <div className="flex items-center rounded-2xl bg-surface ring-1 ring-inset ring-line focus-within:ring-tennis-500/40">
            <span className="pl-3 text-base font-bold text-ink-faint">/</span>
            <input
              type="text"
              name="slug"
              value={computedSlug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugTouched(true);
              }}
              placeholder="clark-and-angie"
              className="w-full bg-transparent px-2 py-3 text-base text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            How partners find your club. Lowercase letters, numbers, and
            dashes only. Must be unique.
          </p>
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
            Your colors
          </legend>
          <div className="flex flex-col gap-2">
            <ColorRow
              name={nameA || "You"}
              selected={accentA}
              onPick={setAccentA}
              disabled={accentB}
            />
            <ColorRow
              name={nameB || "Them"}
              selected={accentB}
              onPick={setAccentB}
              disabled={accentA}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
            Your badge
          </legend>
          <div className="flex flex-wrap gap-2">
            {COUPLE_BADGES.map((b) => {
              const active =
                b.emoji === badge.emoji && b.color === badge.color;
              return (
                <button
                  key={b.emoji}
                  type="button"
                  onClick={() => setBadge(b)}
                  aria-label={`Badge ${b.emoji}`}
                  className={`pressable relative flex size-12 items-center justify-center rounded-2xl text-2xl ring-1 ring-inset ring-black/5 ${
                    active
                      ? "scale-105 ring-2 ring-tennis-500"
                      : ""
                  }`}
                  style={{ background: b.color }}
                >
                  <span>{b.emoji}</span>
                  {active ? (
                    <motion.span
                      layoutId="badge-active"
                      className="pointer-events-none absolute inset-0 rounded-2xl ring-[3px] ring-ink/15"
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
            Which one are you?
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["a", "b"] as MemberSlot[]).map((slot) => {
              const active = me === slot;
              const accent = slot === "a" ? accentA : accentB;
              const name =
                slot === "a" ? nameA || "You" : nameB || "Them";
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setMe(slot)}
                  className={`pressable relative flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold ring-1 ring-inset ${
                    active
                      ? "ring-tennis-500/40"
                      : "ring-line"
                  }`}
                  style={{
                    background: active
                      ? `linear-gradient(135deg, ${accent}22, transparent 80%)`
                      : "var(--color-surface)",
                  }}
                >
                  <span
                    className="flex size-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: accent }}
                  >
                    {(name.charAt(0) || "?").toUpperCase()}
                  </span>
                  <span style={{ color: active ? accent : "var(--color-ink)" }}>
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {error ? (
          <div className="rounded-2xl bg-angie-50 px-3 py-2 text-sm font-medium text-angie-700 ring-1 ring-inset ring-angie-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="pressable mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-tennis-300 py-3.5 text-base font-bold text-ink ring-1 ring-inset ring-tennis-500/30 shadow-[0_22px_50px_-12px_oklch(0.7_0.2_120_/_0.45)] disabled:opacity-40"
        >
          <Icon name="check" size={22} weight={700} color="var(--color-ink)" />
          {saving ? "Claiming…" : "Claim our club"}
        </button>

        <p className="text-center text-sm text-ink-muted">
          Already started?{" "}
          <Link
            to="/join"
            className="font-bold text-ink underline underline-offset-2"
          >
            Join your partner
          </Link>
          .
        </p>
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

function ColorRow({
  name,
  selected,
  onPick,
  disabled,
}: {
  name: string;
  selected: string;
  onPick: (accent: string) => void;
  disabled: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2 ring-1 ring-inset ring-line">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
        style={{ background: selected }}
      >
        {(name.charAt(0) || "?").toUpperCase()}
      </span>
      <span className="text-sm font-bold text-ink">{name}</span>
      <div className="no-scrollbar ml-auto flex gap-1.5 overflow-x-auto">
        {MEMBER_COLORS.map((c) => {
          const isSelected = c.accent === selected;
          const isOther = c.accent === disabled;
          return (
            <button
              key={c.id}
              type="button"
              disabled={isOther}
              onClick={() => onPick(c.accent)}
              aria-label={c.name}
              className={`relative size-7 shrink-0 rounded-full ring-1 ring-inset ring-black/10 transition-transform ${
                isSelected ? "scale-110 ring-2 ring-ink/40" : ""
              } ${isOther ? "opacity-25" : ""}`}
              style={{ background: c.accent }}
            />
          );
        })}
      </div>
    </div>
  );
}
