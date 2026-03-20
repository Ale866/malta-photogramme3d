import { AuthedRequest } from "../../../shared/authenticate";
import { Response } from "express";
import { getUserModelLibrary } from "../application/getModelLibrary";
import { getAllModels } from "../application/getAllModels";
import {
  sendErrorResponse,
  unauthorized,
} from "../../../shared/errors/applicationError";
import { modelRepo } from "../infrastructure/modelRepo";
import { modelJobRepo } from "../../model-jobs/infrastructure/modelJobRepo";
import { authServices } from "../../auth/infrastructure/authServices";

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
    const catalog = await getAllModels(modelDependencies);
    return res.status(200).json(catalog);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}
