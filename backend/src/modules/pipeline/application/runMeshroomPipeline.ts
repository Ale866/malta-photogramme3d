import type { PipelineServices } from "./ports";
import type { RunMeshroomHooks } from "./ports";

type RunMeshroomPipelineInput = {
  inputFolder: string;
  outputFolder: string;
};

export async function runMeshroomPipeline(
  services: PipelineServices,
  input: RunMeshroomPipelineInput,
  hooks?: RunMeshroomHooks
) {
  await services.runMeshroom(input.inputFolder, input.outputFolder, hooks);
}
