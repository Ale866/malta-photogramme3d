import { Router } from "express";
import multer from "multer";
import { runMeshroomPipeline } from "../controllers/modelController.js";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

router.post(
  "/",
  upload.array("images", 50),
  runMeshroomPipeline
);

export default router;
