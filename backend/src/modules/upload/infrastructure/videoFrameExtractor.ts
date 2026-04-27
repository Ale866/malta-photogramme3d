import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { badRequest } from "../../../shared/errors/applicationError";
import { config } from "../../../shared/config/env";
import { FileStorage } from "./fileStorage";

const DEFAULT_VIDEO_FRAME_PREFIX = "frame_";
const VIDEO_FPS = "3";

export const videoFrameExtractor = {
  async extractFrames(videoPath: string, inputFolder: string, framePrefix: string, clearExisting = false) {
    if (clearExisting) {
      clearExtractedFrames(inputFolder);
    }

    const outputPattern = path.join(inputFolder, `${framePrefix}%06d.png`);
    const stderrChunks: string[] = [];

    await new Promise<void>((resolve, reject) => {
      const child = spawn(config.FFMPEG_BIN, [
        "-y",
        "-i",
        videoPath,
        "-vf",
        `fps=${VIDEO_FPS}`,
        outputPattern,
      ], {
        stdio: ["ignore", "ignore", "pipe"],
      });

      child.stderr.on("data", (chunk) => {
        stderrChunks.push(chunk.toString());
      });

      child.on("error", (error) => {
        reject(error);
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        const details = stderrChunks.join("").trim();
        reject(new Error(details ? `ffmpeg failed: ${details}` : `ffmpeg failed with exit code ${code}`));
      });
    }).catch((error) => {
      throw badRequest(
        error instanceof Error ? error.message : "Failed to extract video frames",
        "video_frame_extraction_failed"
      );
    });

    const extractedFrames = FileStorage.listFiles(inputFolder)
      .filter((filePath) => path.basename(filePath).startsWith(framePrefix));

    if (extractedFrames.length === 0) {
      throw badRequest(
        "The uploaded video did not produce any usable frames",
        "video_frames_not_found"
      );
    }

    return extractedFrames;
  },
};

function clearExtractedFrames(inputFolder: string) {
  if (!fs.existsSync(inputFolder)) return;

  for (const entry of fs.readdirSync(inputFolder)) {
    if (!isExtractedFrame(entry)) continue;
    const targetPath = path.join(inputFolder, entry);
    if (!fs.statSync(targetPath).isFile()) continue;
    fs.unlinkSync(targetPath);
  }
}

function isExtractedFrame(fileName: string) {
  if (fileName.startsWith(DEFAULT_VIDEO_FRAME_PREFIX)) return true;
  return /^video_\d+_frame_\d+\.png$/i.test(fileName);
}
