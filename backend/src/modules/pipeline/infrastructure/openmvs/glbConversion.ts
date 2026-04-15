import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { config } from "../../../../shared/config/env";
import {
  requireExistingDirectory,
  requireExistingFile,
  resolveOutputPaths,
} from "../colmapRunner";

export async function runOptionalGlbConversion(outputFolder: string): Promise<void> {
  if (!config.ENABLE_GLB_CONVERSION) {
    console.info("[GLB conversion] Disabled; skipping optional GLB conversion");
    return;
  }

  try {
    await runGlbConversion(outputFolder);
  } catch (error) {
    console.warn("[GLB conversion] Optional GLB conversion failed; continuing with PLY output", error);
  }
}

async function runGlbConversion(outputFolder: string): Promise<void> {
  const blenderBin = config.BLENDER_BIN?.trim();
  if (!blenderBin) {
    throw new Error("BLENDER_BIN is required when ENABLE_GLB_CONVERSION=true");
  }

  const outputPaths = resolveOutputPaths(outputFolder);
  const texturedFolder = requireExistingDirectory(outputPaths.denseTextured);
  const meshPath = requireExistingFile(path.join(texturedFolder, "mesh.ply"), "Published textured mesh");
  const atlasFileNames = readReferencedTextureAtlases(meshPath);
  const outputGlbPath = path.join(texturedFolder, "model.glb");

  for (const atlasFileName of atlasFileNames) {
    requireExistingFile(path.join(texturedFolder, atlasFileName), `Published textured atlas ${atlasFileName}`);
  }

  console.info(
    `[GLB conversion] Attempting Blender conversion with ${atlasFileNames.length} atlas file(s) from ${texturedFolder}`
  );

  await runBlenderCli(blenderBin, {
    meshPath,
    texturedFolder,
    outputGlbPath,
  });
}

function readReferencedTextureAtlases(meshPath: string): string[] {
  const meshContents = fs.readFileSync(meshPath, "utf8");
  const atlasFileNames = meshContents
    .split(/\r?\n/)
    .map((line) => line.match(/^comment\s+TextureFile\s+(.+)$/u)?.[1]?.trim() ?? "")
    .filter((fileName) => fileName.length > 0);

  return [...new Set(atlasFileNames)];
}

async function runBlenderCli(
  blenderBin: string,
  input: {
    meshPath: string;
    texturedFolder: string;
    outputGlbPath: string;
  }
): Promise<void> {
  const scriptPath = path.join(config.BACKEND_ROOT, "scripts", "convert_textured_ply_to_glb.py");
  requireExistingFile(scriptPath, "GLB conversion Blender script");

  await new Promise<void>((resolve, reject) => {
    const args = [
      "--background",
      "--factory-startup",
      "--python",
      scriptPath,
      "--",
      "--mesh",
      input.meshPath,
      "--textured-folder",
      input.texturedFolder,
      "--output",
      input.outputGlbPath,
    ];

    console.info(`[GLB conversion] Command: ${blenderBin} ${args.join(" ")}`);

    const child = spawn(blenderBin, args, {
      shell: false,
      windowsHide: true,
    });

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`GLB conversion timed out after ${config.GLB_CONVERSION_TIMEOUT_MS}ms`));
    }, config.GLB_CONVERSION_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      const lines = chunk.toString().split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
      for (const line of lines) {
        console.info(`[GLB conversion] ${line}`);
      }
    });

    child.stderr.on("data", (chunk) => {
      const lines = chunk.toString().split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
      for (const line of lines) {
        console.warn(`[GLB conversion] ${line}`);
      }
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start Blender: ${error.message}`));
    });

    child.on("close", (code, signal) => {
      clearTimeout(timeout);

      if (code === 0) {
        resolve();
        return;
      }

      if (signal) {
        reject(new Error(`Blender terminated by signal ${signal}`));
        return;
      }

      reject(new Error(`Blender exited with code ${code}`));
    });
  });
}
