export type LocalPoint = {
  x: number
  y: number
  z: number
}

export type ScreenPoint = {
  x: number
  y: number
  visible: boolean
}

export interface ViewportProjectionPort {
  projectPoint(local: LocalPoint, out?: ScreenPoint): ScreenPoint
  onViewportChange(handler: () => void): () => void
}
