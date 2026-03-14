import { Request, Response } from 'express';
import { register } from '../application/register';
import { login } from '../application/login';
import { authServices } from '../infrastructure/authServices';
import { clearRefreshCookie, setRefreshCookie, getRefreshCookieName } from './refreshCookie';
import { refresh } from '../application/refresh';
import { logout } from '../application/logout';
import {
  isApplicationError,
  sendErrorResponse,
} from '../../../shared/errors/applicationError';

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
      accessTokenExpiresAt: result.accessTokenExpiresAt,
      user: result.user,
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'Register failed');
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

    return res.status(200).json({
      accessToken: result.accessToken,
      accessTokenExpiresAt: result.accessTokenExpiresAt,
      user: result.user,
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'Login failed');
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
      accessTokenExpiresAt: result.accessTokenExpiresAt,
      user: result.user,
    });
  } catch (error) {
    if (
      isApplicationError(error)
      && (
        error.code === 'invalid_refresh_token'
        || error.code === 'refresh_token_expired'
        || error.code === 'refresh_token_revoked'
      )
    ) {
      clearRefreshCookie(res);
    }
    return sendErrorResponse(res, error, 'Refresh failed');
  }
}

export async function logoutController(req: Request, res: Response) {
  try {
    const cookieName = getRefreshCookieName();
    const refreshToken = req.cookies?.[cookieName];

    if (refreshToken) await logout(authServices, { refreshToken })
    clearRefreshCookie(res);

    return res.status(204).send()
  } catch (error) {
    return sendErrorResponse(res, error, 'Logout failed');
  }
}
