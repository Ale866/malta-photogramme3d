import { Router } from "express";
import { authenticate } from "../../../shared/authenticate";
import { getModelJobDetailsController, getModelJobStatusController } from "./modelJobController";

const router = Router();

router.get("/:jobId/details", authenticate, getModelJobDetailsController);
router.get("/:jobId", authenticate, getModelJobStatusController);

export default router;
