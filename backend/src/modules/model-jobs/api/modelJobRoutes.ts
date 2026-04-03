import { Router } from "express";
import { authenticate } from "../../../shared/authenticate";
import { deleteFailedModelJobController, getModelJobDetailsController, getModelJobStatusController, rerunFailedModelJobController } from "./modelJobController";

const router = Router();

router.get("/:jobId/details", authenticate, getModelJobDetailsController);
router.get("/:jobId", authenticate, getModelJobStatusController);
router.post("/:jobId/rerun", authenticate, rerunFailedModelJobController);
router.delete("/:jobId", authenticate, deleteFailedModelJobController);

export default router;
