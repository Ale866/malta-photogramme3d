import { runMeshroom } from '../infrastructure/meshroomRunner'
import { config } from '../config/env'

export async function runPipelineService(imagePaths: string[]) {
  const outputDir = await runMeshroom(imagePaths)
  return { outputDir }
}
