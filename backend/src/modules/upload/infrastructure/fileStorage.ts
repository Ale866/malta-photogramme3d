import fs from "fs";
import path from "path";

export class FileStorage {
  static ensureDir(dir: string) {
    fs.mkdirSync(dir, { recursive: true });
  }

  static moveFile(src: string, dest: string) {
    fs.renameSync(src, dest);
  }

  static createJobDirectories(baseUpload: string, title: string) {
    const timestamp = Date.now();
    const safeTitle = title.replace(/\s+/g, "_");
    const inputFolder = path.resolve(baseUpload, `${timestamp}_${safeTitle}`);
    const outputFolder = path.resolve("output", `${timestamp}_${safeTitle}`);

    this.ensureDir(inputFolder);
    this.ensureDir(outputFolder);

    return { inputFolder, outputFolder };
  }

  static stageUpload(baseUpload: string, title: string, files: Express.Multer.File[]) {
    const { inputFolder, outputFolder } = this.createJobDirectories(baseUpload, title);

    const imagePaths: string[] = [];
    for (const file of files) {
      const dest = path.join(inputFolder, file.originalname);
      this.moveFile(file.path, dest);
      imagePaths.push(dest);
    }

    return { inputFolder, outputFolder, imagePaths };
  }
}