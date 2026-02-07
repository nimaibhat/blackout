"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import "mapbox-gl/dist/mapbox-gl.css";

/* ================================================================== */
/*  TYPES                                                              */
/* ================================================================== */
export interface HotspotData {
  id: string;
  city: string;
  lat: number;
  lng: number;
  severity: number;
  status: "critical" | "stressed" | "nominal";
  threat: string;
  cascade: number;
}

export interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  status: "critical" | "stressed" | "nominal";
}

export interface GridNode {
  id: string;
  lat: number;
  lon: number;
  base_load_mw: number;
  capacity_mw: number;
  voltage_kv: number;
  weather_zone: string;
}

interface FocusedLocation {
  lat: number;
  lng: number;
  altitude: number;
}

interface OperatorGlobeProps {
  hotspots?: HotspotData[];
  arcs?: ArcData[];
  gridNodes?: GridNode[];
  focusedLocation?: FocusedLocation | null;
  onSelectCity?: (city: HotspotData) => void;
  onDeselectCity?: () => void;
}

/* ================================================================== */
/*  DEFAULTS                                                           */
/* ================================================================== */
const INITIAL_CENTER: [number, number] = [-98, 32]; // [lng, lat]
const INITIAL_ZOOM = 2.8;

const STATUS_COLORS: Record<string, string> = {
  critical: "#ef4444",
  stressed: "#f59e0b",
  nominal: "#22c55e",
};

/* ================================================================== */
/*  HELPERS                                                            */
/* ================================================================== */

/** Convert altitude (react-globe.gl scale) to mapbox zoom level */
function altitudeToZoom(altitude: number): number {
  // react-globe.gl altitude ~2.2 = overview, ~0.6 = city zoom
  // mapbox zoom ~2.8 = overview, ~8 = city zoom
  const clampedAlt = Math.max(0.3, Math.min(altitude, 3));
  return 2.8 + (2.2 - clampedAlt) * (5.2 / 1.6);
}

/** Spherical linear interpolation for great-circle arcs */
function greatCirclePoints(
  startLng: number, startLat: number,
  endLng: number, endLat: number,
  numPoints: number = 64
): [number, number][] {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const lat1 = startLat * toRad;
  const lng1 = startLng * toRad;
  const lat2 = endLat * toRad;
  const lng2 = endLng * toRad;

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng2 - lng1) / 2), 2)
    )
  );

  if (d < 1e-10) return [[startLng, startLat], [endLng, endLat]];

  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * toDeg;
    const lng = Math.atan2(y, x) * toDeg;
    points.push([lng, lat]);
  }
  return points;
}

