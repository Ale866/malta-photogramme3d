import { getErrorMessage, http } from '@/core/api/httpClient';
import type { ModelJobDetails } from '@/features/model/domain/ModelJobDetails';
import type { ModelJobSnapshot } from '@/features/model/domain/ModelJob';
import type { ModelLibrary, NonCompletedModelJobSummary } from '@/features/model/domain/ModelLibrary';
import type { ModelSummary, ModelVoteState } from '@/features/model/domain/ModelSummary';

export type UploadResponse = {
  success: boolean;
  message: string;
  jobId: string;
};

export type ModelRerunResponse = {
  success: boolean;
  message: string;
  jobId: string;
};

export type UploadProgressSnapshot = {
  totalFiles: number;
  uploadedFiles: number;
  activeBatches: number;
  progressPercent: number;
  type: 'images' | 'video';
};

type UploadInitResponse = {
  success: boolean;
  message: string;
  uploadId: string;
  totalFiles: number;
};

type UploadBatchResponse = {
  success: boolean;
  message: string;
  uploadedFiles: number;
  totalFiles: number;
};

type UploadHooks = {
  onProgress?: (snapshot: UploadProgressSnapshot) => void;
};

type UploadInput = {
  title: string;
  type: 'images' | 'video';
  coordinates: { x: number, y: number, z: number };
  files?: File[];
  videoFiles?: File[];
};

type VideoUploadChunk = {
  file: File;
  videoIndex: number;
  chunkIndex: number;
  totalChunks: number;
  originalName: string;
};

type ModelDto = {
  id: string;
  ownerId: string;
  ownerNickname: string;
  title: string;
  sourceJobId: string | null;
  outputFolder: string;
  createdAt: string;
  coordinates: { x: number, y: number, z: number };
  voteCount: number;
  hasVoted: boolean;
  hasBeenRerun?: boolean;
};

type ModelJobDto = {
  id: string;
  title: string;
  status: NonCompletedModelJobSummary['status'];
  stage: string;
  progress: number;
  error: string | null;
  coordinates: { x: number, y: number, z: number } | null;
  createdAt: string;
  updatedAt: string;
};

