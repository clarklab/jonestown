import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMemo } from "react";
import type { RestaurantAggregate, VerdictStatus } from "~/data/types";

const VB = 800;

/**
 * Geographic bbox covering 78645 (Jonestown / Lago Vista / Point Venture /
 * the north shore of Lake Travis). Pin coords project linearly into the
 * SVG viewBox using this rectangle. Picked to leave a touch of padding
 * around the actual restaurant extent.
 *   south=30.395 → bottom of SVG
 *   north=30.515 → top of SVG
 *   west=-98.005 → left of SVG
 *   east=-97.880 → right of SVG
 */
const BBOX = {
  south: 30.395,
  north: 30.515,
  west: -98.04,
  east: -97.86,
};

// Fallback cluster anchors for restaurants that lack coords (user-added
// without an address). Hand-tuned to land roughly where each area sits on
// the projection above.
const AREA_ANCHORS: Record<string, { x: number; y: number; r: number }> = {
  jonestown: { x: 600, y: 200, r: 70 },
  "lago vista": { x: 170, y: 460, r: 100 },
  "point venture": { x: 580, y: 660, r: 60 },
  "lake travis": { x: 470, y: 700, r: 80 },
  default: { x: 400, y: 420, r: 120 },
};

interface Placement {
  agg: RestaurantAggregate;
  x: number;
  y: number;
  area: string;
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Project lat/lng onto the SVG viewBox via the BBOX rectangle. */
function projectGeo(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - BBOX.west) / (BBOX.east - BBOX.west)) * VB;
  const y = (1 - (lat - BBOX.south) / (BBOX.north - BBOX.south)) * VB;
  return { x, y };
}

/**
 * Many restaurants share an address (e.g. four tenants of the 7708 Lohmans
 * Ford strip center all geocode to the same lat/lng). After projection, fan
 * any colliders out in a small ring so each pin stays tappable instead of
 * stacking into a single dot.
 */
function spreadColliders(placements: Placement[]): Placement[] {
  const groups: Record<string, Placement[]> = {};
  for (const p of placements) {
    const key = `${Math.round(p.x / 8)}_${Math.round(p.y / 8)}`;
    (groups[key] ||= []).push(p);
  }
  const out: Placement[] = [];
  for (const group of Object.values(groups)) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    const ring = 28;
    // Sort by id for stable order across renders.
    const sorted = [...group].sort((a, b) =>
      a.agg.restaurant.id.localeCompare(b.agg.restaurant.id),
    );
    sorted.forEach((p, i) => {
      const angle = (i / sorted.length) * Math.PI * 2 - Math.PI / 2;
      out.push({
        ...p,
        x: p.x + Math.cos(angle) * ring,
        y: p.y + Math.sin(angle) * ring,
      });
    });
  }
  return out;
}

