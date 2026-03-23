import { Router } from "express";
import { upload } from "../infrastructure/multerConfig";
import { uploadBatchController, uploadFinalizeController, uploadInitController } from "./uploadController";
import { authenticate } from "../../../shared/authenticate";

const router = Router();

router.post("/init", authenticate, uploadInitController);
router.post("/:uploadId/batches", authenticate, upload.array("files", 10), uploadBatchController);
router.post("/:uploadId/finalize", authenticate, uploadFinalizeController);

export default router;