type ModelJobDetailsDto = {
  jobId: string;
  title: string;
  status: ModelJobSnapshot['status'];
  stage: string;
  progress: number;
  error: string | null;
  modelId: string | null;
  hasBeenRerun?: boolean;
  coordinates: { x: number, y: number, z: number } | null;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type ModelLibraryDto = {
  models: ModelDto[];
  modelJobs: ModelJobDto[];
};

type PublicModelCatalogDto = ModelDto[];
type ModelVoteStateDto = {
  message: string;
  modelId: string;
  voteCount: number;
  hasVoted: boolean;
};

const UPLOAD_BATCH_SIZE = 5;
const MAX_CONCURRENT_UPLOADS = 3;
const MAX_BATCH_ATTEMPTS = 2;
const VIDEO_CHUNK_SIZE_BYTES = 5 * 1024 * 1024;

function toModelSummary(dto: ModelDto): ModelSummary {
  return {
    id: dto.id,
    ownerId: dto.ownerId,
    ownerNickname: dto.ownerNickname,
    title: dto.title,
    sourceJobId: dto.sourceJobId ?? null,
    outputFolder: dto.outputFolder,
    meshAssetUrl: `/model/${dto.id}/mesh`,
    textureAssetUrl: `/model/${dto.id}/texture`,
    createdAt: dto.createdAt,
    coordinates: dto.coordinates,
    voteCount: dto.voteCount,
    hasVoted: dto.hasVoted,
    hasBeenRerun: dto.hasBeenRerun ?? false,
    modelJob: null,
  };
}

function toNonCompletedModelJobSummary(dto: ModelJobDto): NonCompletedModelJobSummary {
  return {
    id: dto.id,
    title: dto.title,
    status: dto.status,
    stage: dto.stage,
    progress: dto.progress,
    error: dto.error,
    coordinates: dto.coordinates,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

function toModelVoteState(dto: ModelVoteStateDto): ModelVoteState {
  return {
    modelId: dto.modelId,
    voteCount: dto.voteCount,
    hasVoted: dto.hasVoted,
  };
}

function toModelJobDetails(dto: ModelJobDetailsDto): ModelJobDetails {
  return {
    jobId: dto.jobId,
    title: dto.title,
    status: dto.status,
    stage: dto.stage,
    progress: dto.progress,
    error: dto.error ?? undefined,
    modelId: dto.modelId ?? undefined,
    hasBeenRerun: dto.hasBeenRerun ?? false,
    coordinates: dto.coordinates,
    imageCount: dto.imageCount,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    startedAt: dto.startedAt ?? undefined,
    finishedAt: dto.finishedAt ?? undefined,
  };
}

export const ModelApi = {
  async upload(input: UploadInput, accessToken: string, hooks?: UploadHooks): Promise<UploadResponse> {
    try {
      const imageFiles = input.files ?? [];
      const videoChunks = splitVideosIntoChunks(input.videoFiles ?? [], VIDEO_CHUNK_SIZE_BYTES);
      const uploadItems = input.type === 'video'
        ? videoChunks
        : imageFiles;

      const initRes = await http.post<UploadInitResponse>('/upload/init', {
        title: input.title,
        coordinates: input.coordinates,
        totalFiles: uploadItems.length,
        type: input.type,
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const uploadId = initRes.data.uploadId;
      const batches: Array<Array<File | VideoUploadChunk>> = input.type === 'video'
        ? videoChunks.map((chunk) => [chunk])
        : splitIntoBatches(imageFiles, UPLOAD_BATCH_SIZE);
      const uploadConcurrency = input.type === 'video' ? 1 : MAX_CONCURRENT_UPLOADS;
      const batchProgress = new Map<number, number>();
      let uploadedFiles = 0;
      let activeBatches = 0;

      const emitProgress = () => {
        const partialFiles = batches.reduce((sum, batch, index) => {
          return sum + batch.length * (batchProgress.get(index) ?? 0);
        }, 0);

        const progressPercent = uploadItems.length === 0
          ? 0
          : Math.min(100, Math.round(((uploadedFiles + partialFiles) / uploadItems.length) * 100));

        hooks?.onProgress?.({
          totalFiles: uploadItems.length,
          uploadedFiles,
          activeBatches,
          progressPercent,
          type: input.type,
        });
      };

      emitProgress();

      await runWithConcurrency(batches, uploadConcurrency, async (files, batchIndex) => {
        let attempt = 0;

        while (attempt < MAX_BATCH_ATTEMPTS) {
          attempt += 1;
          activeBatches += 1;
          batchProgress.set(batchIndex, 0);
          emitProgress();

          try {
            const formData = new FormData();
            formData.append('batchIndex', String(batchIndex));
            if (input.type === 'video') {
              const chunk = files[0] as VideoUploadChunk | undefined;
              if (!chunk) {
                throw new Error('Video chunk is missing');
              }

              formData.append('videoIndex', String(chunk.videoIndex));
              formData.append('chunkIndex', String(chunk.chunkIndex));
              formData.append('totalChunks', String(chunk.totalChunks));
              formData.append('originalName', chunk.originalName);
              formData.append('files', chunk.file, chunk.file.name);
            } else {
              (files as File[]).forEach((file) => formData.append('files', file, file.name));
            }

            const res = await http.post<UploadBatchResponse>(`/upload/${uploadId}/batches`, formData, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              onUploadProgress: (event) => {
                if (!event.total) return;
                batchProgress.set(batchIndex, event.loaded / event.total);
                emitProgress();
              },
            });

            batchProgress.delete(batchIndex);
            activeBatches -= 1;
            uploadedFiles = Math.max(uploadedFiles, res.data.uploadedFiles);
            emitProgress();
            return;
          } catch (err) {
            batchProgress.delete(batchIndex);
            activeBatches -= 1;
            emitProgress();

            if (attempt >= MAX_BATCH_ATTEMPTS) {
              throw new Error(`Batch ${batchIndex + 1} failed: ${getErrorMessage(err)}`);
            }
          }
        }
      });

      const res = await http.post<UploadResponse>(`/upload/${uploadId}/finalize`, undefined, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      uploadedFiles = uploadItems.length;
      emitProgress();

      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async getModelLibrary(accessToken: string): Promise<ModelLibrary> {
    try {
      const res = await http.get<ModelLibraryDto>('/model/list', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        }
      });

      return {
        models: res.data.models.map(toModelSummary),
        modelJobs: res.data.modelJobs.map(toNonCompletedModelJobSummary),
      };
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async getPublicModelCatalog(accessToken?: string | null): Promise<ModelLibrary> {
    try {
      const res = await http.get<PublicModelCatalogDto>('/model/catalog', {
        headers: accessToken ? {
          Authorization: `Bearer ${accessToken}`,
        } : undefined,
      });

      return {
        models: res.data.map(toModelSummary),
        modelJobs: [],
      };
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async getPublicModelById(modelId: string, accessToken?: string | null): Promise<ModelSummary> {
    try {
      const res = await http.get<ModelDto>(`/model/catalog/${modelId}`, {
        headers: accessToken ? {
          Authorization: `Bearer ${accessToken}`,
        } : undefined,
      });

      return toModelSummary(res.data);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async getUserModelById(modelId: string, accessToken: string): Promise<ModelSummary> {
    try {
      const res = await http.get<ModelDto>(`/model/list/${modelId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return toModelSummary(res.data);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async getIslandModelCatalog(accessToken?: string | null): Promise<ModelLibrary> {
    try {
      const res = await http.get<PublicModelCatalogDto>('/model/island', {
        headers: accessToken ? {
          Authorization: `Bearer ${accessToken}`,
        } : undefined,
      });

      return {
        models: res.data.map(toModelSummary),
        modelJobs: [],
      };
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async getModelJobStatus(jobId: string, accessToken: string): Promise<ModelJobSnapshot> {
    try {
      const normalizedJobId = jobId.trim();
      if (!normalizedJobId) throw new Error('Job ID is required');

      const res = await http.get<ModelJobSnapshot>(`/model-jobs/${normalizedJobId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async getModelJobDetails(jobId: string, accessToken: string): Promise<ModelJobDetails> {
    try {
      const normalizedJobId = jobId.trim();
      if (!normalizedJobId) throw new Error('Job ID is required');

      const res = await http.get<ModelJobDetailsDto>(`/model-jobs/${normalizedJobId}/details`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return toModelJobDetails(res.data);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async deleteModel(modelId: string, accessToken: string): Promise<void> {
    try {
      await http.delete(`/model/list/${modelId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async deleteFailedModelJob(jobId: string, accessToken: string): Promise<void> {
    try {
      await http.delete(`/model-jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async rerunFailedModelJob(jobId: string, accessToken: string): Promise<void> {
    try {
      await http.post(`/model-jobs/${jobId}/rerun`, undefined, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async rerunCompletedModel(modelId: string, accessToken: string): Promise<ModelRerunResponse> {
    try {
      const res = await http.post<ModelRerunResponse>(`/model/list/${modelId}/rerun`, undefined, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async voteForModel(modelId: string, accessToken: string): Promise<ModelVoteState> {
    try {
      const res = await http.post<ModelVoteStateDto>(`/model/${modelId}/vote`, undefined, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        }
      })

      return toModelVoteState(res.data);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async unvoteForModel(modelId: string, accessToken: string): Promise<ModelVoteState> {
    try {
      const res = await http.delete<ModelVoteStateDto>(`/model/${modelId}/vote`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        }
      })

      return toModelVoteState(res.data);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  }
};

function splitIntoBatches(files: File[], size: number): File[][] {
  const batches: File[][] = [];

  for (let index = 0; index < files.length; index += size) {
    batches.push(files.slice(index, index + size));
  }

  return batches;
}

function splitVideosIntoChunks(videoFiles: File[], chunkSize: number): VideoUploadChunk[] {
  const chunks: VideoUploadChunk[] = [];

  videoFiles.forEach((file, videoIndex) => {
    const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end, file.type || 'application/octet-stream');
      chunks.push({
        file: new File([chunk], file.name, { type: file.type || 'application/octet-stream' }),
        videoIndex,
        chunkIndex,
        totalChunks,
        originalName: file.name,
      });
    }
  });

  return chunks;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
) {
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const item = items[currentIndex];
      if (item === undefined) return;
      await worker(item, currentIndex);
    }
  }

  const poolSize = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: poolSize }, () => runWorker()));
}
