import { Router } from "express";
import { authenticate } from "../../../shared/authenticate";
import { getAllModelsController, getUserModelsController } from "./modelController";

const router = Router();

router.get("/list", authenticate, getUserModelsController);
router.get("/catalog", getAllModelsController)

export default router;