import { getErrorMessage, http } from '@/core/api/httpClient';
import { requireAccessToken } from '@/features/auth/application/useAuth';
import type { ModelJobSnapshot } from '@/features/model/domain/ModelJob';
import type { ModelLibrary, IncompleteModelJobSummary } from '@/features/model/domain/ModelLibrary';
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
  status: IncompleteModelJobSummary['status'];
  stage: string;
  progress: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

type ModelLibraryDto = {
  models: ModelDto[];
  modelJobs: ModelJobDto[];
};

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

function toIncompleteModelJobSummary(dto: ModelJobDto): IncompleteModelJobSummary {
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

export const ModelApi = {
  async upload(input: ModelCreationDraft): Promise<UploadResponse> {
    try {
      const token = await requireAccessToken();

      const formData = new FormData();
      formData.append('title', input.title);
      input.files.forEach((f) => formData.append('files', f));
      if (input.coordinates) {
        formData.append('coordinates', JSON.stringify(input.coordinates));
      }

      const res = await http.post<UploadResponse>('/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async getModelLibrary(): Promise<ModelLibrary> {
    try {
      const token = await requireAccessToken();

      const res = await http.get<ModelLibraryDto>('/model/list', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      return {
        models: res.data.models.map(toModelSummary),
        modelJobs: res.data.modelJobs.map(toIncompleteModelJobSummary),
      };
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async getModelJobStatus(jobId: string): Promise<ModelJobSnapshot> {
    try {
      const token = await requireAccessToken();
      const normalizedJobId = jobId.trim();
      if (!normalizedJobId) throw new Error('Job ID is required');

      const res = await http.get<ModelJobSnapshot>(`/model-jobs/${normalizedJobId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
};
