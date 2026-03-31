import { Router } from "express";
import { authenticate } from "../../../shared/authenticate";
import { deleteFailedModelJobController, getModelJobDetailsController, getModelJobStatusController } from "./modelJobController";

const router = Router();

router.get("/:jobId/details", authenticate, getModelJobDetailsController);
router.get("/:jobId", authenticate, getModelJobStatusController);
router.delete("/:jobId", authenticate, deleteFailedModelJobController);

export default router;
