import fs from "fs";
import path from "path";
import sharp from "sharp";
import { config } from "../../../shared/config/env";

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
    const inputRoot = path.resolve(baseUpload);
    const outputRoot = path.resolve(config.OUTPUT_DIR);
    const inputFolder = path.resolve(inputRoot, `${uploadId}_${safeTitle}`);
    const outputFolder = path.resolve(outputRoot, `${uploadId}_${safeTitle}`);

    FileStorage.ensureDir(inputRoot);
    FileStorage.ensureDir(outputRoot);
    FileStorage.ensureDir(inputFolder);
    FileStorage.ensureDir(outputFolder);

    return { inputFolder, outputFolder };
  }

  static async appendBatchFiles(inputFolder: string, batchIndex: number, files: Express.Multer.File[]) {
    const imagePaths: string[] = [];

    try {
      for (const [fileIndex, file] of files.entries()) {
        const dest = FileStorage.buildBatchDestination(inputFolder, batchIndex, fileIndex, file.originalname);
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        FileStorage.moveFile(file.path, dest);
        const normalizedPath = await FileStorage.normalizeImageForPipeline(dest, file.mimetype);
        imagePaths.push(normalizedPath);
      }

      return imagePaths;
    } catch (error) {
      FileStorage.deleteFiles(imagePaths);
      FileStorage.deleteFiles(files.map((file) => file.path));
      throw error;
    }
  }

  static appendVideoChunk(
    inputFolder: string,
    file: Express.Multer.File,
    options: {
      videoIndex: number;
      chunkIndex: number;
      originalName: string;
      existingVideoPath?: string | null;
    }
  ) {
    const sourceFolder = path.join(inputFolder, "_source");
    FileStorage.ensureDir(sourceFolder);

    const safeName = path.basename(options.originalName).replace(/[^\w.-]+/g, "_") || `video_${options.videoIndex}.mp4`;
    const destination = options.existingVideoPath ?? path.join(sourceFolder, `${String(options.videoIndex).padStart(3, "0")}_${safeName}`);

    try {
      if (options.chunkIndex === 0 && fs.existsSync(destination)) {
        fs.unlinkSync(destination);
      }

      const chunkBuffer = fs.readFileSync(file.path);
      fs.appendFileSync(destination, chunkBuffer);
    } finally {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }

    return destination;
  }

  static listFiles(inputFolder: string) {
    if (!fs.existsSync(inputFolder)) return [];

    return fs.readdirSync(inputFolder)
      .map((fileName) => path.join(inputFolder, fileName))
      .filter((filePath) => fs.statSync(filePath).isFile())
      .sort();
  }

  static clearTemporaryVideoSources(inputFolder: string) {
    FileStorage.deleteDirectory(path.join(inputFolder, "_source"));
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

  private static async normalizeImageForPipeline(filePath: string, mimeType?: string) {
    if (!FileStorage.isJpeg(filePath, mimeType)) return filePath;

    const normalizedPath = filePath.replace(/\.(jpe?g)$/i, ".png");
    const sanitized = await sharp(filePath)
      .png()
      .toBuffer();

    fs.writeFileSync(normalizedPath, sanitized);
    if (normalizedPath !== filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return normalizedPath;
  }

  private static isJpeg(filePath: string, mimeType?: string) {
    if (typeof mimeType === "string" && mimeType.toLowerCase() === "image/jpeg") {
      return true;
    }

    return /\.(jpe?g)$/i.test(filePath);
  }
}
