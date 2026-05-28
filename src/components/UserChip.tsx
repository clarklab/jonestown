import { USERS, type UserId } from "~/data/types";

export function UserChip({
  id,
  size = "md",
  showName = false,
}: {
  id: UserId;
  size?: "xs" | "sm" | "md" | "lg";
  showName?: boolean;
}) {
  const u = USERS[id];
  const dim = {
    xs: { box: "size-5", text: "text-[10px]" },
    sm: { box: "size-6", text: "text-[11px]" },
    md: { box: "size-7", text: "text-xs" },
    lg: { box: "size-9", text: "text-sm" },
  }[size];

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`${dim.box} relative flex items-center justify-center rounded-full font-semibold text-bg shadow-[inset_0_1px_0_oklch(1_0_0_/_0.4),_0_1px_2px_oklch(0_0_0_/_0.4)]`}
        style={{ background: u.accent }}
        aria-label={u.name}
      >
        <span className={`${dim.text} tracking-tight`}>{u.initial}</span>
      </div>
      {showName ? (
        <span className="text-sm font-medium text-ink">{u.name}</span>
      ) : null}
    </div>
  );
}

export function BothChip({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "size-5" : "size-7";
  const text = size === "sm" ? "text-[9px]" : "text-[10px]";
  return (
    <div className="relative flex items-center" aria-label="Both rated">
      <div
        className={`${dim} flex items-center justify-center rounded-full font-semibold text-bg shadow-[inset_0_1px_0_oklch(1_0_0_/_0.4)]`}
        style={{ background: USERS.clark.accent }}
      >
        <span className={text}>C</span>
      </div>
      <div
        className={`${dim} -ml-2 flex items-center justify-center rounded-full font-semibold text-bg ring-2 ring-bg shadow-[inset_0_1px_0_oklch(1_0_0_/_0.4)]`}
        style={{ background: USERS.angie.accent }}
      >
        <span className={text}>A</span>
      </div>
    </div>
  );
}
