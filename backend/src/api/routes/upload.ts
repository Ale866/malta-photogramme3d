import { Router } from "express";
import multer from "multer";
import fs from "fs";
import { runMeshroomPipeline } from "../controllers/modelController";

const router = Router();

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads", { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname),
});

const upload = multer({ storage });

router.post("/", upload.array("files", 50), runMeshroomPipeline);

export default router;
