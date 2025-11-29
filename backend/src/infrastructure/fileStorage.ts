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
    const inputFolder = path.resolve(baseUpload, `${timestamp}_${title.replace(/\s+/g, "_")}`);
    const outputFolder = path.resolve("output", `${timestamp}_${title.replace(/\s+/g, "_")}`);

    this.ensureDir(inputFolder);
    this.ensureDir(outputFolder);

    return { inputFolder, outputFolder };
  }
}
