import type { ModelJobSnapshot } from "./ModelJob";

export type ModelJobDetails = ModelJobSnapshot & {
  title: string;
  coordinates: { x: number; y: number; z: number } | null;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
};
