import { UploadService } from "./uploadService";
import { runMeshroom } from "../infrastructure/meshroomRunner";

export async function runMeshroomPipeline(title: string, files: Express.Multer.File[]) {
  const job = UploadService.prepareJob(title, files);

  await runMeshroom(job.inputFolder, job.outputFolder);

  return job;
}