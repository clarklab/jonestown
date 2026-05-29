import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "~/components/Icon";
import { BrandTile } from "~/components/BrandMark";
import {
  ensureSeeded,
  getCoupleBySlug,
  saveCouple,
  setCurrentCoupleId,
  setCurrentUser,
} from "~/data/db";
import { lookupCoupleOnServer } from "~/data/sync";
import type { Couple, CoupleBadge, Member, MemberSlot } from "~/data/types";

export function JoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSlug = searchParams.get("slug") ?? "";
  const [slug, setSlug] = useState(initialSlug);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    slug: string;
    name: string;
    town: string;
    members: Member[];
    badge: CoupleBadge;
  } | null>(null);
  const [me, setMe] = useState<MemberSlot>("a");

  // Auto-lookup if slug was provided via URL.
  useEffect(() => {
    if (initialSlug) void handleLookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLookup = async () => {
    if (!slug.trim()) return;
    setBusy(true);
    setError(null);
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    // Try local first (in case the device already has this couple cached)
    const local = await getCoupleBySlug(cleanSlug);
    if (local) {
      setPreview({
        slug: local.slug,
        name: local.name,
        town: local.town,
        members: local.members,
        badge: local.badge,
      });
      setBusy(false);
      return;
    }
    const remote = await lookupCoupleOnServer(cleanSlug);
    if (!remote.found || !remote.couple) {
      setError(`No club called "${cleanSlug}". Check the code.`);
      setBusy(false);
      return;
    }
    setPreview({
      slug: remote.couple.slug,
      name: remote.couple.name,
      town: remote.couple.town,
      members: remote.couple.members as Member[],
      badge: remote.couple.badge as CoupleBadge,
    });
    setBusy(false);
  };

  const handleJoin = async () => {
    if (!preview) return;
    setBusy(true);
    const couple: Couple = {
      id: crypto.randomUUID(),
      slug: preview.slug,
      name: preview.name,
      town: preview.town,
      members: preview.members as [Member, Member],
      badge: preview.badge,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveCouple(couple);
    await setCurrentCoupleId(couple.id);
    await setCurrentUser(me);
    await ensureSeeded(couple.id);
    navigate("/", { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-10 pb-16 safe-bottom">
      <header className="flex items-center gap-3">
        <BrandTile size={48} rounded={16} />
        <div>
          <p className="display-tight text-xl text-ink">Jonestown</p>
          <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
            Two-fork supper club
          </p>
        </div>
      </header>

      <h1 className="display-tight mt-7 text-[34px] leading-[1] tracking-tight text-balance text-ink">
        Join your partner.
      </h1>
      <p className="mt-2 text-pretty text-sm text-ink-muted">
        Drop the club code your partner gave you. You'll see the same map,
        the same dishes, the same fights about who's right.
      </p>

      <div className="mt-7 flex flex-col gap-3">
        <div className="flex items-center rounded-2xl bg-surface ring-1 ring-inset ring-line focus-within:ring-tennis-500/40">
          <span className="pl-3 text-base font-bold text-ink-faint">/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
            }
            placeholder="clark-and-angie"
            autoFocus
            className="w-full bg-transparent px-2 py-3 text-base text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <button
            type="button"
            disabled={!slug || busy}
            onClick={handleLookup}
            className="pressable mr-1.5 my-1 rounded-full bg-tennis-300 px-3 py-2 text-xs font-bold text-ink ring-1 ring-inset ring-tennis-500/30 disabled:opacity-40"
          >
            {busy ? "…" : "Look up"}
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl bg-angie-50 px-3 py-2 text-sm font-medium text-angie-700 ring-1 ring-inset ring-angie-200">
            {error}
          </div>
        ) : null}

        {preview ? (
          <div className="mt-2 flex flex-col gap-3 rounded-3xl bg-surface p-4 ring-1 ring-inset ring-line">
            <div className="flex items-center gap-3">
              <div
                className="flex size-12 items-center justify-center rounded-2xl text-2xl ring-1 ring-inset ring-black/5"
                style={{ background: preview.badge.color }}
              >
                {preview.badge.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="display-tight truncate text-lg text-ink">
                  {preview.name}
                </p>
                <p className="text-xs text-ink-dim">{preview.town}</p>
              </div>
              <span className="rounded-full bg-tennis-100 px-2 py-0.5 text-[10px] font-bold tracking-[0.18em] text-tennis-700 uppercase">
                Found
              </span>
            </div>

            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
                Which one are you?
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {preview.members.map((m) => {
                  const active = me === m.slot;
                  return (
                    <button
                      key={m.slot}
                      type="button"
                      onClick={() => setMe(m.slot)}
                      className={`pressable relative flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold ring-1 ring-inset ${
                        active ? "ring-tennis-500/40" : "ring-line"
                      }`}
                      style={{
                        background: active
                          ? `linear-gradient(135deg, ${m.accent}22, transparent 80%)`
                          : "var(--color-surface)",
                      }}
                    >
                      <span
                        className="flex size-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ background: m.accent }}
                      >
                        {m.initial}
                      </span>
                      <span
                        style={{
                          color: active ? m.accent : "var(--color-ink)",
                        }}
                      >
                        {m.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={handleJoin}
              className="pressable flex w-full items-center justify-center gap-2 rounded-2xl bg-tennis-300 py-3.5 text-base font-bold text-ink ring-1 ring-inset ring-tennis-500/30 shadow-[0_22px_50px_-12px_oklch(0.7_0.2_120_/_0.45)] disabled:opacity-40"
            >
              <Icon name="check" size={22} weight={700} color="var(--color-ink)" />
              {busy ? "Joining…" : `Join as ${preview.members.find((m) => m.slot === me)?.name ?? ""}`}
            </button>
          </div>
        ) : null}

        <p className="mt-4 text-center text-sm text-ink-muted">
          Don't have a code?{" "}
          <Link
            to="/claim"
            className="font-bold text-ink underline underline-offset-2"
          >
            Start a new club
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
