import { Router } from "express";
import { authenticate } from "../../../shared/authenticate";
import { getModelsController } from "./modelController";

const router = Router();

router.get("/list", authenticate, getModelsController);

export default router;