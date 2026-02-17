import { Router } from "express";
import { upload } from "../../infrastructure/multerConfig";
import { uploadController } from "../controllers/uploadController";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.post("/", upload.array("files", 50), authenticate, uploadController);

export default router;
