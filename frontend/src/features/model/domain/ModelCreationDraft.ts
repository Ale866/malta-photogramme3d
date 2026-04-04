type DraftCoordinates = { x: number, y: number, z: number }

export type ImageModelCreationDraft = {
  title: string
  type: 'images'
  files: File[]
  coordinates: DraftCoordinates
}

export type VideoModelCreationDraft = {
  title: string
  type: 'video'
  videoFiles: File[]
  coordinates: DraftCoordinates
}

export type ModelCreationDraft = ImageModelCreationDraft | VideoModelCreationDraft
