import { Icon } from "./Icon";
import { Stars } from "./Stars";
import type { PublicRating, VerdictMeta } from "~/data/types";

const SOURCE_LABEL: Record<PublicRating["source"], string> = {
  google: "Google",
  yelp: "Yelp",
  tripadvisor: "TripAdvisor",
};

/** Compact public-rating pill, used inside restaurant cards next to the duel. */
export function PublicRatingChip({
  rating,
  size = "sm",
}: {
  rating: PublicRating;
  size?: "sm" | "md";
}) {
  const dims = {
    sm: { px: "px-2", py: "py-0.5", text: "text-[10px]" },
    md: { px: "px-2.5", py: "py-1", text: "text-[11px]" },
  }[size];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-surface-2 ${dims.px} ${dims.py} ${dims.text} font-bold tracking-tight text-ink-muted ring-1 ring-inset ring-line`}
    >
      <span className="tracking-[0.12em] text-ink-dim uppercase">
        {SOURCE_LABEL[rating.source]}
      </span>
      <span className="tabular-nums text-ink">{rating.value.toFixed(1)}</span>
      <Icon
        name="star"
        size={size === "sm" ? 10 : 12}
        variant="fill"
        color="var(--color-tennis-700)"
      />
    </span>
  );
}

/**
 * Comparison block — shows the couple's verdict against the public score
 * with a delta callout. Lives on the restaurant detail page.
 */
export function VsPublic({
  verdict,
  publicRating,
}: {
  verdict: VerdictMeta;
  publicRating: PublicRating | undefined;
}) {
  if (!publicRating) return null;

  const our = verdict.combined;
  const them = publicRating.value;
  const sourceLabel = SOURCE_LABEL[publicRating.source];

  const verdictKnown = our !== undefined;
  const delta = verdictKnown ? our! - them : 0;
  const absDelta = Math.abs(delta);
  let callout: string;
  let tone: "match" | "louder" | "tougher";
  if (!verdictKnown) {
    callout = "No verdict from you yet — public says here's what to expect.";
    tone = "match";
  } else if (absDelta <= 0.25) {
    callout = `Same as the crowd — within a quarter star.`;
    tone = "match";
  } else if (delta > 0) {
    callout = `${absDelta.toFixed(1)} stars louder than the crowd.`;
    tone = "louder";
  } else {
    callout = `${absDelta.toFixed(1)} stars tougher than the crowd.`;
    tone = "tougher";
  }

  const calloutBg =
    tone === "match"
      ? "var(--color-tennis-100)"
      : tone === "louder"
        ? "oklch(0.93 0.13 80)"
        : "oklch(0.92 0.05 250)";
  const calloutFg =
    tone === "match"
      ? "var(--color-tennis-800)"
      : tone === "louder"
        ? "oklch(0.32 0.13 60)"
        : "oklch(0.32 0.13 250)";

  return (
    <div className="mt-4 overflow-hidden rounded-3xl bg-surface ring-1 ring-inset ring-line">
      <div className="grid grid-cols-2">
        <Half
          label="Both of you"
          value={our}
          source="verdict"
          highlight={verdictKnown}
        />
        <Half
          label={sourceLabel}
          value={them}
          source="public"
          count={publicRating.count}
          highlight={!verdictKnown}
        />
      </div>
      <div
        className="border-t border-line px-4 py-2.5 text-center text-[11px] font-bold tracking-[0.12em] uppercase"
        style={{ background: calloutBg, color: calloutFg }}
      >
        {callout}
      </div>
    </div>
  );
}

function Half({
  label,
  value,
  source,
  count,
  highlight,
}: {
  label: string;
  value: number | undefined;
  source: "verdict" | "public";
  count?: number;
  highlight: boolean;
}) {
  const isPublic = source === "public";
  return (
    <div
      className={`relative flex flex-col gap-1 px-4 py-3 ${
        isPublic ? "border-l border-line" : ""
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold tracking-[0.16em] text-ink-dim uppercase">
          {label}
        </span>
        {highlight ? (
          <span className="size-1.5 rounded-full bg-tennis-500" />
        ) : null}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="display-tight text-4xl tabular-nums"
          style={{
            color:
              value !== undefined ? "var(--color-ink)" : "var(--color-ink-faint)",
          }}
        >
          {value !== undefined ? value.toFixed(1) : "—"}
        </span>
        {value !== undefined ? (
          <span className="text-xs font-bold text-ink-faint">/5</span>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5">
        <Stars
          value={value}
          size="sm"
          color={
            isPublic
              ? "var(--color-tennis-700)"
              : "var(--color-tennis-500)"
          }
        />
        {count ? (
          <span className="text-[10px] font-medium text-ink-faint">
            {Intl.NumberFormat().format(count)} reviews
          </span>
        ) : null}
      </div>
    </div>
  );
}
