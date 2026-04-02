import fs from "fs";
import { config } from "./env";

export function ensureStorageDirectories() {
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(config.UPLOAD_TMP, { recursive: true });
  fs.mkdirSync(config.OUTPUT_DIR, { recursive: true });
}
