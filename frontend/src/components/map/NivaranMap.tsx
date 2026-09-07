"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Cluster, TIER_COLORS, tierForScore } from "@/lib/types";

/* 50 m geofence ring around each cluster centroid (BUILD.md §1.2). */
function geofence(lat: number, lon: number, radiusM = 50, steps = 24): [number, number][] {
  const coords: [number, number][] = [];
  const dLat = radiusM / 111_320;
  const dLon = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([lat + dLat * Math.sin(theta), lon + dLon * Math.cos(theta)]);
  }
  return coords;
}

function FitBounds({ clusters }: { clusters: Cluster[] }) {
  const map = useMap();
  useEffect(() => {
    if (clusters.length > 1) {
      const lats = clusters.map((c) => c.latitude);
      const lons = clusters.map((c) => c.longitude);
      map.fitBounds(
        [
          [Math.min(...lats), Math.min(...lons)],
          [Math.max(...lats), Math.max(...lons)],
        ],
        { padding: [40, 40], maxZoom: 18 },
      );
    } else if (clusters.length === 1) {
      map.setView([clusters[0].latitude, clusters[0].longitude], 18);
    }
  }, [clusters, map]);
  return null;
}

export default function NivaranMap({
  clusters,
  selectedId,
  onSelect,
}: {
  clusters: Cluster[];
  selectedId?: string | null;
  onSelect?: (c: Cluster) => void;
}) {
  return (
    <MapContainer
      center={[18.922, 72.8347]}
      zoom={17}
      className="h-full w-full"
      zoomControl={false}
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FitBounds clusters={clusters} />
      {clusters.map((c) => {
        const tier = tierForScore(c.priority_score);
        const color =
          c.status === "RESOLVED" || c.status === "CLOSED"
            ? TIER_COLORS.LOW
            : TIER_COLORS[tier];
        const selected = selectedId === c.id;
        const emergency = tier === "EMERGENCY" && c.status !== "RESOLVED";
        return (
          <div key={c.id}>
            {/* Semi-transparent geofence polygon (§1.2) */}
            <Polygon
              positions={geofence(c.latitude, c.longitude)}
              pathOptions={{
                color,
                weight: 1,
                opacity: 0.35,
                fillColor: color,
                fillOpacity: 0.07,
              }}
            />
            <CircleMarker
              center={[c.latitude, c.longitude]}
              radius={emergency ? 11 : Math.min(7 + c.complaint_count, 12)}
              pathOptions={{
                color,
                weight: selected ? 3 : 1.5,
                fillColor: color,
                fillOpacity: 0.85,
                className: emergency ? "pulse-ring" : undefined,
              }}
              eventHandlers={{ click: () => onSelect?.(c) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <span className="text-xs font-semibold">{c.title}</span>
                <br />
                <span className="text-[10px]">
                  P {c.priority_score} · {c.complaint_count} report(s) · {c.status}
                </span>
              </Tooltip>
              <Popup>
                <div className="text-xs">
                  <strong>{c.title}</strong>
                  <br />
                  {c.category} · Priority {c.priority_score}
                  <br />
                  {c.complaint_count} report(s) · SLA:{" "}
                  {c.sla_deadline ? new Date(c.sla_deadline).toLocaleTimeString() : "—"}
                </div>
              </Popup>
            </CircleMarker>
          </div>
        );
      })}
    </MapContainer>
  );
}
