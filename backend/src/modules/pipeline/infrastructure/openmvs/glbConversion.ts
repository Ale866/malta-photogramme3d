import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "child_process";
import sharp from "sharp";
import { config } from "../../../../shared/config/env";
import {
  requireExistingDirectory,
  requireExistingFile,
  resolveOutputPaths,
} from "../colmapRunner";
import { readTextureFileComments } from "./texturedMeshHeader";

type GlbVariantProfile = {
  label: "desktop" | "mobile";
  outputFileName: "model.glb" | "model.mobile.glb";
  maxTextureSize: number;
  jpegQuality: number;
};

const GLB_VARIANT_PROFILES: readonly GlbVariantProfile[] = [
  {
    label: "desktop",
    outputFileName: "model.glb",
    maxTextureSize: 4096,
    jpegQuality: 88,
  },
  {
    label: "mobile",
    outputFileName: "model.mobile.glb",
    maxTextureSize: 2048,
    jpegQuality: 82,
  },
];

export async function runGlbConversion(outputFolder: string): Promise<void> {
  const blenderBin = config.BLENDER_BIN?.trim();
  if (!blenderBin) {
    console.warn("[GLB conversion] BLENDER_BIN is not configured; skipping GLB conversion and keeping fallback artifacts");
    return;
  }

  try {
    await runBlenderConversion(blenderBin, outputFolder);
  } catch (error) {
    console.warn("[GLB conversion] Failed to generate GLB variants; keeping textured PLY fallback artifacts", error);
  }
}

async function runBlenderConversion(blenderBin: string, outputFolder: string): Promise<void> {
  const outputPaths = resolveOutputPaths(outputFolder);
  const texturedFolder = requireExistingDirectory(outputPaths.denseTextured);
  const meshPath = requireExistingFile(path.join(texturedFolder, "mesh.ply"), "Published textured mesh");
  const atlasFileNames = readTextureFileComments(meshPath);
  const tempRoot = path.join(texturedFolder, ".glb-conversion-atlases");

  if (atlasFileNames.length === 0) {
    throw new Error(`No TextureFile comments found in ${meshPath}`);
  }

  for (const atlasFileName of atlasFileNames) {
    requireExistingFile(path.join(texturedFolder, atlasFileName), `Published textured atlas ${atlasFileName}`);
  }

  await fs.rm(tempRoot, { recursive: true, force: true });

  try {
    for (const profile of GLB_VARIANT_PROFILES) {
      const outputGlbPath = path.join(texturedFolder, profile.outputFileName);
      const overrideTexturePaths = await writeAtlasOverrides(texturedFolder, atlasFileNames, tempRoot, profile);

      console.info(
        `[GLB conversion] Converting ${path.basename(meshPath)} into ${outputGlbPath} using ${profile.label} texture profile (${profile.maxTextureSize}px, q=${profile.jpegQuality})`
      );

      try {
        await fs.rm(outputGlbPath, { force: true });
        await runBlenderCli(blenderBin, meshPath, outputGlbPath, overrideTexturePaths);
        requireExistingFile(outputGlbPath, `Converted ${profile.label} GLB model`);
      } catch (error) {
        await fs.rm(outputGlbPath, { force: true });
        if (profile.label === "desktop") {
          throw error;
        }

        console.warn(`[GLB conversion] Failed to generate ${profile.outputFileName}; desktop GLB will remain available`, error);
      }
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function writeAtlasOverrides(
  texturedFolder: string,
  atlasFileNames: string[],
  tempRoot: string,
  profile: GlbVariantProfile,
) {
  const variantTempDir = path.join(tempRoot, profile.label);
  await fs.mkdir(variantTempDir, { recursive: true });

  return Promise.all(
    atlasFileNames.map(async (atlasFileName, index) => {
      const sourceAtlasPath = path.join(texturedFolder, atlasFileName);
      const targetAtlasPath = path.join(
        variantTempDir,
        `${String(index).padStart(2, "0")}-${path.parse(atlasFileName).name}.jpg`,
      );

      await sharp(sourceAtlasPath)
        .resize({
          width: profile.maxTextureSize,
          height: profile.maxTextureSize,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({
          quality: profile.jpegQuality,
          mozjpeg: true,
        })
        .toFile(targetAtlasPath);

      return targetAtlasPath;
    }),
  );
}

async function runBlenderCli(
  blenderBin: string,
  meshPath: string,
  outputGlbPath: string,
  overrideTexturePaths: string[],
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
      meshPath,
      outputGlbPath,
      ...overrideTexturePaths,
    ];

    console.info(`[GLB conversion] Command: ${blenderBin} ${args.join(" ")}`);

    const child = spawn(blenderBin, args, {
      shell: false,
      windowsHide: true,
      env: process.env,
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
