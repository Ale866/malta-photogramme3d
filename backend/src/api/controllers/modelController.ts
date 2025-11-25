import { Request, Response } from "express";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export async function runMeshroomPipeline(req: Request, res: Response) {
  try {
    const images = req.files as Express.Multer.File[];
    const { title = "model" } = req.body;

    if (!images || images.length === 0) {
      return res.status(400).json({ error: "No images uploaded" });
    }

    const jobInput = path.resolve("uploads", `${Date.now()}_${title}`);
    fs.mkdirSync(jobInput, { recursive: true });

    for (const file of images) {
      const dest = path.join(jobInput, file.originalname);
      fs.renameSync(file.path, dest);
    }

    const outputFolder = path.resolve("output", `${Date.now()}_${title}`);
    fs.mkdirSync(outputFolder, { recursive: true });

    console.log("Running Meshroom on:", jobInput);

    const meshroom = spawn(
      "C:\\Users\\Alessandro\\Documents\\UNI\\FYP\\Meshroom-2025.1.0\\meshroom_batch.exe",
      [
        "--input", jobInput,
        "--output", outputFolder,
        "--pipeline", "c:\\Users\\Alessandro\\Documents\\UNI\\FYP\\Meshroom-2025.1.0\\aliceVision\\share\\meshroom\\photogrammetryDraft.mg"
      ],
      { shell: true }
    );

    meshroom.stdout.on("data", d => console.log("[Meshroom]", d.toString()));
    meshroom.stderr.on("data", d => console.error("[Meshroom ERROR]", d.toString()));

    meshroom.on("close", code => {
      console.log("Meshroom finished with exit code", code);
    });

    return res.json({
      success: true,
      message: "Meshroom started",
      inputFolder: jobInput,
      outputFolder
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
