import { Request, Response } from "express";
import { runMeshroomPipeline } from "../../application/runMeshroomPipeline";

export async function uploadController(req: Request, res: Response) {
  try {
    const files = req.files as Express.Multer.File[];
    const { title } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No images uploaded" });
    }

    const job = await runMeshroomPipeline(title, files);

    return res.json({
      success: true,
      message: "Meshroom started",
      // inputFolder: job.inputFolder,
      // outputFolder: job.outputFolder,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
