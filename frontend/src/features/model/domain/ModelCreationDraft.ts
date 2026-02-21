import type { MappedCoordinates } from '@/core/domain/Coordinates'

export type ModelCoordinates = MappedCoordinates

export type ModelCreationDraft = {
  title: string
  files: File[]
  coordinates: ModelCoordinates | null
}
