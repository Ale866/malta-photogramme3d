import { AuthedRequest } from "../../../shared/authenticate";
import { Response } from "express";
import { getUserModelLibrary } from "../application/getModelLibrary";
import { modelLibraryServices } from "../infrastructure/modelService";

export async function getModelsController(req: AuthedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });

    const library = await getUserModelLibrary(modelLibraryServices, { ownerId: req.user.sub });
    return res.status(200).json(library);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Missing ownerId") {
        return res.status(400).json({ error: err.message });
      }
      if (err.message === "Not authenticated") {
        return res.status(401).json({ error: err.message });
      }

      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }
}
