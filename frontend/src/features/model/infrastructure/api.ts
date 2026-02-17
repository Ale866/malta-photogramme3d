import axios, { AxiosError, type AxiosInstance } from 'axios';
import { useAuth } from '@/features/auth/application/useAuth';

export type UploadInput = {
  title: string;
  files: File[];
};

export type UploadResponse = {
  success: boolean;
  message: string;
  jobId: string;
};

function getErrorMessage(err: unknown): string {
  const ax = err as AxiosError<any>;
  return ax?.response?.data?.error ?? ax?.message ?? 'Request failed';
}

const http: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
});

export const ModelApi = {
  async upload(input: UploadInput): Promise<UploadResponse> {
    try {
      const auth = useAuth();
      const token = auth.getAccessToken();

      if (!token) {
        throw new Error('Not authenticated (missing access token)');
      }

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
};