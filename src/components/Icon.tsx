import type { CSSProperties } from "react";

type Variant = "outline" | "fill" | "bold";

interface IconProps {
  name: string;
  size?: number; // px, used as both font-size and width/height
  variant?: Variant;
  /**
   * Material Symbols stroke weight. We standardize on the light 200 grade
   * across the app for a refined, airy icon language.
   */
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  className?: string;
  color?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}

/**
 * Google Material Symbols Rounded. The icon name is the symbol id from
 * fonts.google.com/icons (e.g. "home", "search", "restaurant_menu").
 */
export function Icon({
  name,
  size = 24,
  variant = "outline",
  weight = 200,
  className = "",
  color,
  style,
  "aria-label": ariaLabel,
}: IconProps) {
  return (
    <span
      className={`icon ${className}`}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
      style={{
        fontSize: size,
        lineHeight: 1,
        width: size,
        height: size,
        color,
        fontVariationSettings: `"FILL" ${variant === "fill" ? 1 : 0}, "wght" ${weight}, "GRAD" 0, "opsz" ${size}`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
