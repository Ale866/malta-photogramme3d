import { AuthedRequest } from "../../../shared/authenticate";
import { Response } from "express";
import { getUserModels } from "../application/getModels";
import { modelServices } from "../infrastructure/modelService";

export async function getModelsController(req: AuthedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });

    const models = await getUserModels(modelServices, { ownerId: req.user.sub })
    return res.status(200).json(models);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Not authenticated") {
        return res.status(401).json({ error: err.message });
      }

      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }
}