function placeRestaurants(aggs: RestaurantAggregate[]): Placement[] {
  const placements: Placement[] = [];
  // Group fallback pins (no coords) by area so they still cluster sensibly.
  const fallbackByArea: Record<string, RestaurantAggregate[]> = {};

  for (const a of aggs) {
    const c = a.restaurant.coords;
    if (c) {
      const { x, y } = projectGeo(c.lat, c.lng);
      placements.push({
        agg: a,
        x: clamp(x, 40, VB - 40),
        y: clamp(y, 40, VB - 40),
        area: (a.restaurant.area ?? "").toLowerCase(),
      });
    } else {
      const area = (a.restaurant.area ?? "default").toLowerCase();
      const key = AREA_ANCHORS[area] ? area : "default";
      (fallbackByArea[key] ||= []).push(a);
    }
  }

  // Fallback: hash-spread inside the area anchor for restaurants missing coords.
  const phi = 2.39996323;
  for (const [areaKey, list] of Object.entries(fallbackByArea)) {
    const anchor = AREA_ANCHORS[areaKey] ?? AREA_ANCHORS.default;
    list.forEach((agg, i) => {
      const r = rng(hash(agg.restaurant.id));
      const idx = i + 0.5;
      const spiralR = Math.sqrt(idx / list.length) * anchor.r * 0.85;
      const spiralA = idx * phi + r() * 0.6;
      const x = anchor.x + Math.cos(spiralA) * spiralR;
      const y = anchor.y + Math.sin(spiralA) * spiralR;
      placements.push({
        agg,
        x: clamp(x, 40, VB - 40),
        y: clamp(y, 40, VB - 40),
        area: areaKey,
      });
    });
  }

  return spreadColliders(placements);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function TownMap({
  aggregates,
  className = "",
}: {
  aggregates: RestaurantAggregate[];
  className?: string;
}) {
  const placements = useMemo(
    () => placeRestaurants(aggregates),
    [aggregates],
  );

  const reveals = placements.map((p) => {
    const v = p.agg.verdict.status;
    return {
      x: p.x,
      y: p.y,
      r: v === "unanimous" ? 130 : v === "split" ? 130 : v === "divided" ? 130 : v === "solo" ? 78 : 0,
      soft: v === "solo",
    };
  });

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        className="block h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-label="Jonestown discovery map"
      >
        <defs>
          {/* Discovered land — warm, saturated sand/sage so it pops out from fog */}
          <radialGradient id="land-grad" cx="50%" cy="40%" r="80%">
            <stop offset="0%" stopColor="oklch(0.92 0.08 110)" />
            <stop offset="60%" stopColor="oklch(0.88 0.1 100)" />
            <stop offset="100%" stopColor="oklch(0.82 0.1 95)" />
          </radialGradient>
          <linearGradient id="water-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.1 220)" />
            <stop offset="100%" stopColor="oklch(0.7 0.13 235)" />
          </linearGradient>

          {/* Tree dots in land */}
          <pattern
            id="land-trees"
            width="34"
            height="34"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(8)"
          >
            <circle cx="6" cy="10" r="2.5" fill="oklch(0.62 0.14 140 / 0.35)" />
            <circle cx="22" cy="20" r="2" fill="oklch(0.58 0.12 145 / 0.3)" />
            <circle cx="14" cy="28" r="1.6" fill="oklch(0.6 0.13 142 / 0.35)" />
          </pattern>

          {/* Water sparkle dots */}
          <pattern
            id="water-dots"
            width="18"
            height="18"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="9" cy="9" r="1.4" fill="oklch(1 0 0 / 0.55)" />
          </pattern>

          {/* Fog — billowy cloud pattern, cool tint, plenty of contrast */}
          <filter id="fog-cloud" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.006 0.009"
              numOctaves="4"
              seed="11"
            />
            <feColorMatrix
              values="0 0 0 0 0.93   0 0 0 0 0.94   0 0 0 0 0.97   0 0 0 1 0"
            />
            <feGaussianBlur stdDeviation="1.5" />
          </filter>

          <pattern
            id="fog-puffs"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="30" cy="40" r="34" fill="oklch(1 0 0 / 0.4)" />
            <circle cx="86" cy="70" r="42" fill="oklch(0.99 0.005 250 / 0.35)" />
            <circle cx="60" cy="100" r="26" fill="oklch(1 0 0 / 0.3)" />
          </pattern>

          {/* Mask: white = show fog, black = cut hole. Soft cutouts use a radial. */}
          <mask id="fog-mask">
            <rect width={VB} height={VB} fill="white" />
            {reveals.map((r, i) =>
              r.r > 0 ? (
                <g key={i}>
                  <circle
                    cx={r.x}
                    cy={r.y}
                    r={r.r}
                    fill={r.soft ? "oklch(0 0 0 / 0.6)" : "black"}
                  />
                  {/* Soft edge */}
                  <circle
                    cx={r.x}
                    cy={r.y}
                    r={r.r + 16}
                    fill="oklch(0 0 0 / 0.35)"
                  />
                </g>
              ) : null,
            )}
          </mask>

          <filter id="reveal-blur">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* Base land */}
        <rect width={VB} height={VB} fill="url(#land-grad)" />
        <rect width={VB} height={VB} fill="url(#land-trees)" />

        {/* Lake Travis — winding through the lower-right */}
        <LakePath />
        {/* Roads */}
        <RoadPaths />

        {/* Pins (below fog so locked ones are hidden) */}
        <g>
          {placements.map((p) => (
            <Pin key={p.agg.restaurant.id} placement={p} />
          ))}
        </g>

        {/* Fog overlay — masked away around unlocked spots */}
        <g mask="url(#fog-mask)">
          <rect width={VB} height={VB} fill="oklch(0.96 0.01 250)" />
          <rect
            width={VB}
            height={VB}
            filter="url(#fog-cloud)"
            opacity="0.92"
          />
          <rect
            width={VB}
            height={VB}
            fill="url(#fog-puffs)"
            opacity="0.55"
          />
        </g>

        {/* Area labels float above fog */}
        <AreaLabels />

        {/* Pins again, but only the visible (solo+) ones — paint over fog */}
        <g>
          {placements
            .filter((p) => p.agg.verdict.status !== "locked")
            .map((p) => (
              <Pin key={`v-${p.agg.restaurant.id}`} placement={p} />
            ))}
        </g>

      </svg>
    </div>
  );
}

function LakePath() {
  // Lake Travis sits south of the bbox, but reaches up to wrap around the
  // Point Venture peninsula on the east side. Stylized band along the
  // bottom with a curve that dips around (x≈600, y≈630) where Captain
  // Pete's lands.
  const d = `
    M -20 720
    C 120 690, 240 700, 360 720
    C 460 740, 520 720, 560 680
    C 600 645, 640 660, 700 700
    C 760 730, 800 740, 820 740
    L 820 820
    L -20 820
    Z
  `;
  return (
    <g>
      <path d={d} fill="url(#water-grad)" />
      <path d={d} fill="url(#water-dots)" opacity="0.6" />
      <path
        d="M -20 720 C 120 690, 240 700, 360 720 C 460 740, 520 720, 560 680 C 600 645, 640 660, 700 700 C 760 730, 800 740, 820 740"
        fill="none"
        stroke="oklch(0.7 0.1 230)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </g>
  );
}

