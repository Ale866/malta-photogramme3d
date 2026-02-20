import { Response } from "express";
import type { AuthedRequest } from "../../../shared/authenticate";
import { startUpload } from "../application/upload";
import { uploadServices } from "../infrastructure/uploadServices";

export async function uploadController(req: AuthedRequest, res: Response) {
  try {
    const files = req.files as Express.Multer.File[];
    const { title } = req.body ?? {};

    const result = await startUpload(uploadServices, {
      ownerId: req.user?.sub,
      title,
      files,
    });

    return res.status(202).json({
      success: true,
      message: "Upload accepted",
      jobId: result.jobId,
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Not authenticated") {
        return res.status(401).json({ error: err.message });
      }

      if (err.message === "Title is required" || err.message === "No images uploaded") {
        return res.status(400).json({ error: err.message });
      }
    }

    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
