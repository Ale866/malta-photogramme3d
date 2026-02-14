import { Router } from 'express';
import { registerController } from '../controllers/authController';

const router = Router();

router.post('/register', registerController);

export default router;