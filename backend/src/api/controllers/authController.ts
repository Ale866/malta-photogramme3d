import { Request, Response } from 'express';
import { register } from '../../application/auth/register';
import { login } from '../../application/auth/login';
import { authServices } from '../auth/authServices';
import { setRefreshCookie } from '../auth/refreshCookie';

export async function registerController(req: Request, res: Response) {
  try {
    const { email, password, nickname } = req.body ?? {};

    const result = await register(authServices, {
      email,
      password,
      nickname,
      userAgent: req.headers['user-agent'],
    });

    setRefreshCookie(res, result.refreshToken);

    return res.status(201).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Register failed' });
  }
}

export async function loginController(req: Request, res: Response) {
  try {
    const { email, password } = req.body ?? {};

    const result = await login(authServices, {
      email,
      password,
      userAgent: req.headers['user-agent'],
    });

    setRefreshCookie(res, result.refreshToken);

    return res.status(201).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Login failed' });
  }
}