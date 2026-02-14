import { Request, Response } from 'express';
import { register } from '../../application/auth/register';
import { authServices } from '../auth/authServices';
import { setRefreshCookie, clearRefreshCookie } from '../auth/refreshCookie';

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
    return res.status(400).json({ error: e?.message ?? 'Register failed' });
  }
}