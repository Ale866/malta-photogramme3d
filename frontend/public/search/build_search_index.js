import fs from "fs";
import parser from "osm-pbf-parser";

const OUTPUT = "./public/search/malta_search_index.json";
const INPUT = "./public/search/malta_search_data.osm.pbf";

const entries = [];
const seen = new Map();

const nodeCoords = new Map();
const wayCoords = new Map();
const pendingWays = [];
const placeNodes = [];
const adminRelations = [];
const adminPolygons = [];

function polygonArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j].lon + ring[i].lon) * (ring[j].lat - ring[i].lat);
  }
  return Math.abs(area / 2);
}

function extractNames(tags) {
  const names = new Set();
  if (tags.name) names.add(tags.name);
  if (tags["name:en"]) names.add(tags["name:en"]);
  if (tags["name:mt"]) names.add(tags["name:mt"]);
  if (tags.alt_name) names.add(tags.alt_name);
  if (tags.brand) names.add(tags.brand);
  return [...names];
}

function computeWayCenter(refs) {
  let latSum = 0;
  let lonSum = 0;
  let count = 0;
  for (const ref of refs || []) {
    const n = nodeCoords.get(ref);
    if (!n) continue;
    latSum += n.lat;
    lonSum += n.lon;
    count++;
  }
  if (!count) return null;
  return { lat: latSum / count, lon: lonSum / count };
}

function pointInPolygon(lat, lon, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon;
    const yi = polygon[i].lat;
    const xj = polygon[j].lon;
    const yj = polygon[j].lat;
    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function findCityByBoundary(lat, lon) {
  let best = null;
  let bestArea = -Infinity;
  for (const admin of adminPolygons) {
    for (const ring of admin.rings) {
      if (pointInPolygon(lat, lon, ring)) {
        if (admin.area > bestArea) {
          best = admin;
          bestArea = admin.area;
        }
        break;
      }
    }
  }
  return best;
}

function findNearestPlace(lat, lon) {
  let best = null;
  let bestDist = Infinity;
  for (const p of placeNodes) {
    const dLat = lat - p.lat;
    const dLon = lon - p.lon;
    const dist = dLat * dLat + dLon * dLon;
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  return best;
}

function add(entry) {
  if (entry.lat == null || entry.lon == null) return;
  const admin = findCityByBoundary(entry.lat, entry.lon);
  if (admin) {
    entry.city = admin.name;
  } else {
    const place = findNearestPlace(entry.lat, entry.lon);
    if (place) entry.city = place.name;
  }
  const key = [
    entry.type,
    entry.name.toLowerCase(),
    entry.city?.toLowerCase() ?? "",
  ].join(":");
  if (!seen.has(key)) {
    seen.set(key, true);
    entries.push(entry);
  }
}

fs.createReadStream(INPUT)
  .pipe(parser())
  .on("data", (items) => {
    for (const item of items) {
      if (item.type === "node" && item.lat != null && item.lon != null) {
        nodeCoords.set(item.id, { lat: item.lat, lon: item.lon });
      }
      if (item.type === "way") {
        wayCoords.set(item.id, item.refs);
      }
      if (
        item.type === "relation" &&
        item.tags?.boundary === "administrative" &&
        item.tags.name &&
        item.tags.admin_level === "8"
      ) {
        adminRelations.push(item);
        continue;
      }
      if (!item.tags) continue;
      const names = extractNames(item.tags);
      if (!names.length) continue;
      if (
        item.type === "node" &&
        item.tags.place &&
        ["city", "town", "village", "suburb", "locality"].includes(
          item.tags.place
        )
      ) {
        for (const name of names) {
          placeNodes.push({ name, lat: item.lat, lon: item.lon });
        }
        continue;
      }
      if (item.type === "way") {
        const center = computeWayCenter(item.refs);
        if (!center) {
          pendingWays.push(item);
          continue;
        }
        indexWay(item, center);
      }
      if (item.type === "node") {
        for (const name of names) {
          add({
            id: `node:${item.id}`,
            name,
            type: "poi",
            rank: 4,
            lat: item.lat,
            lon: item.lon,
          });
        }
      }
    }
  })
  .on("end", () => {
    for (const rel of adminRelations) {
      const rings = [];
      for (const m of rel.members) {
        if (m.type !== "way" || m.role !== "outer") continue;
        const refs = wayCoords.get(m.id);
        if (!refs) continue;
        const ring = [];
        for (const ref of refs) {
          const n = nodeCoords.get(ref);
          if (n) ring.push(n);
        }
        if (ring.length > 3) {
          rings.push(ring);
        }
      }
      if (rings.length) {
        let totalArea = 0;
        for (const ring of rings) {
          totalArea += polygonArea(ring);
        }
        adminPolygons.push({
          name: rel.tags.name,
          admin_level: Number(rel.tags.admin_level),
          rings,
          area: totalArea,
        });
      }
    }
    for (const way of pendingWays) {
      const center = computeWayCenter(way.refs);
      if (!center || !way.tags) continue;
      indexWay(way, center);
    }
    fs.mkdirSync("public/search", { recursive: true });
    fs.writeFileSync(OUTPUT, JSON.stringify(entries, null, 2), "utf-8");
    console.log(`Index built: ${entries.length} entries,`);
    console.log(`Admin boundaries loaded: ${adminPolygons.length}`);
  });

function indexWay(item, center) {
  const names = extractNames(item.tags);
  if (!names.length) return;
  if (item.tags.highway) {
    for (const name of names) {
      add({
        id: `street:${item.id}`,
        name,
        type: "street",
        rank: 2,
        lat: center.lat,
        lon: center.lon,
      });
    }
    return;
  }
  if (
    item.tags.shop ||
    item.tags.amenity ||
    item.tags.tourism ||
    item.tags.leisure ||
    item.tags.office ||
    item.tags.building
  ) {
    for (const name of names) {
      add({
        id: `way:${item.id}`,
        name,
        type: "poi",
        rank: 4,
        lat: center.lat,
        lon: center.lon,
      });
    }
  }
}
