import { Request, Response } from 'express';
import { register } from '../../application/auth/register';
import { login } from '../../application/auth/login';
import { authServices } from '../auth/authServices';
import { clearRefreshCookie, setRefreshCookie, getRefreshCookieName } from '../auth/refreshCookie';
import { refresh } from '../../application/auth/refresh';
import { logout } from '../../application/auth/logout';

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

export async function refreshController(req: Request, res: Response) {
  try {
    const cookieName = getRefreshCookieName();
    const refreshToken = req.cookies?.[cookieName];

    if (!refreshToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await refresh(authServices, {
      refreshToken,
      userAgent: req.headers['user-agent'],
    });

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (e: any) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: e?.message ?? 'Refresh failed' });
  }
}

export async function logoutController(req: Request, res: Response) {
  try {
    const cookieName = getRefreshCookieName();
    const refreshToken = req.cookies?.[cookieName];

    if (refreshToken) await logout(authServices, { refreshToken })
    clearRefreshCookie(res);

    return res.status(204).send()
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Logout failed' });
  }
}