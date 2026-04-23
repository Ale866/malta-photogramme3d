export function isConservativeGraphicsDevice() {
  if (typeof window === 'undefined') return false

  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const lowMemory = typeof deviceMemory === 'number' && deviceMemory <= 4

  return coarsePointer || lowMemory
}

export function getPreferredGraphicsPixelRatio() {
  if (typeof window === 'undefined') return 1

  const devicePixelRatio = window.devicePixelRatio || 1
  return Math.min(devicePixelRatio, isConservativeGraphicsDevice() ? 1 : 2)
}
