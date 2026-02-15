import axios, { AxiosError, type AxiosInstance } from 'axios';

export type AuthUser = {
  id: string;
  email: string;
  nickname: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type UserInput = {
  email: string;
  password: string;
  nickname?: string;
}

function getErrorMessage(err: unknown): string {
  const ax = err as AxiosError<any>;
  return ax?.response?.data?.error ?? ax?.message ?? 'Request failed';
}

const http: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const AuthApi = {
  async login(input: UserInput): Promise<AuthResponse> {
    try {
      const res = await http.post<AuthResponse>('/auth/login', input);
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async register(input: UserInput): Promise<AuthResponse> {
    try {
      const res = await http.post<AuthResponse>('/auth/register', input);
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async refresh(): Promise<AuthResponse> {
    try {
      const res = await http.post<AuthResponse>('/auth/refresh');
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async logout(): Promise<void> {
    try {
      await http.post('/auth/logout');
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
};