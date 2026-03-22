import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../../shared/authenticate";
import { getAllModelsController, getIslandModelsController, getUserModelsController, unvoteForModelController, voteForModelController } from "./modelController";

const router = Router();

router.get("/list", authenticate, getUserModelsController);
router.get("/catalog", optionalAuthenticate, getAllModelsController)
router.get("/island", optionalAuthenticate, getIslandModelsController)
router.post('/:modelId/vote', authenticate, voteForModelController);
router.delete('/:modelId/vote', authenticate, unvoteForModelController);

export default router;
