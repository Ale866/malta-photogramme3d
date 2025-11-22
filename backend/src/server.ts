import { createApp } from './app'
import { config } from './config/env'

const app = createApp()

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`)
})
