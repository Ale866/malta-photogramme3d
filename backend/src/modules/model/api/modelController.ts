import { AuthedRequest } from "../../../shared/authenticate";
import { Response } from "express";
import { getUserModelLibrary } from "../application/getModelLibrary";
import { getAllModels } from "../application/getAllModels";
import { notFound, sendErrorResponse, unauthorized, } from "../../../shared/errors/applicationError";
import { modelRepo } from "../infrastructure/modelRepo";
import { modelJobRepo } from "../../model-jobs/infrastructure/modelJobRepo";
import { authServices } from "../../auth/infrastructure/authServices";
import { unvoteForModel, voteForModel } from "../application/voteForModel";

const modelLibraryDependencies = {
  models: modelRepo,
  modelJobs: modelJobRepo,
  users: authServices.users,
};

const modelDependencies = {
  models: modelRepo,
  users: authServices.users,
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

async function getVoteState(modelId: string, userId: string) {
  const model = await modelRepo.findById(modelId);
  if (!model) throw notFound("Model not found", "model_not_found");

  return {
    modelId: model.id,
    voteCount: model.userVotesIds.length,
    hasVoted: model.userVotesIds.includes(userId),
  };
}
