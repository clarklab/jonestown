import { useCurrentCouple } from "~/data/hooks";
import { memberOf, type UserId } from "~/data/types";

const SIZES = {
  xs: { box: "size-5", text: "text-[10px]" },
  sm: { box: "size-6", text: "text-[11px]" },
  md: { box: "size-7", text: "text-xs" },
  lg: { box: "size-9", text: "text-sm" },
  xl: { box: "size-12", text: "text-base" },
} as const;

export function UserChip({
  id,
  size = "md",
  showName = false,
  ring = false,
}: {
  id: UserId;
  size?: keyof typeof SIZES;
  showName?: boolean;
  ring?: boolean;
}) {
  const couple = useCurrentCouple();
  const u = memberOf(couple, id);
  const dim = SIZES[size];
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`${dim.box} relative flex shrink-0 items-center justify-center rounded-full font-bold text-white ${
          ring ? "ring-2 ring-white" : ""
        }`}
        style={{
          background: u.accent,
          boxShadow: "0 1px 0 rgba(0,0,0,0.05) inset, 0 1px 2px rgba(0,0,0,0.1)",
        }}
        aria-label={u.name}
      >
        <span className={`${dim.text} -mt-px tracking-tight`}>{u.initial}</span>
      </div>
      {showName ? (
        <span className="text-sm font-semibold text-ink">{u.name}</span>
      ) : null}
    </div>
  );
}

export function DuelAvatars({
  size = "md",
  highlight,
}: {
  size?: "sm" | "md" | "lg";
  highlight?: UserId;
}) {
  const couple = useCurrentCouple();
  const a = memberOf(couple, "a");
  const b = memberOf(couple, "b");
  const dim = size === "sm" ? "size-5" : size === "lg" ? "size-9" : "size-7";
  const text =
    size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs";
  return (
    <div className="flex items-center" aria-hidden="true">
      <div
        className={`${dim} flex items-center justify-center rounded-full font-bold text-white ring-2 ring-paper ${
          highlight === "a" ? "scale-110" : ""
        }`}
        style={{ background: a.accent }}
      >
        <span className={text}>{a.initial}</span>
      </div>
      <div
        className={`${dim} -ml-2 flex items-center justify-center rounded-full font-bold text-white ring-2 ring-paper ${
          highlight === "b" ? "scale-110" : ""
        }`}
        style={{ background: b.accent }}
      >
        <span className={text}>{b.initial}</span>
      </div>
    </div>
  );
}

/** Couple-wide badge: the emoji + accent color set during onboarding. */
export function CoupleBadge({
  size = "md",
}: {
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const couple = useCurrentCouple();
  const sizes = {
    sm: { box: "size-7", text: "text-base" },
    md: { box: "size-9", text: "text-lg" },
    lg: { box: "size-12", text: "text-2xl" },
    xl: { box: "size-16", text: "text-3xl" },
  }[size];
  if (!couple) {
    return (
      <div
        className={`${sizes.box} rounded-[24%] bg-tennis-300`}
        aria-hidden="true"
      />
    );
  }
  return (
    <div
      className={`${sizes.box} relative flex items-center justify-center rounded-[24%] ring-1 ring-inset ring-black/5`}
      style={{ background: couple.badge.color }}
      aria-label={couple.name}
    >
      <span className={sizes.text}>{couple.badge.emoji}</span>
    </div>
  );
}
