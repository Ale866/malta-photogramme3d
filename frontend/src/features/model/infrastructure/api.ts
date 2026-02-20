import { useAuth } from '@/features/auth/application/useAuth';
import { getErrorMessage, http } from '@/core/api/httpClient';

export type UploadInput = {
  title: string;
  files: File[];
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
const token = auth.getAccessToken();

export const ModelApi = {
  async upload(input: UploadInput): Promise<UploadResponse> {
    try {
      if (!token) throw new Error('Not authenticated (missing access token)');

      const formData = new FormData();
      formData.append('title', input.title);
      input.files.forEach((f) => formData.append('files', f));

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
      if (!token) throw new Error('Not authenticated (missing access token)');

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