import type { ModelJobSnapshot } from "./ModelJob";

export type ModelJobDetails = ModelJobSnapshot & {
  title: string;
  hasBeenRerun: boolean;
  coordinates: { x: number; y: number; z: number } | null;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
};
