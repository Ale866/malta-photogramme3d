import type { Response } from "express";
import type { AuthedRequest } from "../../../shared/authenticate";
import { getModelJobStatus } from "../application/getModelJobStatus";
import { modelJobServices } from "../infrastructure/modelJobServices";
import {
  sendErrorResponse,
  unauthorized,
} from "../../../shared/errors/applicationError";

export async function getModelJobStatusController(req: AuthedRequest, res: Response) {
  try {
    if (!req.user) throw unauthorized("Not authenticated");

    const status = await getModelJobStatus(modelJobServices, {
      jobId: req.params.jobId,
      ownerId: req.user.sub,
    });

    return res.status(200).json(status);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}
