import axios, { AxiosError, type AxiosInstance } from 'axios';

export function getErrorMessage(err: unknown): string {
  const ax = err as AxiosError<any>;
  return ax?.response?.data?.error ?? ax?.message ?? 'Request failed';
}

export const http: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
});