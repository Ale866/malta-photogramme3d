import fs from "fs";
import parser from "osm-pbf-parser";

const OUTPUT = "./public/search/malta_search_index.json";
const INPUT = "./public/search/malta_search_data.osm.pbf";

const entries = [];
const seen = new Map();
const placeNodes = [];

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

fs.createReadStream(INPUT)
  .pipe(parser())
  .on("data", (items) => {
    for (const item of items) {
      if (!item.tags) continue;

      const names = extractNames(item.tags);
      if (!names.length) continue;

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
            lat: item.lat,
            lon: item.lon,
          };
          placeNodes.push(placeEntry);
          add(placeEntry);
        }
      }

      else if (item.tags.highway) {
        for (const name of names) {
          add({
            id: `street:${item.id}`,
            name,
            type: "street",
            rank: 2,
            lat: item.lat,
            lon: item.lon,
          });
        }
      }

      else if (item.tags["addr:housenumber"] && item.tags["addr:street"]) {
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
            lat: item.lat,
            lon: item.lon,
          });
        }
      }

      else {
        for (const name of names) {
          add({
            id: `poi:${item.id}`,
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
    fs.mkdirSync("public/search", { recursive: true });
    fs.writeFileSync(OUTPUT, JSON.stringify(entries, null, 2), "utf-8");
    console.log(`✔ Index built: ${entries.length} entries`);
  });
