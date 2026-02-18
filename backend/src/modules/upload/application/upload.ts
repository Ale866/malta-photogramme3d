import { runMeshroomPipeline } from "../../pipeline/application/runMeshroomPipeline";
import type { UploadServices } from "./ports";

type StartUploadInput = {
  ownerId?: string;
  title: unknown;
  files?: Express.Multer.File[];
};

export async function startUpload(services: UploadServices, input: StartUploadInput) {
  if (!input.ownerId) throw new Error("Not authenticated");

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) throw new Error("Title is required");

  const files = input.files ?? [];
  if (files.length === 0) throw new Error("No images uploaded");

  const job = await services.modelJobs.create({
    ownerId: input.ownerId,
    title,
    status: "queued",
    imagePaths: files.map((file) => file.path),
  });

  void (async () => {
    try {
      await services.modelJobs.setRunning(job.id);

      const prepared = prepareJobFiles(services, title, files);
      await runMeshroomPipeline(services.pipeline, {
        inputFolder: prepared.inputFolder,
        outputFolder: prepared.outputFolder,
      });

      await services.modelJobs.setDone(job.id);
      console.log("Set done");
    } catch (e) {
      console.error("Pipeline failed for job", job.id, e);
      await services.modelJobs.setFailed(job.id);
    }
  })();

  return { jobId: job.id };
}

function prepareJobFiles(services: UploadServices, title: string, files: Express.Multer.File[]) {
  const { inputFolder, outputFolder } = services.fileStorage.createJobDirectories("uploads", title);

  const imagePaths: string[] = [];
  for (const file of files) {
    const dest = `${inputFolder}/${file.originalname}`;
    services.fileStorage.moveFile(file.path, dest);
    imagePaths.push(dest);
  }

  return {
    inputFolder,
    outputFolder,
    imagePaths,
  };
}
