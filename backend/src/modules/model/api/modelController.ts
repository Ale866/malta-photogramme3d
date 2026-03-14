import { AuthedRequest } from "../../../shared/authenticate";
import { Response } from "express";
import { getUserModelLibrary } from "../application/getModelLibrary";
import { modelServices, modelLibraryServices } from "../infrastructure/modelService";
import { getAllModels } from "../application/getAllModels";
import {
  sendErrorResponse,
  unauthorized,
} from "../../../shared/errors/applicationError";

export async function getUserModelsController(req: AuthedRequest, res: Response) {
  try {
    if (!req.user) throw unauthorized("Not authenticated");

    const library = await getUserModelLibrary(modelLibraryServices, { ownerId: req.user.sub });
    return res.status(200).json(library);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function getAllModelsController(req: AuthedRequest, res: Response) {
  try {
    const catalog = await getAllModels(modelServices);
    return res.status(200).json(catalog);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
