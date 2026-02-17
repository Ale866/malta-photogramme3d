import { Response } from "express";
import { runMeshroomPipeline } from "../../application/runMeshroomPipeline";
import { AuthedRequest } from "../middlewares/authenticate";
import { modelJobRepo } from "../../infrastructure/repo/modelJobRepo";

export async function uploadController(req: AuthedRequest, res: Response) {
  try {
    const files = req.files as Express.Multer.File[];
    const { title } = req.body;

    if (!req.user) return res.status(401).json({ error: "Not authenticated" });

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No images uploaded" });
    }

    const job = await modelJobRepo.create({
      ownerId: req.user.sub,
      title: title.trim(),
      status: "queued",
      imagePaths: files.map(f => f.path),
    });

    res.status(202).json({
      success: true,
      message: "Upload accepted",
      jobId: job.id,
    });

    (async () => {
      try {
        await modelJobRepo.setRunning(job.id);
        await runMeshroomPipeline(title.trim(), files);
        await modelJobRepo.setDone(job.id);
        console.log("Set done");
      } catch (e) {
        console.error("Pipeline failed for job", job.id, e);
        await modelJobRepo.setFailed(job.id);
      }
    })();

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}