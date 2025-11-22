import { Request, Response } from 'express'
import { runPipelineService } from '../../services/pipelineService'

export async function handleImageUpload(req: Request, res: Response) {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' })
    }

    const imagePaths = req.files.map(f => f.path)

    const result = await runPipelineService(imagePaths)

    return res.json({
      message: 'Pipeline executed successfully',
      output: result.outputDir
    })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: 'Pipeline failed', details: err.message })
  }
}
