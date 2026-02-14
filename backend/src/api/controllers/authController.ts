import { Request, Response } from 'express';
import { register } from '../../application/auth/register';
import { config } from '../../config/env';
import { ttlToMs } from "../../utils/timestamp";

export async function registerController(req: Request, res: Response) {
  try {
    const { email, password, nickname } = req.body ?? {};

    const result = await register({
      email,
      password,
      nickname,
      userAgent: req.headers['user-agent'],
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: ttlToMs(config.JWT_REFRESH_TTL),
    });

    return res.status(201).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? 'Register failed' });
  }
}