import { spawn } from "child_process";

export function runMeshroom(input: string, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const meshroom = spawn(
      "C:\\Users\\Alessandro\\Documents\\UNI\\FYP\\Meshroom-2025.1.0\\meshroom_batch.exe",
      [
        "--input", input,
        "--output", output,
        "--pipeline", "c:\\Users\\Alessandro\\Documents\\UNI\\FYP\\Meshroom-2025.1.0\\aliceVision\\share\\meshroom\\photogrammetryDraft.mg"
      ],
      { shell: true }
    );

    meshroom.stdout.on("data", d =>
      console.log("[Meshroom]", d.toString())
    );

    meshroom.stderr.on("data", d =>
      console.error("[Meshroom ERROR]", d.toString())
    );

    meshroom.on("error", reject);

    meshroom.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`Meshroom exit code ${code}`));
    });
  });
}
