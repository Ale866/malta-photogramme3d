import { Router } from "express";
import { upload } from "../../infrastructure/multerConfig";
import { uploadController } from "../controllers/uploadController";

const router = Router();

router.post("/", upload.array("files", 50), uploadController);

export default router;
