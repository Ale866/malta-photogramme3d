import { Response } from "express";
import type { AuthedRequest } from "../../../shared/authenticate";
import { startUpload } from "../application/upload";
import { uploadServices } from "../infrastructure/uploadServices";
import {
  badRequest,
  sendErrorResponse,
} from "../../../shared/errors/applicationError";

function parseCoordinates(input: unknown) {
  if (typeof input !== "string") return input;

  try {
    return JSON.parse(input);
  } catch {
    throw badRequest("Invalid coordinates JSON", "invalid_coordinates_json");
  }
}

export async function uploadController(req: AuthedRequest, res: Response) {
  try {
    const files = req.files as Express.Multer.File[];
    const { title, coordinates } = req.body ?? {};
    const parsedCoordinates = parseCoordinates(coordinates);

    const result = await startUpload(uploadServices, {
      ownerId: req.user?.sub,
      title,
      files,
      coordinates: parsedCoordinates
    });

    return res.status(202).json({
      success: true,
      message: "Upload accepted",
      jobId: result.jobId,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}
