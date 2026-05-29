import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Icon } from "~/components/Icon";
import { BrandTile } from "~/components/BrandMark";

export function LandingPage() {
  return (
    <div className="relative isolate mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-12 pb-12 safe-bottom">
      <Splash />

      <header className="relative flex items-center gap-3">
        <BrandTile size={48} rounded={16} />
        <div>
          <p className="display-tight text-xl text-ink">Jonestown</p>
          <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
            Two-fork supper club
          </p>
        </div>
      </header>

      <div className="relative mt-12 flex-1">
        <p className="text-[11px] font-bold tracking-[0.22em] text-ink-dim uppercase">
          For two people, eating around one town
        </p>
        <h1 className="display-tight mt-2 text-[52px] leading-[0.92] tracking-tight text-balance text-ink">
          Eat the whole map,{" "}
          <span className="text-tennis-700">together</span>.
        </h1>
        <p className="mt-4 max-w-[42ch] text-pretty text-base text-ink-muted">
          A private review club for couples. Every restaurant in your town
          starts hidden. Both of you have to rate it before it unlocks. Argue
          honestly. Photograph everything.
        </p>

        <div className="mt-10 grid grid-cols-3 gap-3">
          <Feature icon="lock" label="Fog of war" sub="Unlock by rating" />
          <Feature icon="bolt" label="Duel ratings" sub="Two scores, one verdict" />
          <Feature icon="auto_awesome" label="Couple badge" sub="Yours alone" />
        </div>
      </div>

      <div className="relative mt-12 flex flex-col gap-3">
        <Link
          to="/claim"
          className="pressable flex items-center justify-center gap-2 rounded-2xl bg-tennis-300 py-4 text-base font-bold text-ink ring-1 ring-inset ring-tennis-500/30 shadow-[0_22px_50px_-12px_oklch(0.7_0.2_120_/_0.45)]"
        >
          <Icon name="add" size={22} weight={700} color="var(--color-ink)" />
          Start a new club
        </Link>
        <Link
          to="/join"
          className="pressable flex items-center justify-center gap-2 rounded-2xl bg-surface py-4 text-base font-bold text-ink ring-1 ring-inset ring-line"
        >
          <Icon name="login" size={22} weight={600} color="var(--color-ink)" />
          Join a partner
        </Link>
        <p className="mt-2 text-center text-xs text-ink-faint">
          Web app. Add to home screen for the full experience.
        </p>
      </div>
    </div>
  );
}

function Feature({
  icon,
  label,
  sub,
}: {
  icon: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-surface p-3 text-left ring-1 ring-inset ring-line">
      <div className="flex size-8 items-center justify-center rounded-xl bg-tennis-100 text-ink">
        <Icon name={icon} size={18} variant="fill" weight={600} />
      </div>
      <p className="mt-1 text-[12px] leading-tight font-bold text-ink">
        {label}
      </p>
      <p className="text-[10px] leading-tight text-ink-dim">{sub}</p>
    </div>
  );
}

function Splash() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="absolute -top-32 -right-32 size-[420px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, var(--color-tennis-200) 0%, transparent 100%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className="absolute top-[28rem] -left-32 size-[380px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.86 0.16 12 / 0.18) 0%, transparent 100%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="absolute top-[14rem] -right-24 size-[280px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.7 0.18 254 / 0.16) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
