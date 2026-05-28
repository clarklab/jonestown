import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMemo } from "react";
import type { RestaurantAggregate, VerdictStatus } from "~/data/types";

const VB = 800;

// Cluster anchors for the three broad areas. Hand-tuned to feel like
// "Jonestown is here, Lago Vista is over there, lakeside on the south edge".
const AREA_ANCHORS: Record<string, { x: number; y: number; r: number }> = {
  jonestown: { x: 280, y: 280, r: 160 },
  "lago vista": { x: 540, y: 360, r: 180 },
  "lake travis": { x: 470, y: 620, r: 130 },
  default: { x: 400, y: 420, r: 200 },
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

function placeRestaurants(aggs: RestaurantAggregate[]): Placement[] {
  const byArea: Record<string, RestaurantAggregate[]> = {};
  for (const a of aggs) {
    const area = (a.restaurant.area ?? "default").toLowerCase();
    const key = AREA_ANCHORS[area] ? area : "default";
    (byArea[key] ||= []).push(a);
  }
  const placements: Placement[] = [];
  for (const [areaKey, list] of Object.entries(byArea)) {
    const anchor = AREA_ANCHORS[areaKey] ?? AREA_ANCHORS.default;
    // Deterministic but visually scattered — golden-angle spiral.
    const phi = 2.39996323; // golden angle in rad
    list.forEach((agg, i) => {
      const r = rng(hash(agg.restaurant.id));
      const idx = i + 0.5;
      const jitterAngle = r() * Math.PI * 2;
      const jitterMag = (0.45 + r() * 0.55) * anchor.r * 0.85;
      const spiralR = Math.sqrt(idx / list.length) * anchor.r * 0.9;
      const spiralA = idx * phi;
      const x =
        anchor.x +
        Math.cos(spiralA) * spiralR * 0.7 +
        Math.cos(jitterAngle) * jitterMag * 0.3;
      const y =
        anchor.y +
        Math.sin(spiralA) * spiralR * 0.7 +
        Math.sin(jitterAngle) * jitterMag * 0.3;
      placements.push({
        agg,
        x: Math.max(60, Math.min(VB - 60, x)),
        y: Math.max(60, Math.min(VB - 60, y)),
        area: areaKey,
      });
    });
  }
  return placements;
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

        {/* Compass rose */}
        <Compass />
      </svg>
    </div>
  );
}

function LakePath() {
  return (
    <g>
      <path
        d="M 820 380
           C 700 360, 620 420, 560 480
           C 510 530, 480 600, 510 670
           C 540 740, 620 760, 720 760
           C 820 760, 870 700, 880 640
           L 880 380
           Z"
        fill="url(#water-grad)"
      />
      <path
        d="M 820 380
           C 700 360, 620 420, 560 480
           C 510 530, 480 600, 510 670
           C 540 740, 620 760, 720 760
           C 820 760, 870 700, 880 640
           L 880 380
           Z"
        fill="url(#water-dots)"
        opacity="0.6"
      />
      {/* Lake outline highlight */}
      <path
        d="M 820 380
           C 700 360, 620 420, 560 480
           C 510 530, 480 600, 510 670"
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
  return (
    <g
      fill="none"
      stroke="oklch(0 0 0 / 0.18)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="2 8"
    >
      <path d="M 60 200 Q 260 240, 460 320 T 800 360" />
      <path d="M 280 80 Q 320 240, 380 460 T 460 760" />
      <path d="M 60 540 Q 260 520, 460 540 T 760 540" />
    </g>
  );
}

function AreaLabels() {
  const labels = [
    { x: 230, y: 110, text: "JONESTOWN" },
    { x: 600, y: 200, text: "LAGO VISTA" },
    { x: 350, y: 720, text: "LAKE TRAVIS" },
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

function Compass() {
  return (
    <g transform={`translate(${VB - 80} 80)`} opacity="0.5">
      <circle r="32" fill="oklch(1 0 0 / 0.7)" stroke="oklch(0 0 0 / 0.18)" strokeWidth="1.5" />
      <path d="M 0 -24 L 6 0 L 0 24 L -6 0 Z" fill="oklch(0.62 0.25 12)" />
      <path d="M 0 -24 L 6 0 L 0 0 Z" fill="oklch(0.46 0.21 12)" />
      <text
        x="0"
        y="-12"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="oklch(0 0 0 / 0.6)"
      >
        N
      </text>
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
            <text
              y="-2"
              textAnchor="middle"
              fontSize="14"
              fontWeight="800"
              fill={ring}
              fontFamily="DM Sans, system-ui"
            >
              ⚡
            </text>
          ) : (
            <text
              y="-2"
              textAnchor="middle"
              fontSize="13"
              fontWeight="800"
              fill={ring}
              fontFamily="DM Sans, system-ui"
            >
              ★
            </text>
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