function RoadPaths() {
  // Two abstracted thoroughfares — FM 1431 (east-west through the upper
  // half, connecting Jonestown ↔ Lago Vista) and Lohmans Ford Rd (vertical
  // spine of Lago Vista, running down to the lake).
  return (
    <g
      fill="none"
      stroke="oklch(0 0 0 / 0.18)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="2 8"
    >
      {/* FM 1431 — connects Lago Vista (left) to Jonestown (upper right) */}
      <path d="M 60 480 Q 220 360, 380 280 T 720 180" />
      {/* Lohmans Ford Rd — Lago Vista north to the lake */}
      <path d="M 150 260 Q 130 380, 130 500 T 160 720" />
    </g>
  );
}

function AreaLabels() {
  // Anchored to the projected cluster centers — see BBOX above. Hand-nudged
  // to sit alongside, not on top of, the pin clusters.
  const labels = [
    { x: 560, y: 200, text: "JONESTOWN" },
    { x: 200, y: 510, text: "LAGO VISTA" },
    { x: 600, y: 600, text: "POINT VENTURE" },
    { x: 380, y: 750, text: "LAKE TRAVIS" },
  ];
  return (
    <g>
      {labels.map((l) => (
        <text
          key={l.text}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          letterSpacing="3"
          fill="oklch(0 0 0 / 0.28)"
          fontFamily="DM Sans, system-ui"
        >
          {l.text}
        </text>
      ))}
    </g>
  );
}

function Pin({ placement }: { placement: Placement }) {
  const status = placement.agg.verdict.status;
  return (
    <PinByStatus
      x={placement.x}
      y={placement.y}
      status={status}
      restaurantId={placement.agg.restaurant.id}
      name={placement.agg.restaurant.name}
    />
  );
}

function PinByStatus({
  x,
  y,
  status,
  restaurantId,
  name,
}: {
  x: number;
  y: number;
  status: VerdictStatus;
  restaurantId: string;
  name: string;
}) {
  if (status === "locked") {
    return (
      <g transform={`translate(${x} ${y})`}>
        {/* Locked pin is hidden by fog anyway, but draw a faint outline so a peek shows something */}
        <circle r="6" fill="oklch(0 0 0 / 0.18)" />
      </g>
    );
  }
  const isUnanimous = status === "unanimous";
  const isDivided = status === "divided" || status === "split";
  const isSolo = status === "solo";
  const fill = isUnanimous
    ? "var(--color-tennis-300)"
    : isDivided
      ? "oklch(0.93 0.14 25)"
      : "oklch(0.95 0.06 60)";
  const ring = isUnanimous
    ? "oklch(0.7 0.21 122)"
    : isDivided
      ? "oklch(0.55 0.21 25)"
      : "oklch(0.6 0.18 100)";

  return (
    <g transform={`translate(${x} ${y})`}>
      <Link
        to={`/r/${restaurantId}`}
        aria-label={`Open ${name}`}
      >
        {/* glow */}
        {isUnanimous ? (
          <circle r="34" fill={fill} opacity="0.35" filter="url(#reveal-blur)" />
        ) : null}
        {/* shadow */}
        <ellipse cy="18" rx="14" ry="3" fill="oklch(0 0 0 / 0.18)" />
        {/* pin body */}
        <motion.g
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          <path
            d="M 0 -24 C -12 -24, -20 -16, -20 -4 C -20 8, -8 14, 0 22 C 8 14, 20 8, 20 -4 C 20 -16, 12 -24, 0 -24 Z"
            fill={fill}
            stroke={ring}
            strokeWidth="2.5"
          />
          <circle cy="-6" r="8" fill="oklch(1 0 0 / 0.8)" />
          {isSolo ? (
            <text
              y="-3"
              textAnchor="middle"
              fontSize="11"
              fontWeight="800"
              fill={ring}
              fontFamily="DM Sans, system-ui"
            >
              1
            </text>
          ) : isDivided ? (
            // Lightning bolt — a "divided" verdict.
            <path
              transform="translate(0 -6) scale(0.62)"
              d="M2 -9 L-4 1.5 L-0.5 1.5 L-2 9 L4.5 -2 L1 -2 Z"
              fill={ring}
            />
          ) : (
            // Five-point star — a unanimous verdict.
            <path
              transform="translate(0 -6) scale(0.6)"
              d="M0 -10 L2.94 -4.05 L9.51 -3.09 L4.76 1.55 L5.88 8.09 L0 5 L-5.88 8.09 L-4.76 1.55 L-9.51 -3.09 L-2.94 -4.05 Z"
              fill={ring}
            />
          )}
        </motion.g>
        {/* label below pin */}
        <text
          y="38"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="oklch(0 0 0 / 0.8)"
          fontFamily="DM Sans, system-ui"
          style={{
            paintOrder: "stroke",
            stroke: "oklch(1 0 0 / 0.85)",
            strokeWidth: 3,
          }}
        >
          {name.length > 18 ? name.slice(0, 16) + "…" : name}
        </text>
      </Link>
    </g>
  );
}
