import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, Map as LeafletMap } from "leaflet";

export interface MapBounds {
  /** "south,west,north,east" — what Overpass wants and what we feed back to Claude. */
  bbox: string;
  south: number;
  west: number;
  north: number;
  east: number;
  /** Center, for Google Maps deep-link convenience. */
  center: { lat: number; lon: number };
  /** Approximate zoom level the user has the map at. */
  zoom: number;
}

/**
 * Bounds picker. The map's *visible viewport* is the selection — pan / zoom
 * to frame the area you care about, and the parent gets a `MapBounds`
 * callback every time the view changes. No live queries; this just captures
 * a region so you can paste it back to Claude for a research pass.
 *
 * Default view frames Jonestown + Lago Vista + the north side of Lake Travis.
 */
export function DiscoveryMap({
  onBoundsChange,
  className = "",
}: {
  onBoundsChange?: (b: MapBounds) => void;
  className?: string;
}) {
  const initialBounds: LatLngBoundsExpression = useMemo(
    () => [
      [30.43, -98.05],
      [30.52, -97.86],
    ],
    [],
  );

  return (
    <div
      className={`relative overflow-hidden rounded-3xl ring-1 ring-inset ring-line ${className}`}
    >
      <MapContainer
        bounds={initialBounds}
        zoomControl
        scrollWheelZoom
        style={{
          width: "100%",
          height: "100%",
          background: "var(--color-surface-2)",
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Crosshair />
        <BoundsReporter onBoundsChange={onBoundsChange} />
      </MapContainer>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[400] text-center">
        <span className="inline-block rounded-full bg-paper/90 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-ink-muted uppercase ring-1 ring-inset ring-line backdrop-blur-sm">
          Pan & zoom to frame your area
        </span>
      </div>
    </div>
  );
}

/**
 * Subtle crosshair drawn over the map center so the user has something to
 * orient against while panning. Purely cosmetic.
 */
function Crosshair() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[399] flex items-center justify-center"
      aria-hidden="true"
    >
      <div className="relative size-6">
        <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-ink/30" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink/30" />
        <div className="absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full bg-tennis-300 ring-1 ring-ink/40" />
      </div>
    </div>
  );
}

/** Reports the current viewport bounds to the parent every time the map
 *  finishes a move. Fires once on mount so consumers see the initial state. */
function BoundsReporter({
  onBoundsChange,
}: {
  onBoundsChange?: (b: MapBounds) => void;
}) {
  const map = useMap();
  const lastBboxRef = useRef<string>("");

  const emit = (m: LeafletMap) => {
    const b = m.getBounds();
    const south = round5(b.getSouth());
    const west = round5(b.getWest());
    const north = round5(b.getNorth());
    const east = round5(b.getEast());
    const bbox = `${south},${west},${north},${east}`;
    if (bbox === lastBboxRef.current) return;
    lastBboxRef.current = bbox;
    const c = m.getCenter();
    onBoundsChange?.({
      bbox,
      south,
      west,
      north,
      east,
      center: { lat: round5(c.lat), lon: round5(c.lng) },
      zoom: m.getZoom(),
    });
  };

  useEffect(() => {
    emit(map);
    const handler = () => emit(map);
    map.on("moveend", handler);
    map.on("zoomend", handler);
    return () => {
      map.off("moveend", handler);
      map.off("zoomend", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

function round5(n: number) {
  return Math.round(n * 1e5) / 1e5;
}

/**
 * Format a MapBounds payload as a self-contained chat message: bbox, the
 * area's center, and links Claude can open to see what you framed.
 */
export function formatBoundsForClaude(b: MapBounds): string {
  const osm = `https://www.openstreetmap.org/?bbox=${b.west},${b.south},${b.east},${b.north}`;
  const gmaps = `https://www.google.com/maps/@${b.center.lat},${b.center.lon},${Math.round(b.zoom)}z`;
  return [
    "Find more restaurants in this bounding box. Add anything new to the catalog (CATALOG in src/data/seed.ts) with full metadata, then commit + push.",
    "",
    `bbox: ${b.bbox}   (south, west, north, east)`,
    `center: ${b.center.lat}, ${b.center.lon}`,
    `osm: ${osm}`,
    `gmaps: ${gmaps}`,
  ].join("\n");
}

/** Used briefly during the older live-query flow. Kept as a re-export so
 *  any straggling import doesn't break the build. */
export function useMapBboxChange(_handler: (bbox: string) => void) {
  // no-op
}
