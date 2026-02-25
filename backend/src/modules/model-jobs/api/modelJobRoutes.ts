import { Router } from "express";
import { authenticate } from "../../../shared/authenticate";
import { getModelJobStatusController } from "./modelJobController";

const router = Router();

router.get("/:jobId", authenticate, getModelJobStatusController);

export default router;
