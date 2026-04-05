import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../../shared/authenticate";
import { deleteModelController, getAllModelsController, getCatalogModelByIdController, getIslandModelsController, getModelMeshAssetController, getModelTextureAssetController, getUserModelByIdController, getUserModelsController, rerunCompletedModelController, unvoteForModelController, updateModelOrientationController, voteForModelController } from "./modelController";

const router = Router();

router.get("/list", authenticate, getUserModelsController);
router.get("/list/:modelId", authenticate, getUserModelByIdController);
router.delete("/list/:modelId", authenticate, deleteModelController);
router.post("/list/:modelId/rerun", authenticate, rerunCompletedModelController);
router.patch("/list/:modelId/orientation", authenticate, updateModelOrientationController);
router.get("/catalog", optionalAuthenticate, getAllModelsController)
router.get("/catalog/:modelId", optionalAuthenticate, getCatalogModelByIdController)
router.get("/island", optionalAuthenticate, getIslandModelsController)
router.get("/:modelId/mesh", optionalAuthenticate, getModelMeshAssetController)
router.get("/:modelId/texture", optionalAuthenticate, getModelTextureAssetController)
router.post('/:modelId/vote', authenticate, voteForModelController);
router.delete('/:modelId/vote', authenticate, unvoteForModelController);

export default router;
