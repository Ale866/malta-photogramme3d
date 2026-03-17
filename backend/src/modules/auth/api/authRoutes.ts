import { Router } from 'express';
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
  forgotPasswordController,
  validateResetPasswordTokenController,
  resetPasswordController,
} from './authController';

const router = Router();

router.post('/register', registerController);
router.post('/login', loginController);
router.post('/refresh', refreshController);
router.post('/logout', logoutController);
router.post('/forgot-password', forgotPasswordController);
router.get('/reset-password/validate', validateResetPasswordTokenController);
router.post('/reset-password', resetPasswordController);

export default router;
