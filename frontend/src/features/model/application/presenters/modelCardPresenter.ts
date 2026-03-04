import { getModelLifecycleStatus } from '@/features/model/domain/ModelSummary';
import type { ModelSummary } from '@/features/model/domain/ModelSummary';

export type ModelCardViewModel = {
  id: string;
  title: string;
  modelPlaceholderLabel: string;
  coordinatesOrLocationLabel: string;
  dateLabel: string;
  statusLabel: string;
  statusTone: 'ready' | 'pending' | 'failed';
  pendingHint: string | null;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return dateFormatter.format(date);
}

function formatCoordinatesOrLocation(model: ModelSummary): string {
  if (!model.coordinates) return 'Location not available yet';

  const { easting, northing } = model.coordinates.utm;
  return `E ${easting.toFixed(2)}, N ${northing.toFixed(2)}`;
}

export function toModelCardViewModel(model: ModelSummary): ModelCardViewModel {
  const lifecycle = getModelLifecycleStatus(model);

  return {
    id: model.id,
    title: model.title,
    modelPlaceholderLabel: '3D preview placeholder',
    coordinatesOrLocationLabel: formatCoordinatesOrLocation(model),
    dateLabel: formatDate(model.createdAt),
    statusLabel: lifecycle === 'pending' ? 'Processing' : lifecycle === 'failed' ? 'Failed' : 'Ready',
    statusTone: lifecycle,
    pendingHint: lifecycle === 'pending' ? `Pipeline stage: ${model.modelJob?.stage ?? 'in progress'}` : null,
  };
}

export function toModelCardViewModels(models: readonly ModelSummary[]): ModelCardViewModel[] {
  return models.map(toModelCardViewModel);
}
