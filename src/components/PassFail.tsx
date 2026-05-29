import { motion } from "framer-motion";
import { Icon } from "./Icon";
import type { DishVerdict } from "~/data/types";

const TONE = {
  yes: {
    bg: "var(--color-tennis-300)",
    bgIdle: "var(--color-surface)",
    text: "var(--color-ink)",
    textIdle: "var(--color-ink-muted)",
    ring: "var(--color-tennis-500)",
    icon: "thumb_up",
    label: "Order again",
  },
  no: {
    bg: "oklch(0.88 0.13 25)",
    bgIdle: "var(--color-surface)",
    text: "oklch(0.28 0.16 25)",
    textIdle: "var(--color-ink-muted)",
    ring: "oklch(0.6 0.21 25)",
    icon: "thumb_down",
    label: "Pass",
  },
} as const;

/**
 * Pass/fail dish verdict toggle. Either button can be toggled off by tapping
 * again, returning to undefined ("meh"). Tapping the opposite swaps cleanly.
 */
export function PassFailInput({
  value,
  onChange,
  size = "md",
  layout = "row",
}: {
  value: DishVerdict | undefined;
  onChange: (next: DishVerdict | undefined) => void;
  size?: "sm" | "md";
  layout?: "row" | "stack";
}) {
  const dims = {
    sm: { py: "py-1.5", px: "px-3", text: "text-[12px]", icon: 14 },
    md: { py: "py-2", px: "px-3", text: "text-[13px]", icon: 16 },
  }[size];

  const toggle = (which: DishVerdict) => {
    onChange(value === which ? undefined : which);
  };

  const buttons: DishVerdict[] = ["yes", "no"];

  return (
    <div
      className={`flex gap-1.5 ${layout === "stack" ? "flex-col" : "flex-row"}`}
      role="radiogroup"
      aria-label="Would order again"
    >
      {buttons.map((kind) => {
        const t = TONE[kind];
        const active = value === kind;
        return (
          <motion.button
            key={kind}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t.label}
            onClick={() => toggle(kind)}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 480, damping: 22 }}
            className={`pressable relative flex flex-1 items-center justify-center gap-1.5 rounded-full font-bold ring-1 ring-inset ${dims.py} ${dims.px} ${dims.text}`}
            style={{
              background: active ? t.bg : t.bgIdle,
              color: active ? t.text : t.textIdle,
              boxShadow: active
                ? `inset 0 0 0 1.5px ${t.ring}, 0 6px 14px -8px ${t.ring}`
                : `inset 0 0 0 1px var(--color-line)`,
            }}
          >
            <Icon
              name={t.icon}
              size={dims.icon}
              variant={active ? "fill" : "outline"}
              weight={200}
              color="currentColor"
            />
            {t.label}
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Inline verdict pill — small read-only badge used in dish tiles and the
 * log feed. Renders nothing for "meh" so the UI stays calm.
 */
export function VerdictPill({
  verdict,
  size = "sm",
  showLabel = true,
}: {
  verdict: DishVerdict | undefined;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}) {
  if (!verdict) return null;
  const t = TONE[verdict];
  const dims = {
    xs: { py: "py-0.5", px: "px-1.5", text: "text-[9px]", icon: 10 },
    sm: { py: "py-0.5", px: "px-2", text: "text-[10px]", icon: 12 },
    md: { py: "py-1", px: "px-2.5", text: "text-[11px]", icon: 14 },
  }[size];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold tracking-tight ${dims.py} ${dims.px} ${dims.text}`}
      style={{ background: t.bg, color: t.text }}
    >
      <Icon
        name={t.icon}
        size={dims.icon}
        variant="fill"
        weight={200}
        color="currentColor"
      />
      {showLabel ? t.label : null}
    </span>
  );
}
