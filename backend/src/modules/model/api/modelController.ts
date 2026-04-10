import { AuthedRequest } from "../../../shared/authenticate";
import { Response } from "express";
import { getUserModelLibrary } from "../application/getModelLibrary";
import { getAllModels } from "../application/getAllModels";
import { getCatalogModelById, getUserModelById } from "../application/getModelById";
import { getModelMeshAsset, getModelTextureAsset } from "../application/getModelAsset";
import { getIslandModels } from "../application/getIslandModels";
import type { ModelAssetDelivery } from "../application/ports";
import { notFound, sendErrorResponse, unauthorized, } from "../../../shared/errors/applicationError";
import { modelRepo } from "../infrastructure/modelRepo";
import { modelJobRepo } from "../../model-jobs/infrastructure/modelJobRepo";
import { authServices } from "../../auth/infrastructure/authServices";
import { unvoteForModel, voteForModel } from "../application/voteForModel";
import { deleteModel } from "../application/deleteModel";
import { rerunCompletedModel } from "../application/rerunCompletedModel";
import { updateModelOrientation } from "../application/updateModelOrientation";
import { FileStorage } from "../../upload/infrastructure/fileStorage";
import { modelAssetStorage } from "../infrastructure/modelAssetStorage";

const modelLibraryDependencies = {
  models: modelRepo,
  modelJobs: modelJobRepo,
  users: authServices.users,
};

const modelDependencies = {
  models: modelRepo,
  users: authServices.users,
};

const userModelDependencies = {
  models: modelRepo,
  modelJobs: modelJobRepo,
  users: authServices.users,
};

const modelAssetDependencies = {
  models: modelRepo,
  assets: modelAssetStorage,
};

const deleteModelDependencies = {
  models: modelRepo,
  modelJobs: modelJobRepo,
  deleteDirectory: FileStorage.deleteDirectory,
};

const updateModelOrientationDependencies = {
  models: modelRepo,
};

const rerunModelDependencies = {
  models: modelRepo,
  modelJobs: modelJobRepo,
  deleteDirectory: FileStorage.deleteDirectory,
};

export async function getUserModelsController(req: AuthedRequest, res: Response) {
  try {
    if (!req.user) throw unauthorized("Not authenticated");

    const library = await getUserModelLibrary(modelLibraryDependencies, { ownerId: req.user.sub });
    return res.status(200).json(library);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function getAllModelsController(req: AuthedRequest, res: Response) {
  try {
    const catalog = await getAllModels(modelDependencies, req.user?.sub);
    return res.status(200).json(catalog);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function getCatalogModelByIdController(req: AuthedRequest, res: Response) {
  try {
    const { modelId } = req.params;
    const model = await getCatalogModelById(modelDependencies, modelId, req.user?.sub);
    return res.status(200).json(model);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function getUserModelByIdController(req: AuthedRequest, res: Response) {
  try {
    if (!req.user) throw unauthorized("Not authenticated");

    const { modelId } = req.params;
    const model = await getUserModelById(userModelDependencies, modelId, req.user.sub);
    return res.status(200).json(model);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function getIslandModelsController(req: AuthedRequest, res: Response) {
  try {
    const catalog = await getIslandModels(modelDependencies, req.user?.sub);
    return res.status(200).json(catalog);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function getModelMeshAssetController(req: AuthedRequest, res: Response) {
  try {
    const asset = await getModelMeshAsset(
      modelAssetDependencies,
      req.params.modelId,
      req.headers["accept-encoding"],
    );

    return sendAssetVariant(res, asset);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function getModelTextureAssetController(req: AuthedRequest, res: Response) {
  try {
    const asset = await getModelTextureAsset(
      modelAssetDependencies,
      req.params.modelId,
      req.headers.accept,
    );

    return sendAssetVariant(res, asset);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function voteForModelController(req: AuthedRequest, res: Response) {
  try {
    if (!req.user) throw unauthorized("Not authenticated");

    const { modelId } = req.params;
    await voteForModel(modelDependencies, modelId, req.user.sub);
    const voteState = await getVoteState(modelId, req.user.sub);
    return res.status(200).json({
      message: "Vote registered",
      ...voteState,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function unvoteForModelController(req: AuthedRequest, res: Response) {
  try {
    if (!req.user) throw unauthorized("Not authenticated");

    const { modelId } = req.params;
    await unvoteForModel(modelDependencies, modelId, req.user.sub);
    const voteState = await getVoteState(modelId, req.user.sub);
    return res.status(200).json({
      message: "Vote unregistered",
      ...voteState,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function deleteModelController(req: AuthedRequest, res: Response) {
  try {
    if (!req.user) throw unauthorized("Not authenticated");

    await deleteModel(deleteModelDependencies, {
      modelId: req.params.modelId,
      ownerId: req.user.sub,
    });

    return res.status(200).json({
      success: true,
      message: "Model deleted",
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function rerunCompletedModelController(req: AuthedRequest, res: Response) {
  try {
    if (!req.user) throw unauthorized("Not authenticated");

    const rerunJob = await rerunCompletedModel(rerunModelDependencies, {
      modelId: req.params.modelId,
      ownerId: req.user.sub,
    });

    return res.status(200).json({
      success: true,
      message: "Model queued for rerun",
      jobId: rerunJob.id,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function updateModelOrientationController(req: AuthedRequest, res: Response) {
  try {
    if (!req.user) throw unauthorized("Not authenticated");

    await updateModelOrientation(updateModelOrientationDependencies, {
      modelId: req.params.modelId,
      ownerId: req.user.sub,
      orientation: req.body?.orientation,
    });

    const model = await getUserModelById(userModelDependencies, req.params.modelId, req.user.sub);
    return res.status(200).json(model);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

async function getVoteState(modelId: string, userId: string) {
  const model = await modelRepo.findById(modelId);
  if (!model) throw notFound("Model not found", "model_not_found");

  return {
    modelId: model.id,
    voteCount: model.userVotesIds.length,
    hasVoted: model.userVotesIds.includes(userId),
  };
}

function sendAssetVariant(res: Response, asset: ModelAssetDelivery) {
  if (asset.varyHeader) {
    res.vary(asset.varyHeader);
  }

  res.type(asset.contentType);

  if (asset.contentEncoding) {
    res.setHeader("Content-Encoding", asset.contentEncoding);
  }

  return res.sendFile(asset.path);
}
