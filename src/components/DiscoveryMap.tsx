import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvent,
} from "react-leaflet";
import type { LatLngBoundsExpression, Map as LeafletMap } from "leaflet";
import { Icon } from "./Icon";

export interface DiscoverResult {
  id: string;
  name: string;
  lat: number;
  lon: number;
  amenity: string;
  cuisine?: string;
  address?: string;
  phone?: string;
  website?: string;
}

export type DiscoverState =
  | { phase: "idle" }
  | { phase: "loading"; bbox: string }
  | { phase: "loaded"; bbox: string; results: DiscoverResult[] }
  | { phase: "error"; bbox: string; message: string };

/**
 * Interactive map for "find more spots". Renders Leaflet with OSM tiles,
 * lets the user pan / zoom; the visible bounds become the search area when
 * they tap the Search this area button. Discovered pins from a previous
 * search render as small circles so the user can see what was found.
 *
 * Default bounds frame Jonestown + Lago Vista + Lake Travis.
 */
export function DiscoveryMap({
  state,
  onSearch,
  excludeIds,
  highlightId,
  onHighlight,
  className = "",
}: {
  state: DiscoverState;
  onSearch: (bbox: string) => void;
  excludeIds: Set<string>;
  highlightId?: string | null;
  onHighlight?: (id: string | null) => void;
  className?: string;
}) {
  const initialBounds: LatLngBoundsExpression = useMemo(
    () => [
      [30.43, -98.05],
      [30.52, -97.86],
    ],
    [],
  );

  const results =
    state.phase === "loaded" ? state.results : [];
  const loading = state.phase === "loading";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl ring-1 ring-inset ring-line ${className}`}
    >
      <MapContainer
        bounds={initialBounds}
        zoomControl={false}
        scrollWheelZoom
        style={{ width: "100%", height: "100%", background: "var(--color-surface-2)" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SearchControls onSearch={onSearch} loading={loading} />
        {results.map((r) => {
          const already = excludeIds.has(r.id);
          const isHighlight = highlightId === r.id;
          return (
            <CircleMarker
              key={r.id}
              center={[r.lat, r.lon]}
              radius={isHighlight ? 11 : 7}
              pathOptions={{
                color: already
                  ? "oklch(0.5 0.01 100)"
                  : "oklch(0.32 0.13 60)",
                fillColor: already
                  ? "oklch(0.85 0.01 100)"
                  : "oklch(0.93 0.2 116)",
                fillOpacity: already ? 0.5 : 0.9,
                weight: isHighlight ? 3 : 1.5,
              }}
              eventHandlers={{
                click: () => onHighlight?.(isHighlight ? null : r.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.96}>
                {r.name}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {state.phase === "loading" ? (
        <div className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-2 rounded-full bg-paper/95 px-3 py-1.5 text-[11px] font-bold tracking-tight text-ink-muted ring-1 ring-inset ring-line shadow-sm">
          <Icon
            name="progress_activity"
            size={14}
            color="var(--color-tennis-700)"
          />
          Searching this area…
        </div>
      ) : state.phase === "loaded" ? (
        <div className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-paper/95 px-3 py-1.5 text-[11px] font-bold tracking-tight text-ink-muted ring-1 ring-inset ring-line shadow-sm">
          <Icon
            name="check"
            size={12}
            weight={300}
            color="var(--color-tennis-700)"
          />
          {state.results.length} found
        </div>
      ) : null}
    </div>
  );
}

function SearchControls({
  onSearch,
  loading,
}: {
  onSearch: (bbox: string) => void;
  loading: boolean;
}) {
  const map = useMap();
  const handler = () => {
    const b = map.getBounds();
    const bbox = [
      b.getSouth().toFixed(5),
      b.getWest().toFixed(5),
      b.getNorth().toFixed(5),
      b.getEast().toFixed(5),
    ].join(",");
    onSearch(bbox);
  };
  return (
    <div className="absolute top-3 left-3 z-[400] flex flex-col gap-2">
      <button
        type="button"
        onClick={handler}
        disabled={loading}
        className="pressable inline-flex items-center gap-1.5 rounded-full bg-tennis-300 px-3 py-2 text-xs font-bold text-ink ring-1 ring-inset ring-tennis-500/40 shadow-[0_8px_24px_-10px_oklch(0.7_0.2_120_/_0.55)] disabled:opacity-50"
      >
        <Icon name="search" size={16} weight={300} color="var(--color-ink)" />
        Search this area
      </button>
    </div>
  );
}

/** Helper hook that keeps a parent component in sync with map view changes
 *  (currently unused but exported for future "live results as you pan"). */
export function useMapBboxChange(handler: (bbox: string) => void) {
  useMapEvent("moveend", (e) => {
    const map = e.target as LeafletMap;
    const b = map.getBounds();
    handler(
      `${b.getSouth().toFixed(5)},${b.getWest().toFixed(5)},${b.getNorth().toFixed(5)},${b.getEast().toFixed(5)}`,
    );
  });
}

/**
 * Side-effect helper: pan/zoom the map to fit all discovered results.
 * Mounted as a child of MapContainer so it has access to the map instance.
 */
export function FitToResults({ results }: { results: DiscoverResult[] }) {
  const map = useMap();
  const lastRef = useRef<string>("");
  useEffect(() => {
    if (!results.length) return;
    const sig = results.map((r) => r.id).join("|");
    if (sig === lastRef.current) return;
    lastRef.current = sig;
    const lats = results.map((r) => r.lat);
    const lons = results.map((r) => r.lon);
    const south = Math.min(...lats);
    const north = Math.max(...lats);
    const west = Math.min(...lons);
    const east = Math.max(...lons);
    map.fitBounds(
      [
        [south, west],
        [north, east],
      ],
      { padding: [40, 40] },
    );
  }, [results, map]);
  return null;
}

/**
 * Trigger a search whenever the discovery state goes from "idle" to a
 * loading state with a different bbox. Mostly a placeholder for future
 * automatic refresh logic; kept as a no-op for now.
 */
export function useAutoDiscover(_state: DiscoverState) {
  const [touched, setTouched] = useState(false);
  useEffect(() => setTouched(true), []);
  return touched;
}