/* ================================================================== */
/*  COMPONENT                                                          */
/* ================================================================== */
export default function OperatorGlobe({
  hotspots = [],
  arcs = [],
  gridNodes = [],
  focusedLocation,
  onSelectCity,
  onDeselectCity,
}: OperatorGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const animFrameRef = useRef<number>(0);

  const [isZoomed, setIsZoomed] = useState(false);
  const [hovered, setHovered] = useState<HotspotData | null>(null);
  const [mounted, setMounted] = useState(false);

  // Keep a ref to hotspots for event handlers
  const hotspotsRef = useRef(hotspots);
  hotspotsRef.current = hotspots;

  /* ---- Build GeoJSON sources from props ---- */
  const hotspotsGeoJSON = useMemo((): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: hotspots.map((h) => ({
      type: "Feature",
      properties: {
        id: h.id,
        city: h.city,
        severity: h.severity,
        status: h.status,
        threat: h.threat,
        cascade: h.cascade,
        color: STATUS_COLORS[h.status],
        radius: h.status === "critical" ? 8 : h.status === "stressed" ? 6 : 4,
      },
      geometry: { type: "Point", coordinates: [h.lng, h.lat] },
    })),
  }), [hotspots]);

  const ringsGeoJSON = useMemo((): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: hotspots
      .filter((h) => h.status !== "nominal")
      .map((h) => ({
        type: "Feature",
        properties: {
          color: STATUS_COLORS[h.status],
          status: h.status,
        },
        geometry: { type: "Point", coordinates: [h.lng, h.lat] },
      })),
  }), [hotspots]);

  const gridNodesGeoJSON = useMemo((): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: gridNodes.map((n) => {
      // Color by voltage: 345/500kV = bright, 161kV = medium, <115kV = dim
      const color = n.voltage_kv >= 300 ? "#3b82f6" : n.voltage_kv >= 100 ? "#6366f1" : "#4b5563";
      const radius = n.voltage_kv >= 300 ? 3 : n.voltage_kv >= 100 ? 2 : 1.5;
      return {
        type: "Feature",
        properties: {
          id: n.id,
          color,
          radius,
          voltage_kv: n.voltage_kv,
          load_mw: n.base_load_mw,
          capacity_mw: n.capacity_mw,
          zone: n.weather_zone,
        },
        geometry: { type: "Point", coordinates: [n.lon, n.lat] },
      };
    }),
  }), [gridNodes]);

  const arcsGeoJSON = useMemo((): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: arcs.map((a, i) => ({
      type: "Feature",
      properties: {
        status: a.status,
        color: STATUS_COLORS[a.status],
        opacity: a.status === "nominal" ? 0.2 : 0.8,
        width: a.status === "nominal" ? 1 : 2,
      },
      geometry: {
        type: "LineString",
        coordinates: greatCirclePoints(a.startLng, a.startLat, a.endLng, a.endLat),
      },
    })),
  }), [arcs]);

  /* ---- Initialize map ---- */
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    (async () => {
      const mb = (await import("mapbox-gl")).default;
      if (cancelled) return;

      mb.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

      const map = new mb.Map({
        container: containerRef.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: INITIAL_CENTER,
        zoom: INITIAL_ZOOM,
        projection: "globe",
        antialias: true,
        fadeDuration: 0,
      });

      mapRef.current = map;

      /* Atmosphere / fog — natural look with dark space */
      map.on("style.load", () => {
        map.setFog({
          color: "rgb(186, 210, 235)",
          "high-color": "rgb(36, 92, 223)",
          "horizon-blend": 0.02,
          "space-color": "rgb(11, 11, 25)",
          "star-intensity": 0.6,
        });
      });

      map.on("load", () => {
        if (cancelled) return;

        /* --- Grid infrastructure nodes (background layer) --- */
        map.addSource("grid-nodes", { type: "geojson", data: gridNodesGeoJSON });
        map.addLayer({
          id: "grid-node-dots",
          type: "circle",
          source: "grid-nodes",
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              2, ["get", "radius"],
              6, ["*", ["get", "radius"], 2],
              10, ["*", ["get", "radius"], 3],
            ],
            "circle-opacity": [
              "interpolate", ["linear"], ["zoom"],
              2, 0.4,
              6, 0.7,
              10, 0.9,
            ],
          },
        });

        /* --- Hotspot points source & layer --- */
        map.addSource("hotspots", { type: "geojson", data: hotspotsGeoJSON });
        map.addLayer({
          id: "hotspot-dots",
          type: "circle",
          source: "hotspots",
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": ["get", "radius"],
            "circle-opacity": 0.9,
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-width": 1.5,
            "circle-stroke-opacity": 0.4,
          },
        });

        /* --- Pulsing ring layers --- */
        map.addSource("rings", { type: "geojson", data: ringsGeoJSON });
        map.addLayer({
          id: "ring-pulse-1",
          type: "circle",
          source: "rings",
          paint: {
            "circle-color": "transparent",
            "circle-radius": 10,
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-width": 2,
            "circle-stroke-opacity": 0.6,
          },
        });
        map.addLayer({
          id: "ring-pulse-2",
          type: "circle",
          source: "rings",
          paint: {
            "circle-color": "transparent",
            "circle-radius": 10,
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-width": 1.5,
            "circle-stroke-opacity": 0.4,
          },
        });

        /* --- Arc lines --- */
        map.addSource("arcs", { type: "geojson", data: arcsGeoJSON });
        map.addLayer({
          id: "arc-lines",
          type: "line",
          source: "arcs",
          paint: {
            "line-color": ["get", "color"],
            "line-width": ["get", "width"],
            "line-opacity": ["get", "opacity"],
            "line-dasharray": [2, 2],
          },
        });

        /* --- Hover cursor & tooltip logic --- */
        map.on("mouseenter", "hotspot-dots", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "hotspot-dots", () => {
          map.getCanvas().style.cursor = "";
          setHovered(null);
        });
        map.on("mousemove", "hotspot-dots", (e) => {
          if (e.features && e.features.length > 0) {
            const props = e.features[0].properties!;
            const h = hotspotsRef.current.find((hs) => hs.id === props.id);
            if (h) setHovered(h);
          }
        });

        /* --- Click to zoom --- */
        map.on("click", "hotspot-dots", (e) => {
          if (e.features && e.features.length > 0) {
            const props = e.features[0].properties!;
            const city = hotspotsRef.current.find((hs) => hs.id === props.id);
            if (!city) return;
            map.flyTo({
              center: [city.lng, city.lat],
              zoom: 8,
              duration: 1500,
            });
            setIsZoomed(true);
            onSelectCity?.(city);
          }
        });

        /* --- Pulse animation loop --- */
        let startTime = performance.now();
        function animateRings() {
          if (cancelled) return;
          const elapsed = performance.now() - startTime;

          // Ring 1: 1.6s period
          const t1 = (elapsed % 1600) / 1600;
          const radius1 = 10 + t1 * 25;
          const opacity1 = (1 - t1) * 0.6;
          map.setPaintProperty("ring-pulse-1", "circle-stroke-opacity", opacity1);
          map.setPaintProperty("ring-pulse-1", "circle-radius", radius1);

          // Ring 2: 1.6s period, offset by 0.8s
          const t2 = ((elapsed + 800) % 1600) / 1600;
          const radius2 = 10 + t2 * 25;
          const opacity2 = (1 - t2) * 0.4;
          map.setPaintProperty("ring-pulse-2", "circle-stroke-opacity", opacity2);
          map.setPaintProperty("ring-pulse-2", "circle-radius", radius2);

          animFrameRef.current = requestAnimationFrame(animateRings);
        }
        animFrameRef.current = requestAnimationFrame(animateRings);

        // Fade in
        setTimeout(() => setMounted(true), 100);
      });
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Update sources when props change ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("hotspots") as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(hotspotsGeoJSON);
  }, [hotspotsGeoJSON]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("rings") as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(ringsGeoJSON);
  }, [ringsGeoJSON]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("arcs") as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(arcsGeoJSON);
  }, [arcsGeoJSON]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("grid-nodes") as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(gridNodesGeoJSON);
  }, [gridNodesGeoJSON]);

  /* ---- Prop-driven zoom (from sidebar clicks) ---- */
  useEffect(() => {
    if (!focusedLocation || !mapRef.current) return;
    const zoom = altitudeToZoom(focusedLocation.altitude);
    mapRef.current.flyTo({
      center: [focusedLocation.lng, focusedLocation.lat],
      zoom,
      duration: 1500,
    });
    setIsZoomed(true);
  }, [focusedLocation]);

  /* ---- Back to overview ---- */
  const handleBackToOverview = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      duration: 1500,
    });
    setIsZoomed(false);
    onDeselectCity?.();
  }, [onDeselectCity]);

  return (
    <div className="w-full h-full relative">
      {/* Map container */}
      <div
        ref={containerRef}
        className="w-full h-full transition-opacity duration-1000"
        style={{ opacity: mounted ? 1 : 0 }}
      />

      {/* Tooltip */}
      {hovered && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-[#111111] border border-[#1a1a1a] rounded-lg p-4 shadow-xl min-w-[220px]">
            <p className="text-base font-bold text-white">{hovered.city}</p>
            <p className="text-sm text-[#a1a1aa] mt-1">
              {hovered.threat} — SEV {hovered.severity}
            </p>
            <p
              className="text-xl font-mono font-bold mt-2"
              style={{ color: STATUS_COLORS[hovered.status] }}
            >
              {hovered.cascade}%
              <span className="text-xs text-[#71717a] font-normal ml-1.5">
                cascade risk
              </span>
            </p>
            <p className="text-xs text-[#52525b] mt-2">Click to zoom in</p>
          </div>
        </div>
      )}

      {/* Back to overview button */}
      {isZoomed && (
        <button
          onClick={handleBackToOverview}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 h-11 px-5 rounded-lg bg-[#111111] border border-[#3f3f46] text-sm text-white font-medium hover:border-[#22c55e]/50 hover:bg-[#1a1a1a] transition-colors cursor-pointer shadow-lg"
        >
          ← Back to Overview
        </button>
      )}
    </div>
  );
}
