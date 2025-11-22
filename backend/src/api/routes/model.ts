import express from 'express'
import multer from 'multer'
import { handleImageUpload } from '../controllers/modelController'
import { config } from '../../config/env'

const router = express.Router()

const upload = multer({ dest: config.UPLOAD_TMP })

router.post('/images', upload.array('images'), handleImageUpload)

export default router
