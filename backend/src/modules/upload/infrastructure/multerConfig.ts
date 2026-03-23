import multer from "multer";
import fs from "fs";
import { config } from "../../../shared/config/env";

if (!fs.existsSync(config.UPLOAD_TMP)) {
  fs.mkdirSync(config.UPLOAD_TMP, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, config.UPLOAD_TMP),
  filename: (_, file, cb) => cb(null, `${Date.now()}_${Math.round(Math.random() * 1e9)}_${file.originalname}`),
});

export const upload = multer({ storage });
