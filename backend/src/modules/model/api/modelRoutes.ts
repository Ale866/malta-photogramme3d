import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../../shared/authenticate";
import { getAllModelsController, getUserModelsController, unvoteForModelController, voteForModelController } from "./modelController";

const router = Router();

router.get("/list", authenticate, getUserModelsController);
router.get("/catalog", optionalAuthenticate, getAllModelsController)
router.post('/:modelId/vote', authenticate, voteForModelController);
router.delete('/:modelId/vote', authenticate, unvoteForModelController);

export default router;