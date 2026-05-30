import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import type { LatLngBoundsExpression, LatLngLiteral } from "leaflet";

export type Vertex = LatLngLiteral;

/**
 * Polygon picker. Tap the map to drop vertices in order. Three+ vertices
 * shows a filled polygon; the parent gets the full vertex list on every
 * tap so it can show a live readout and Copy button.
 *
 * Touch behavior: a tap (no drag) adds a vertex. Two-finger pinch / drag
 * still pans + zooms. Double-tap-zoom is disabled so we don't accidentally
 * zoom while building.
 */
export function DiscoveryMap({
  vertices,
  onVertexAdd,
  className = "",
}: {
  vertices: Vertex[];
  onVertexAdd: (v: Vertex) => void;
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
        doubleClickZoom={false}
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
        <ClickHandler onAdd={onVertexAdd} />
        <PolygonLayer vertices={vertices} />
      </MapContainer>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[400] text-center">
        <span className="inline-block rounded-full bg-paper/90 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-ink-muted uppercase ring-1 ring-inset ring-line backdrop-blur-sm">
          {vertices.length === 0
            ? "Tap to drop a corner"
            : vertices.length < 3
              ? `${vertices.length} of 3 minimum`
              : `${vertices.length} corners · tap to add more`}
        </span>
      </div>
    </div>
  );
}

function ClickHandler({ onAdd }: { onAdd: (v: Vertex) => void }) {
  useMapEvents({
    click(e) {
      onAdd({ lat: round5(e.latlng.lat), lng: round5(e.latlng.lng) });
    },
  });
  return null;
}

function PolygonLayer({ vertices }: { vertices: Vertex[] }) {
  const fill = "var(--color-tennis-300)";
  const stroke = "oklch(0.46 0.13 126)";

  return (
    <>
      {vertices.length >= 3 ? (
        <Polygon
          positions={vertices}
          pathOptions={{
            color: stroke,
            weight: 2.5,
            fillColor: fill,
            fillOpacity: 0.28,
          }}
        />
      ) : null}
      {vertices.length === 2 ? (
        <Polyline
          positions={vertices}
          pathOptions={{ color: stroke, weight: 2, dashArray: "4 6" }}
        />
      ) : null}
      {vertices.map((v, i) => (
        <CircleMarker
          key={i}
          center={v}
          radius={i === vertices.length - 1 ? 7 : 5}
          pathOptions={{
            color: stroke,
            weight: 2,
            fillColor: i === vertices.length - 1 ? fill : "var(--color-paper)",
            fillOpacity: 1,
          }}
        >
          <Tooltip
            direction="top"
            offset={[0, -6]}
            opacity={0.9}
            permanent={i === 0 && vertices.length < 3}
          >
            {i === 0 && vertices.length < 3 ? "Start" : `#${i + 1}`}
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

function round5(n: number) {
  return Math.round(n * 1e5) / 1e5;
}

/* ---- helpers consumed by the admin page ---- */

export function polygonCentroid(vertices: Vertex[]): Vertex | null {
  if (vertices.length === 0) return null;
  if (vertices.length === 1) return vertices[0];
  // Simple average — close enough for "where roughly is this".
  let lat = 0;
  let lng = 0;
  for (const v of vertices) {
    lat += v.lat;
    lng += v.lng;
  }
  return { lat: round5(lat / vertices.length), lng: round5(lng / vertices.length) };
}

export function polygonBbox(vertices: Vertex[]): {
  south: number;
  west: number;
  north: number;
  east: number;
} | null {
  if (vertices.length === 0) return null;
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const v of vertices) {
    if (v.lat < south) south = v.lat;
    if (v.lat > north) north = v.lat;
    if (v.lng < west) west = v.lng;
    if (v.lng > east) east = v.lng;
  }
  return {
    south: round5(south),
    west: round5(west),
    north: round5(north),
    east: round5(east),
  };
}

/**
 * Format the polygon as a self-contained chat prompt Claude can act on.
 * Includes the vertex list, a fallback bbox, a centroid, and an OSM URL
 * deep-linked to the centroid so Claude can see what was framed.
 */
export function formatPolygonForClaude(vertices: Vertex[]): string {
  const c = polygonCentroid(vertices);
  const b = polygonBbox(vertices);
  if (!c || !b || vertices.length < 3) {
    return "Need at least 3 vertices for a polygon.";
  }
  const osm = `https://www.openstreetmap.org/?bbox=${b.west},${b.south},${b.east},${b.north}`;
  const gmaps = `https://www.google.com/maps/@${c.lat},${c.lng},13z`;
  const vertexLines = vertices.map((v, i) => `  ${i + 1}. ${v.lat}, ${v.lng}`).join("\n");
  return [
    "Find more restaurants inside this polygon. For each candidate's address, only include it if its coordinates fall inside the polygon (a bbox check would include a lot of water / unrelated land). Add anything new to CATALOG in src/data/seed.ts with full metadata, then commit + push.",
    "",
    `polygon (${vertices.length} vertices, lat,lng):`,
    vertexLines,
    "",
    `bbox: ${b.south},${b.west},${b.north},${b.east}   (south, west, north, east — for reference only)`,
    `center: ${c.lat}, ${c.lng}`,
    `osm: ${osm}`,
    `gmaps: ${gmaps}`,
  ].join("\n");
}
