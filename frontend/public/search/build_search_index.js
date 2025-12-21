import fs from "fs";
import parser from "osm-pbf-parser";

const OUTPUT = "./public/search/malta_search_index.json";
const INPUT = "./public/search/malta_search_data.osm.pbf";

const entries = [];
const seen = new Map();

const nodeCoords = new Map();
const placeNodes = [];
const pendingWays = [];

let maltaLatSum = 0;
let maltaLonSum = 0;
let maltaCount = 0;

function add(entry) {
  if (entry.lat == null || entry.lon == null) return;

  const keyParts = [entry.type, entry.name.toLowerCase()];
  if (entry.housenumber) keyParts.push(entry.housenumber);

  const key = keyParts.join(":");
  if (!seen.has(key)) {
    seen.set(key, true);
    entries.push(entry);
  }
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
    const node = nodeCoords.get(ref);
    if (!node) continue;
    latSum += node.lat;
    lonSum += node.lon;
    count++;
  }

  if (!count) return null;

  return {
    lat: latSum / count,
    lon: lonSum / count,
  };
}

function resolveCoords(item, center) {
  if (item.lat != null && item.lon != null) {
    return { lat: item.lat, lon: item.lon };
  }
  if (center) return center;
  return null;
}
fs.createReadStream(INPUT)
  .pipe(parser())
  .on("data", (items) => {
    for (const item of items) {
      if (item.type === "node" && item.lat != null && item.lon != null) {
        nodeCoords.set(item.id, { lat: item.lat, lon: item.lon });
        maltaLatSum += item.lat;
        maltaLonSum += item.lon;
        maltaCount++;
      }

      if (!item.tags) continue;

      const names = extractNames(item.tags);
      if (!names.length) continue;

      if (
        item.tags.place &&
        ["city", "town", "village", "suburb", "locality"].includes(
          item.tags.place
        )
      ) {
        const coords = resolveCoords(item, null);
        if (!coords) continue;

        for (const name of names) {
          const placeEntry = {
            id: `place:${item.id}`,
            name,
            type: "place",
            rank: 1,
            lat: coords.lat,
            lon: coords.lon,
          };
          placeNodes.push(placeEntry);
          add(placeEntry);
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
        const coords = resolveCoords(item, null);
        if (!coords) continue;

        for (const name of names) {
          add({
            id: `node:${item.id}`,
            name,
            type: "poi",
            rank: 4,
            lat: coords.lat,
            lon: coords.lon,
          });
        }
      }
    }
  })
  .on("end", () => {
    for (const way of pendingWays) {
      const center = computeWayCenter(way.refs);
      if (!center || !way.tags) continue;
      indexWay(way, center);
    }

    fs.mkdirSync("public/search", { recursive: true });
    fs.writeFileSync(OUTPUT, JSON.stringify(entries, null, 2), "utf-8");
    console.log(`Index built: ${entries.length} entries`);
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
