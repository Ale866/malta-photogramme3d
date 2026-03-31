import fs from "fs";
import path from "path";

export class FileStorage {
  static ensureDir(dir: string) {
    fs.mkdirSync(dir, { recursive: true });
  }

  static moveFile(src: string, dest: string) {
    fs.renameSync(src, dest);
  }

  static deleteFile(filePath: string) {
    if (!fs.existsSync(filePath)) return;
    fs.unlinkSync(filePath);
  }

  static deleteFiles(filePaths: string[]) {
    for (const filePath of filePaths) {
      FileStorage.deleteFile(filePath);
    }
  }

  static deleteDirectory(dirPath: string) {
    const normalizedInput = typeof dirPath === "string" ? dirPath.trim() : "";
    if (!normalizedInput) return;

    const normalizedPath = path.resolve(normalizedInput);
    if (!fs.existsSync(normalizedPath)) return;
    fs.rmSync(normalizedPath, { recursive: true, force: true });
  }

  static createUploadDirectories(baseUpload: string, title: string, uploadId: string) {
    const safeTitle = title.replace(/\s+/g, "_");
    const inputFolder = path.resolve(baseUpload, `${uploadId}_${safeTitle}`);
    const outputFolder = path.resolve("output", `${uploadId}_${safeTitle}`);

    FileStorage.ensureDir(inputFolder);
    FileStorage.ensureDir(outputFolder);

    return { inputFolder, outputFolder };
  }

  static appendBatchFiles(inputFolder: string, batchIndex: number, files: Express.Multer.File[]) {
    const imagePaths: string[] = [];

    try {
      files.forEach((file, fileIndex) => {
        const dest = FileStorage.buildBatchDestination(inputFolder, batchIndex, fileIndex, file.originalname);
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        FileStorage.moveFile(file.path, dest);
        imagePaths.push(dest);
      });

      return imagePaths;
    } catch (error) {
      FileStorage.deleteFiles(imagePaths);
      FileStorage.deleteFiles(files.map((file) => file.path));
      throw error;
    }
  }

  static listFiles(inputFolder: string) {
    if (!fs.existsSync(inputFolder)) return [];

    return fs.readdirSync(inputFolder)
      .map((fileName) => path.join(inputFolder, fileName))
      .filter((filePath) => fs.statSync(filePath).isFile())
      .sort();
  }

  private static buildBatchDestination(
    inputFolder: string,
    batchIndex: number,
    fileIndex: number,
    originalName: string
  ) {
    const fileName = path.basename(originalName).replace(/[^\w.-]+/g, "_");
    return path.join(inputFolder, `${batchIndex}_${fileIndex}_${fileName}`);
  }
}
