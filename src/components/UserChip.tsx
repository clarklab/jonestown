import { USERS, type UserId } from "~/data/types";

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
  const u = USERS[id];
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
  const dim = size === "sm" ? "size-5" : size === "lg" ? "size-9" : "size-7";
  const text = size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs";
  return (
    <div className="flex items-center" aria-hidden="true">
      <div
        className={`${dim} flex items-center justify-center rounded-full font-bold text-white ring-2 ring-paper ${
          highlight === "clark" ? "scale-110" : ""
        }`}
        style={{ background: USERS.clark.accent }}
      >
        <span className={text}>C</span>
      </div>
      <div
        className={`${dim} -ml-2 flex items-center justify-center rounded-full font-bold text-white ring-2 ring-paper ${
          highlight === "angie" ? "scale-110" : ""
        }`}
        style={{ background: USERS.angie.accent }}
      >
        <span className={text}>A</span>
      </div>
    </div>
  );
}
