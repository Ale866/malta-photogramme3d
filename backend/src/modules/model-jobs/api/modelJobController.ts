import type { Response } from "express";
import type { AuthedRequest } from "../../../shared/authenticate";
import { getModelJobStatus } from "../application/getModelJobStatus";
import { modelJobServices } from "../infrastructure/modelJobServices";

export async function getModelJobStatusController(req: AuthedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });

    const status = await getModelJobStatus(modelJobServices, {
      jobId: req.params.jobId,
      ownerId: req.user.sub,
    });

    return res.status(200).json(status);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Missing jobId") return res.status(400).json({ error: err.message });
      if (err.message === "Missing ownerId" || err.message === "Not authenticated") {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (err.message === "Forbidden") return res.status(403).json({ error: err.message });
      if (err.message === "Job not found") return res.status(404).json({ error: err.message });
    }

    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
