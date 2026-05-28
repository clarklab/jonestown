import { motion } from "framer-motion";

export function Stars({
  value,
  size = "md",
  showEmpty = true,
}: {
  value: number | undefined;
  size?: "xs" | "sm" | "md" | "lg";
  showEmpty?: boolean;
}) {
  const v = value ?? 0;
  const sizes = {
    xs: "size-3",
    sm: "size-3.5",
    md: "size-4",
    lg: "size-5",
  };
  if (value === undefined && !showEmpty) return null;
  return (
    <div className="flex shrink-0 items-center gap-px">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, v - i));
        return (
          <StarGlyph
            key={i}
            fill={fill}
            className={sizes[size]}
          />
        );
      })}
    </div>
  );
}

function StarGlyph({ fill, className }: { fill: number; className: string }) {
  const id = `star-grad-${Math.round(fill * 100)}-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset={`${fill * 100}%`} stopColor="var(--color-gold)" />
          <stop offset={`${fill * 100}%`} stopColor="oklch(1 0 0 / 0.16)" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5l2.59 6.06 6.58.56-4.98 4.32 1.5 6.43L12 16.62 6.31 19.87l1.5-6.43L2.83 9.12l6.58-.56L12 2.5z"
        fill={`url(#${id})`}
        stroke="oklch(1 0 0 / 0.1)"
        strokeWidth="0.6"
      />
    </svg>
  );
}

export function StarInput({
  value,
  onChange,
  size = "lg",
  step = 0.5,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "md" | "lg" | "xl";
  step?: 0.5 | 1;
}) {
  const sizes = {
    md: "size-7",
    lg: "size-10",
    xl: "size-12",
  };
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <StarButton
            key={i}
            index={i}
            fill={fill}
            step={step}
            sizeClass={sizes[size]}
            onChange={onChange}
          />
        );
      })}
    </div>
  );
}

function StarButton({
  index,
  fill,
  step,
  sizeClass,
  onChange,
}: {
  index: number;
  fill: number;
  step: 0.5 | 1;
  sizeClass: string;
  onChange: (v: number) => void;
}) {
  const id = `star-input-${index}-${Math.round(fill * 100)}`;
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (step === 1) {
      onChange(index);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const half = x < rect.width / 2;
    onChange(half ? index - 0.5 : index);
  };
  return (
    <motion.button
      type="button"
      role="radio"
      aria-label={`${index} stars`}
      aria-checked={fill > 0}
      onClick={handleClick}
      whileTap={{ scale: 0.86 }}
      transition={{ type: "spring", stiffness: 800, damping: 22 }}
      className={`${sizeClass} relative flex items-center justify-center rounded-full focus:outline-none focus-visible:outline-2 focus-visible:outline-flame-500 focus-visible:outline-offset-4`}
    >
      <svg viewBox="0 0 24 24" className="size-full">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset={`${fill * 100}%`} stopColor="var(--color-gold)" />
            <stop offset={`${fill * 100}%`} stopColor="oklch(1 0 0 / 0.13)" />
          </linearGradient>
        </defs>
        <path
          d="M12 2l2.86 6.7 7.14.6-5.43 4.7 1.65 7.0L12 17.27 5.78 21l1.65-7L2 9.3l7.14-.6L12 2z"
          fill={`url(#${id})`}
          stroke="oklch(1 0 0 / 0.22)"
          strokeWidth="0.7"
        />
      </svg>
      <span
        className="pointer-events-none absolute inset-0 -m-2"
        aria-hidden="true"
      />
    </motion.button>
  );
}
