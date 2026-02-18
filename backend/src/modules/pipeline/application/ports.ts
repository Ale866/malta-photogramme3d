export type PipelineServices = {
  runMeshroom: (inputFolder: string, outputFolder: string) => Promise<void>;
};
