import { FileStorage } from "../infrastructure/fileStorage";

export class UploadService {
  static prepareJob(title: string, files: Express.Multer.File[]) {
    const { inputFolder, outputFolder } =
      FileStorage.createJobDirectories("uploads", title);

    const imagePaths: string[] = [];

    for (const file of files) {
      const dest = `${inputFolder}/${file.originalname}`;
      FileStorage.moveFile(file.path, dest);
      imagePaths.push(dest);
    }

    return {
      inputFolder,
      outputFolder,
      imagePaths,
    };
  }
}
