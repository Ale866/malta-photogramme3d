import { getErrorMessage, http } from '@/core/api/httpClient';
import type { ModelJobDetails } from '@/features/model/domain/ModelJobDetails';
import type { ModelJobSnapshot } from '@/features/model/domain/ModelJob';
import type { ModelLibrary, NonCompletedModelJobSummary } from '@/features/model/domain/ModelLibrary';
import type { ModelSummary } from '@/features/model/domain/ModelSummary';
import type { ModelCreationDraft } from '../domain/ModelCreationDraft';

export type UploadResponse = {
  success: boolean;
  message: string;
  jobId: string;
};

type ModelDto = {
  id: string;
  ownerId: string;
  title: string;
  sourceJobId: string | null;
  outputFolder: string;
  createdAt: string;
  coordinates: { x: number, y: number, z: number };
};

type ModelJobDto = {
  id: string;
  title: string;
  status: NonCompletedModelJobSummary['status'];
  stage: string;
  progress: number;
  error: string | null;
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

function toModelSummary(dto: ModelDto): ModelSummary {
  return {
    id: dto.id,
    ownerId: dto.ownerId,
    title: dto.title,
    sourceJobId: dto.sourceJobId ?? null,
    outputFolder: dto.outputFolder,
    createdAt: dto.createdAt,
    coordinates: dto.coordinates,
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
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
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
    coordinates: dto.coordinates,
    imageCount: dto.imageCount,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    startedAt: dto.startedAt ?? undefined,
    finishedAt: dto.finishedAt ?? undefined,
  };
}

export const ModelApi = {
  async upload(input: ModelCreationDraft, accessToken: string): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('title', input.title);
      input.files.forEach((f) => formData.append('files', f));
      if (input.coordinates) {
        formData.append('coordinates', JSON.stringify(input.coordinates));
      }

      const res = await http.post<UploadResponse>('/upload', formData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

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

  async getPublicModelCatalog(): Promise<ModelLibrary> {
    try {
      const res = await http.get<PublicModelCatalogDto>('/model/catalog');

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
};
