export function formatRelativeDate(ts: number): string {
  const now = Date.now();
  const diffMs = now - ts;
  const day = 1000 * 60 * 60 * 24;
  const diffDays = Math.floor(diffMs / day);

  if (diffDays < 1) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

export function formatDateLong(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateInputValue(value: string): number {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date();
  date.setFullYear(y, (m ?? 1) - 1, d ?? 1);
  date.setHours(12, 0, 0, 0);
  return date.getTime();
}

/**
 * Render a star-rating number, preferring 1 decimal when the value is a
 * whole or half (3.0, 3.5, 4.0) and surfacing 2 decimals only when needed
 * to convey the actual averaged value (e.g. avg(3.5, 4.0) = "3.75").
 *
 * Use for AGGREGATED per-user ratings; individual visits should keep
 * `toFixed(1)` since their values come from a half-star picker.
 */
export function formatAvgRating(r: number): string {
  // Round to 2 decimals to kill float noise (e.g. 3.7333333333).
  const rounded = Math.round(r * 100) / 100;
  // If the value is whole or already a clean half/tenth, show 1 decimal.
  if (Math.round(rounded * 10) === rounded * 10) return rounded.toFixed(1);
  return rounded.toFixed(2);
}
