import { Router } from "express";
import { upload } from "../infrastructure/multerConfig";
import { uploadController } from "./uploadController";
import { authenticate } from "../../../shared/authenticate";

const router = Router();

router.post("/", authenticate, upload.array("files", 50), uploadController);

export default router;
