import type { Response } from "express";
import type { AuthedRequest } from "../../../shared/authenticate";
import { getModelJobDetails } from "../application/getModelJobDetails";
import { getModelJobStatus } from "../application/getModelJobStatus";
import {
  sendErrorResponse,
  unauthorized,
} from "../../../shared/errors/applicationError";
import { modelJobRepo } from "../infrastructure/modelJobRepo";
import { deleteFailedModelJob } from "../application/deleteFailedModelJob";
import { FileStorage } from "../../upload/infrastructure/fileStorage";

const modelJobDependencies = {
  modelJobs: modelJobRepo,
};

const deleteModelJobDependencies = {
  modelJobs: modelJobRepo,
  deleteDirectory: FileStorage.deleteDirectory,
};

export async function getModelJobDetailsController(req: AuthedRequest, res: Response) {
  try {
    if (!req.user) throw unauthorized("Not authenticated");

    const details = await getModelJobDetails(modelJobDependencies, {
      jobId: req.params.jobId,
      ownerId: req.user.sub,
    });

    return res.status(200).json(details);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function getModelJobStatusController(req: AuthedRequest, res: Response) {
  try {
    if (!req.user) throw unauthorized("Not authenticated");

    const status = await getModelJobStatus(modelJobDependencies, {
      jobId: req.params.jobId,
      ownerId: req.user.sub,
    });

    return res.status(200).json(status);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function deleteFailedModelJobController(req: AuthedRequest, res: Response) {
  try {
    if (!req.user) throw unauthorized("Not authenticated");

    await deleteFailedModelJob(deleteModelJobDependencies, {
      jobId: req.params.jobId,
      ownerId: req.user.sub,
    });

    return res.status(200).json({
      success: true,
      message: "Failed model job deleted",
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}
