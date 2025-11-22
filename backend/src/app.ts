import express from 'express'
import uploadRoutes from './api/routes/model'

export function createApp() {
  const app = express()

  app.use(express.json())

  app.use('/upload', uploadRoutes)

  return app
}
