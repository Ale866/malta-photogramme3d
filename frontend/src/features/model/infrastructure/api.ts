import { useAuth } from '@/features/auth/application/useAuth';
import { getErrorMessage, http } from '@/core/api/httpClient';
import type { ModelCoordinates } from '@/features/model/domain/ModelCreationDraft';

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

export type Model = {
  ownerId: string;
  title: string;
  sourceJobId: string;
  outputFolder: string;
  createdAt: string;
}

const auth = useAuth();

async function requireAccessToken() {
  let token = auth.getAccessToken();
  if (token) return token;

  await auth.hydrateSession();
  token = auth.getAccessToken();

  if (!token) throw new Error('Not authenticated (missing access token)');
  return token;
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

  async getModels(): Promise<Model[]> {
    try {
      const token = await requireAccessToken();

      const res = await http.get('/model/list', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      })

      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  }
};
