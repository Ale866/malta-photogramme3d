import type { PipelineServices } from "./ports";

type RunMeshroomPipelineInput = {
  inputFolder: string;
  outputFolder: string;
};

export async function runMeshroomPipeline(services: PipelineServices, input: RunMeshroomPipelineInput) {
  await services.runMeshroom(input.inputFolder, input.outputFolder);
}
