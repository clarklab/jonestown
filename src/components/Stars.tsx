import { motion } from "framer-motion";
import { USERS, type UserId } from "~/data/types";

const SIZES = {
  xs: { star: "size-3", gap: "gap-0" },
  sm: { star: "size-3.5", gap: "gap-px" },
  md: { star: "size-4", gap: "gap-px" },
  lg: { star: "size-5", gap: "gap-0.5" },
} as const;

type Size = keyof typeof SIZES;

export function Stars({
  value,
  size = "md",
  color = "var(--color-tennis-500)",
  empty = "oklch(0 0 0 / 0.08)",
  outline = "oklch(0 0 0 / 0.12)",
}: {
  value: number | undefined;
  size?: Size;
  color?: string;
  empty?: string;
  outline?: string;
}) {
  const v = value ?? 0;
  const dim = SIZES[size];
  return (
    <div className={`flex shrink-0 items-center ${dim.gap}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <StarGlyph
          key={i}
          fill={Math.max(0, Math.min(1, v - i))}
          className={dim.star}
          color={color}
          empty={empty}
          outline={outline}
        />
      ))}
    </div>
  );
}

export function UserStars({
  user,
  value,
  size = "md",
}: {
  user: UserId;
  value: number | undefined;
  size?: Size;
}) {
  return <Stars value={value} size={size} color={USERS[user].accent} />;
}

function StarGlyph({
  fill,
  className,
  color,
  empty,
  outline,
}: {
  fill: number;
  className: string;
  color: string;
  empty: string;
  outline: string;
}) {
  const id = `s-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset={`${fill * 100}%`} stopColor={color} />
          <stop offset={`${fill * 100}%`} stopColor={empty} />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5l2.59 6.06 6.58.56-4.98 4.32 1.5 6.43L12 16.62 6.31 19.87l1.5-6.43L2.83 9.12l6.58-.56L12 2.5z"
        fill={`url(#${id})`}
        stroke={outline}
        strokeWidth="0.7"
      />
    </svg>
  );
}

export function StarInput({
  value,
  onChange,
  size = "lg",
  color = "var(--color-tennis-500)",
  step = 0.5,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "md" | "lg" | "xl";
  color?: string;
  step?: 0.5 | 1;
}) {
  const sizes = {
    md: "size-7",
    lg: "size-10",
    xl: "size-14",
  };
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarButton
          key={i}
          index={i}
          fill={Math.max(0, Math.min(1, value - (i - 1)))}
          color={color}
          step={step}
          sizeClass={sizes[size]}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

function StarButton({
  index,
  fill,
  color,
  step,
  sizeClass,
  onChange,
}: {
  index: number;
  fill: number;
  color: string;
  step: 0.5 | 1;
  sizeClass: string;
  onChange: (v: number) => void;
}) {
  const id = `si-${index}-${Math.round(fill * 100)}-${Math.random().toString(36).slice(2, 6)}`;
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (step === 1) return onChange(index);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onChange(x < rect.width / 2 ? index - 0.5 : index);
  };
  return (
    <motion.button
      type="button"
      role="radio"
      aria-label={`${index} stars`}
      aria-checked={fill > 0}
      onClick={handleClick}
      whileTap={{ scale: 0.84 }}
      transition={{ type: "spring", stiffness: 800, damping: 22 }}
      className={`${sizeClass} relative flex items-center justify-center rounded-full focus:outline-none focus-visible:outline-2 focus-visible:outline-tennis-500 focus-visible:outline-offset-4`}
    >
      <svg viewBox="0 0 24 24" className="size-full">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset={`${fill * 100}%`} stopColor={color} />
            <stop offset={`${fill * 100}%`} stopColor="oklch(0 0 0 / 0.07)" />
          </linearGradient>
        </defs>
        <path
          d="M12 2l2.86 6.7 7.14.6-5.43 4.7 1.65 7.0L12 17.27 5.78 21l1.65-7L2 9.3l7.14-.6L12 2z"
          fill={`url(#${id})`}
          stroke="oklch(0 0 0 / 0.18)"
          strokeWidth="0.8"
        />
      </svg>
      <span
        className="pointer-events-none absolute inset-0 -m-2"
        aria-hidden="true"
      />
    </motion.button>
  );
}
