import type { ModelRepository } from '../domain/modelRepository';
import type { ModelJobRepository } from '../../model-jobs/domain/modelJobRepository';
import type { UserRepository } from '../../auth/domain/userRepository';

export type ModelsServices = {
  models: ModelRepository;
  users: UserRepository;
};

export type UserModelServices = {
  models: ModelRepository;
  modelJobs: ModelJobRepository;
  users: UserRepository;
};

export type ModelAssetDelivery = {
  path: string;
  contentType: string;
  contentEncoding?: "br" | "gzip";
  varyHeader?: "Accept" | "Accept-Encoding";
};

export type ModelAssetStorage = {
  resolveMeshDelivery(
    outputFolder: string,
    acceptEncodingHeader: string | string[] | undefined,
  ): Promise<ModelAssetDelivery | null>;
  resolveTextureDelivery(
    outputFolder: string,
    acceptHeader: string | string[] | undefined,
  ): Promise<ModelAssetDelivery | null>;
};

export type ModelAssetServices = {
  models: ModelRepository;
  assets: ModelAssetStorage;
};

export type ModelLibraryServices = {
  models: ModelRepository;
  modelJobs: ModelJobRepository;
  users: UserRepository;
};

export type ModelDeletionServices = {
  models: ModelRepository;
  modelJobs: ModelJobRepository;
  deleteDirectory: (directoryPath: string) => void;
};

export type ModelRerunServices = {
  models: ModelRepository;
  modelJobs: ModelJobRepository;
  deleteDirectory: (directoryPath: string) => void;
};

export type ModelOrientationUpdateServices = {
  models: ModelRepository;
};
