import type { ModelJobServices } from '../application/ports';
import { modelJobRepo } from './modelJobRepo';

export const modelJobServices: ModelJobServices = {
  modelJobs: modelJobRepo,
};