import fs from "fs";
import parser from "osm-pbf-parser";

const OUTPUT = "./public/search/malta_search_index.json";
const INPUT = "./public/search/malta_search_data.osm.pbf";

const entries = [];
const seen = new Map();

function add(entry) {
  const key = `${entry.type}:${entry.name.toLowerCase()}`;
  if (!seen.has(key)) {
    seen.set(key, true);
    entries.push(entry);
  }
}

fs.createReadStream(INPUT)
  .pipe(parser())
  .on("data", (items) => {
    for (const item of items) {
      if (!item.tags.name) continue;

      const name = item.tags.name;

      if (
        item.tags.place &&
        ["city", "town", "village", "suburb", "locality"].includes(
          item.tags.place
        )
      ) {
        add({
          id: `place:${item.id}`,
          name,
          type: "place",
          rank: 1,
        });
      } else if (item.tags.highway) {
        add({
          id: `street:${item.id}`,
          name,
          type: "street",
          rank: 3,
        });
      } else if (item.tags.amenity || item.tags.tourism || item.tags.historic) {
        add({
          id: `poi:${item.id}`,
          name,
          type: "poi",
          rank: 4,
        });
      }
    }
  })
  .on("end", () => {
    fs.mkdirSync("public/", { recursive: true });

    fs.writeFileSync(OUTPUT, JSON.stringify(entries, null, 2), "utf-8");

    console.log(`Index built: ${entries.length} entries`);
  });
