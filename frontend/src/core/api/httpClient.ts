import axios, { AxiosError, type AxiosInstance } from 'axios';
import { runtimeConfig } from '@/core/config/runtime';

export function getErrorMessage(err: unknown): string {
  const ax = err as AxiosError<any>;
  return ax?.response?.data?.error ?? ax?.message ?? 'Request failed';
}

export function getErrorCode(err: unknown): string | undefined {
  const ax = err as AxiosError<any>;
  const code = ax?.response?.data?.code;
  return typeof code === 'string' ? code : undefined;
}

export const http: AxiosInstance = axios.create({
  baseURL: runtimeConfig.apiBaseUrl,
  withCredentials: true,
});
