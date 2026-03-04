import { getErrorMessage, http } from '@/core/api/httpClient';
import { requireAccessToken } from '@/features/auth/application/useAuth';
import type { ModelCoordinates } from '@/features/model/domain/ModelCreationDraft';
import type { ModelJobSnapshot } from '@/features/model/domain/ModelJob';
import type { ModelSummary } from '@/features/model/domain/ModelSummary';

export type UploadInput = {
  title: string;
  files: File[];
  coordinates?: ModelCoordinates | null;
};

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
  coordinates?: ModelCoordinates | null;
  modelJob?: ModelJobSnapshot | null;
};

function toModelSummary(dto: ModelDto): ModelSummary {
  return {
    id: dto.id,
    ownerId: dto.ownerId,
    title: dto.title,
    sourceJobId: dto.sourceJobId ?? null,
    outputFolder: dto.outputFolder,
    createdAt: dto.createdAt,
    coordinates: dto.coordinates ?? null,
    modelJob: dto.modelJob ?? null,
  };
}

export const ModelApi = {
  async upload(input: UploadInput): Promise<UploadResponse> {
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

  async getModels(): Promise<ModelSummary[]> {
    try {
      const token = await requireAccessToken();

      const res = await http.get<ModelDto[]>('/model/list', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      return res.data.map(toModelSummary);
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
