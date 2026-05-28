import { AnimatePresence, motion } from "framer-motion";
import { USERS, type UserId, type VerdictMeta } from "~/data/types";
import { UserStars } from "./Stars";
import { Icon } from "./Icon";

export function VerdictBadge({
  verdict,
  size = "md",
}: {
  verdict: VerdictMeta;
  size?: "sm" | "md" | "lg";
}) {
  const cfg = VERDICT[verdict.status];
  const dims = {
    sm: { px: "px-2", py: "py-0.5", text: "text-[10px]", icon: 12 },
    md: { px: "px-2.5", py: "py-1", text: "text-[11px]", icon: 14 },
    lg: { px: "px-3", py: "py-1.5", text: "text-xs", icon: 16 },
  }[size];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold tracking-[0.16em] uppercase ${dims.px} ${dims.py} ${dims.text}`}
      style={{
        background: cfg.bg,
        color: cfg.fg,
        boxShadow: cfg.shadow,
      }}
    >
      <Icon name={cfg.icon} size={dims.icon} variant="fill" weight={700} color={cfg.fg} />
      {cfg.label}
    </span>
  );
}

const VERDICT = {
  locked: {
    label: "Locked",
    icon: "lock",
    bg: "oklch(0 0 0 / 0.06)",
    fg: "oklch(0.3 0 0)",
    shadow: "inset 0 0 0 1px oklch(0 0 0 / 0.08)",
  },
  solo: {
    label: "1 Fork",
    icon: "back_hand",
    bg: "oklch(0.94 0.18 116)",
    fg: "oklch(0.28 0.08 130)",
    shadow: "inset 0 0 0 1px oklch(0.5 0.15 122 / 0.25)",
  },
  unanimous: {
    label: "Unanimous",
    icon: "auto_awesome",
    bg: "oklch(0.91 0.24 117)",
    fg: "oklch(0.18 0.06 130)",
    shadow: "inset 0 0 0 1px oklch(0.5 0.15 122 / 0.35)",
  },
  split: {
    label: "Split",
    icon: "bolt",
    bg: "oklch(0.93 0.1 50)",
    fg: "oklch(0.32 0.12 40)",
    shadow: "inset 0 0 0 1px oklch(0.5 0.12 40 / 0.2)",
  },
  divided: {
    label: "Divided",
    icon: "bolt",
    bg: "oklch(0.93 0.14 25)",
    fg: "oklch(0.32 0.18 25)",
    shadow: "inset 0 0 0 1px oklch(0.55 0.18 25 / 0.3)",
  },
} as const;

/**
 * The hero "duel" — Clark's score on the left, Angie's score on the right,
 * verdict in the middle. When both have rated, the gap is shown as a divider
 * with optional fight-y flair.
 */
export function DuelScore({
  verdict,
  size = "md",
}: {
  verdict: VerdictMeta;
  size?: "sm" | "md" | "lg";
}) {
  const dims = {
    sm: { num: "text-2xl", lbl: "text-[10px]", gap: "gap-2" },
    md: { num: "text-3xl", lbl: "text-[11px]", gap: "gap-3" },
    lg: { num: "text-5xl", lbl: "text-xs", gap: "gap-4" },
  }[size];

  return (
    <div
      className={`grid grid-cols-[1fr_auto_1fr] items-center ${dims.gap}`}
    >
      <DuelSide
        user="a"
        value={verdict.clark}
        align="right"
        numClass={dims.num}
        lblClass={dims.lbl}
      />
      <DuelCenter verdict={verdict} size={size} />
      <DuelSide
        user="b"
        value={verdict.angie}
        align="left"
        numClass={dims.num}
        lblClass={dims.lbl}
      />
    </div>
  );
}

function DuelSide({
  user,
  value,
  align,
  numClass,
  lblClass,
}: {
  user: UserId;
  value: number | undefined;
  align: "left" | "right";
  numClass: string;
  lblClass: string;
}) {
  const u = USERS[user];
  return (
    <div
      className={`flex flex-col ${
        align === "right" ? "items-end" : "items-start"
      }`}
    >
      <div
        className={`flex items-center gap-1.5 ${
          align === "right" ? "flex-row" : "flex-row-reverse"
        }`}
      >
        <span
          className={`${lblClass} font-bold tracking-[0.14em] uppercase`}
          style={{ color: u.accent }}
        >
          {u.name}
        </span>
        <span
          className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ background: u.accent }}
        >
          {u.initial}
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span
          className={`display-tight tabular-nums ${numClass}`}
          style={{ color: value !== undefined ? "var(--color-ink)" : "var(--color-ink-faint)" }}
        >
          {value !== undefined ? value.toFixed(1) : "—"}
        </span>
        {value !== undefined ? (
          <span className="text-xs font-semibold text-ink-faint">/5</span>
        ) : null}
      </div>
      <div
        className={`mt-1 ${align === "right" ? "self-end" : "self-start"}`}
      >
        <UserStars user={user} value={value} size="sm" />
      </div>
    </div>
  );
}

function DuelCenter({
  verdict,
  size,
}: {
  verdict: VerdictMeta;
  size: "sm" | "md" | "lg";
}) {
  const big = size !== "sm";
  return (
    <div className="relative flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {verdict.status === "locked" ? (
          <motion.div
            key="locked"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className="flex size-12 items-center justify-center rounded-full bg-paper ring-1 ring-line"
          >
            <Icon name="lock" size={20} variant="fill" color="var(--color-ink-faint)" />
          </motion.div>
        ) : verdict.status === "solo" ? (
          <motion.div
            key="solo"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            className="flex size-12 items-center justify-center rounded-full bg-tennis-200 ring-1 ring-tennis-500/30"
          >
            <span className="display text-lg text-ink">vs</span>
          </motion.div>
        ) : (
          <motion.div
            key="dueling"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            className="relative"
          >
            <div
              className={`${big ? "size-14" : "size-12"} relative flex items-center justify-center rounded-full text-ink`}
              style={{
                background:
                  verdict.status === "unanimous"
                    ? "var(--color-tennis-300)"
                    : verdict.status === "divided"
                      ? "oklch(0.93 0.14 25)"
                      : "oklch(0.95 0.06 60)",
                boxShadow:
                  "inset 0 0 0 1px oklch(0 0 0 / 0.08), 0 8px 20px -10px oklch(0 0 0 / 0.2)",
              }}
            >
              <div className="flex flex-col items-center leading-none">
                <span className="display-tight tabular-nums text-[22px]">
                  {(verdict.combined ?? 0).toFixed(1)}
                </span>
                <span className="text-[8px] font-bold tracking-[0.16em] text-ink-muted uppercase">
                  Both
                </span>
              </div>
              {verdict.status === "divided" ? (
                <Icon
                  name="bolt"
                  size={18}
                  variant="fill"
                  className="absolute -top-1 -right-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                  color="var(--color-angie-500)"
                />
              ) : verdict.status === "unanimous" ? (
                <Icon
                  name="auto_awesome"
                  size={18}
                  variant="fill"
                  className="absolute -top-1 -right-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                  color="var(--color-tennis-700)"
                />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact pair-display: just two avatar + score chips side by side, used in cards.
 */
export function DuelInline({
  verdict,
  className = "",
}: {
  verdict: VerdictMeta;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <ScorePill user="a" value={verdict.clark} />
      <span className="text-xs font-bold text-ink-faint">vs</span>
      <ScorePill user="b" value={verdict.angie} />
    </div>
  );
}

function ScorePill({ user, value }: { user: UserId; value: number | undefined }) {
  const u = USERS[user];
  return (
    <div
      className="flex items-center gap-1 rounded-full bg-surface-2 py-0.5 pr-2 pl-0.5"
      style={{ boxShadow: "inset 0 0 0 1px oklch(0 0 0 / 0.06)" }}
    >
      <span
        className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ background: u.accent }}
      >
        {u.initial}
      </span>
      <span
        className="text-xs font-bold tabular-nums"
        style={{ color: value !== undefined ? "var(--color-ink)" : "var(--color-ink-faint)" }}
      >
        {value !== undefined ? value.toFixed(1) : "—"}
      </span>
    </div>
  );
}

/**
 * Horizontal disagreement bar — visual gap between Clark & Angie's scores.
 */
export function GapBar({ verdict }: { verdict: VerdictMeta }) {
  if (
    verdict.clark === undefined ||
    verdict.angie === undefined ||
    verdict.gap === undefined
  ) {
    return null;
  }
  // Position both stars on a 0-5 scale
  const c = verdict.clark / 5;
  const a = verdict.angie / 5;
  const min = Math.min(c, a);
  const max = Math.max(c, a);
  const cIsLower = c < a;

  return (
    <div className="relative h-10 w-full">
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-line" />
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
        style={{
          left: `${min * 100}%`,
          right: `${(1 - max) * 100}%`,
          background:
            verdict.gap > 1.5
              ? "oklch(0.7 0.18 25)"
              : verdict.gap > 0.5
                ? "oklch(0.78 0.14 60)"
                : "var(--color-tennis-500)",
        }}
      />
      <DuelDot pos={c} accent={USERS.a.accent} above={cIsLower} />
      <DuelDot pos={a} accent={USERS.b.accent} above={!cIsLower} />
    </div>
  );
}

function DuelDot({
  pos,
  accent,
  above,
}: {
  pos: number;
  accent: string;
  above: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-paper"
      style={{
        left: `${pos * 100}%`,
        background: accent,
        boxShadow: `0 4px 10px -2px ${accent}, inset 0 1px 0 rgba(255,255,255,0.35)`,
        marginTop: above ? -10 : 10,
      }}
    />
  );
}
