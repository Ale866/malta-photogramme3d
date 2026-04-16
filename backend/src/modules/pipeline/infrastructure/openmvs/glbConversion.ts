import path from "path";
import { spawn } from "child_process";
import { config } from "../../../../shared/config/env";
import {
  requireExistingDirectory,
  requireExistingFile,
  resolveOutputPaths,
} from "../colmapRunner";
import { readTextureFileComments } from "./texturedMeshHeader";

export async function runGlbConversion(outputFolder: string): Promise<void> {
  const blenderBin = config.BLENDER_BIN?.trim();
  if (!blenderBin) {
    console.warn("[GLB conversion] BLENDER_BIN is not configured; skipping GLB conversion and keeping fallback artifacts");
    return;
  }

  try {
    await runBlenderConversion(blenderBin, outputFolder);
  } catch (error) {
    console.warn("[GLB conversion] Failed to generate model.glb; keeping textured PLY fallback artifacts", error);
  }
}

async function runBlenderConversion(blenderBin: string, outputFolder: string): Promise<void> {
  const outputPaths = resolveOutputPaths(outputFolder);
  const texturedFolder = requireExistingDirectory(outputPaths.denseTextured);
  const meshPath = requireExistingFile(path.join(texturedFolder, "mesh.ply"), "Published textured mesh");
  const atlasFileNames = readTextureFileComments(meshPath);
  const outputGlbPath = path.join(texturedFolder, "model.glb");

  if (atlasFileNames.length === 0) {
    throw new Error(`No TextureFile comments found in ${meshPath}`);
  }

  for (const atlasFileName of atlasFileNames) {
    requireExistingFile(path.join(texturedFolder, atlasFileName), `Published textured atlas ${atlasFileName}`);
  }

  console.info(
    `[GLB conversion] Converting ${path.basename(meshPath)} with ${atlasFileNames.length} atlas file(s) into ${outputGlbPath}`
  );

  await runBlenderCli(blenderBin, meshPath, outputGlbPath);
  requireExistingFile(outputGlbPath, "Converted GLB model");
}

async function runBlenderCli(blenderBin: string, meshPath: string, outputGlbPath: string): Promise<void> {
  const scriptPath = path.join(config.BACKEND_ROOT, "scripts", "convert_textured_ply_to_glb.py");
  requireExistingFile(scriptPath, "GLB conversion Blender script");

  await new Promise<void>((resolve, reject) => {
    const args = [
      "--background",
      "--factory-startup",
      "--python",
      scriptPath,
      "--",
      meshPath,
      outputGlbPath,
    ];

    console.info(`[GLB conversion] Command: ${blenderBin} ${args.join(" ")}`);

    const child = spawn(blenderBin, args, {
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
      },
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
