export type PipelineStage =
  | "feature_extraction"
  | "feature_matching"
  | "sparse_mapping"
  | "dense_preparation"
  | "dense_stereo"
  | "fusion";

export type PipelineProgressEvent = {
  stage: PipelineStage;
  progress: number;
};

export type RunColmapStageHooks = {
  onProgress?: (event: PipelineProgressEvent) => void;
};

export type PipelineServices = {
  runFeatureExtraction: (inputFolder: string, outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
  runFeatureMatching: (outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
  runSparseMapping: (inputFolder: string, outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
  runDensePreparation: (inputFolder: string, outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
  runDenseStereo: (outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
  runFusion: (outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
};
