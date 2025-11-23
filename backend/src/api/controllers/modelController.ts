import { Request, Response } from "express";
import { spawn } from "child_process";

export async function runMeshroomPipeline(req: Request, res: Response) {
  console.log("runMeshroomPipeline called");
  // try {
  //   const { title } = req.body;
  //   const images = req.files as Express.Multer.File[];

  //   if (!images || images.length === 0) {
  //     return res.status(400).json({ error: "No images uploaded" });
  //   }

  //   const imagePaths = images.map(f => f.path);

  //   console.log("Received model:", title);
  //   console.log("Images:", imagePaths);

  //   const meshroom = spawn("C:\\Users\\Alessandro\\Documents\\UNI\\FYP\\Meshroom-2025.1.0\\meshroom_batch.exe", [
  //     "--input", imagePaths.join(","),
  //     "--output", `output/${Date.now()}_${title}`
  //   ]);

  //   meshroom.stdout.on("data", data => console.log("Meshroom:", data.toString()));
  //   meshroom.stderr.on("data", data => console.error("Meshroom ERR:", data.toString()));

  //   meshroom.on("close", code => {
  //     console.log("Meshroom finished with code", code);
  //   });

  //   return res.json({
  //     success: true,
  //     message: "Images uploaded. Meshroom pipeline started.",
  //     images: imagePaths
  //   });

  // } catch (err) {
  //   console.error(err);
  //   return res.status(500).json({ error: "Server error" });
  // }
}
