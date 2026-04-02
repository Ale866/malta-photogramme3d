import multer from "multer";
import { config } from "../../../shared/config/env";
import { ensureStorageDirectories } from "../../../shared/config/storage";

ensureStorageDirectories();

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, config.UPLOAD_TMP),
  filename: (_, file, cb) => cb(null, `${Date.now()}_${Math.round(Math.random() * 1e9)}_${file.originalname}`),
});

export const upload = multer({ storage });
