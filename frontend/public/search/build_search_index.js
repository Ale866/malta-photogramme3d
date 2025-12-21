import fs from "fs";
import parser from "osm-pbf-parser";

const OUTPUT = "./public/search/malta_search_index.json";
const INPUT = "./public/search/malta_search_data.osm.pbf";

const entries = [];
const seen = new Map();

const nodeCoords = new Map();
const placeNodes = [];

let maltaLatSum = 0;
let maltaLonSum = 0;
let maltaCount = 0;

function add(entry) {
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
  return Array.from(names);
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

  if (placeNodes.length) {
    return {
      lat: placeNodes[0].lat,
      lon: placeNodes[0].lon,
    };
  }

  return MALTA_CENTER;
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

      const center = item.type === "way" ? computeWayCenter(item.refs) : null;

      const coords = resolveCoords(item, center);

      if (
        item.tags.place &&
        ["city", "town", "village", "suburb", "locality"].includes(
          item.tags.place
        )
      ) {
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
      } else if (item.tags.highway) {
        for (const name of names) {
          add({
            id: `street:${item.id}`,
            name,
            type: "street",
            rank: 2,
            lat: coords.lat,
            lon: coords.lon,
          });
        }
      } else if (item.tags["addr:housenumber"] && item.tags["addr:street"]) {
        const streetNames = extractNames({
          name: item.tags["addr:street"],
        });

        for (const name of streetNames) {
          add({
            id: `house:${item.id}`,
            name,
            type: "house",
            housenumber: item.tags["addr:housenumber"],
            rank: 3,
            lat: coords.lat,
            lon: coords.lon,
          });
        }
      } else {
        for (const name of names) {
          add({
            id: `${item.type}:${item.id}`,
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
    global.MALTA_CENTER = {
      lat: maltaLatSum / maltaCount,
      lon: maltaLonSum / maltaCount,
    };

    fs.mkdirSync("public/search", { recursive: true });
    fs.writeFileSync(OUTPUT, JSON.stringify(entries, null, 2), "utf-8");

    console.log(`Index built: ${entries.length} entries`);
  });
