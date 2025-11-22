import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { config } from '../config/env'

export function runMeshroom(images: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const jobId = crypto.randomBytes(6).toString('hex')
    const outputDir = path.join(config.OUTPUT_DIR, jobId)

    fs.mkdirSync(outputDir, { recursive: true })

    const args = [
      '--input', images.join(','),
      '--output', outputDir
    ]

    console.log('[Meshroom] running with args', args)

    const process = spawn('meshroom_photogrammetry', args)

    process.stdout.on('data', d => console.log('[Meshroom]', d.toString()))
    process.stderr.on('data', d => console.error('[Meshroom ERROR]', d.toString()))

    process.on('close', code => {
      if (code === 0) resolve(outputDir)
      else reject(new Error('Meshroom failed with exit code ' + code))
    })
  })
}
