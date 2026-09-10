export interface RoomZone {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface FloorMeta {
  id: string;
  label: string;
  shortLabel: string;
  order: number;
  svgDark: string;
  svgLight: string;
  rooms: RoomZone[];
}

import campusFloorsData from "./campus_floors.json";

export const FLOORS_CONFIG: Record<string, { label: string; order: number }> = {
  "8": { label: "Eighth Floor", order: 10 },
  "7": { label: "Seventh Floor", order: 9 },
  "6": { label: "Sixth Floor", order: 8 },
  "5": { label: "Fifth Floor", order: 7 },
  "4": { label: "Fourth Floor", order: 6 },
  "3": { label: "Third Floor", order: 5 },
  "2": { label: "Second Floor", order: 4 },
  "1": { label: "First Floor", order: 3 },
  "G": { label: "Ground Floor", order: 2 },
  "LG": { label: "Lower Ground Floor", order: 1 },
};

export const ORDERED_FLOOR_IDS = ["8", "7", "6", "5", "4", "3", "2", "1", "G", "LG"];

export const CAMPUS_FLOORS: Record<string, FloorMeta> = Object.entries(FLOORS_CONFIG).reduce(
  (acc, [id, cfg]) => {
    const rooms = (campusFloorsData as Record<string, RoomZone[]>)[id] || [];
    acc[id] = {
      id,
      label: cfg.label,
      shortLabel: id === "LG" ? "LG" : id === "G" ? "G" : `L${id}`,
      order: cfg.order,
      svgDark: `/floor_plans/floor_${id.toLowerCase()}_dark.svg`,
      svgLight: `/floor_plans/floor_${id.toLowerCase()}_light.svg`,
      rooms,
    };
    return acc;
  },
  {} as Record<string, FloorMeta>
);

export function getFloorMeta(floorId: string): FloorMeta {
  const norm = (floorId || "1").toUpperCase();
  return CAMPUS_FLOORS[norm] || CAMPUS_FLOORS["1"];
}

export function findClosestRoom(floorId: string, x: number, y: number): RoomZone | null {
  const floor = getFloorMeta(floorId);
  if (!floor || floor.rooms.length === 0) return null;

  let closest: RoomZone | null = null;
  let minDist = Infinity;

  for (const r of floor.rooms) {
    const dist = Math.hypot(r.x - x, r.y - y);
    if (dist < minDist) {
      minDist = dist;
      closest = r;
    }
  }

  // If within reasonable proximity (e.g. 60 units), return room
  return minDist <= 60 ? closest : null;
}
