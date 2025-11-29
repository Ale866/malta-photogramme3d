import { UploadService } from "./uploadService";
import { runMeshroom } from "../infrastructure/meshroomRunner";

export async function runMeshroomPipeline(title: string, files: Express.Multer.File[]) {
  const job = UploadService.prepareJob(title, files);

  runMeshroom(job.inputFolder, job.outputFolder)
    .then(() => console.log("Meshroom completed:", job.outputFolder))
    .catch(err => console.error("Meshroom failed:", err));

  return job;
}
