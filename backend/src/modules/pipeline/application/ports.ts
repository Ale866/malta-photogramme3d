export type PipelineStage = "starting" | "sfm" | "mvs" | "mesh_or_splat" | "packaging";

export type PipelineProgressEvent = {
  stage: PipelineStage;
  progress: number;
  line?: string;
};

export type RunMeshroomHooks = {
  onProgress?: (event: PipelineProgressEvent) => void;
};

export type PipelineServices = {
  runMeshroom: (inputFolder: string, outputFolder: string, hooks?: RunMeshroomHooks) => Promise<void>;
};
