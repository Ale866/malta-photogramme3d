import { Request, Response } from 'express';
import { register } from '../application/register';
import { login } from '../application/login';
import { authServices } from '../infrastructure/authServices';
import { clearRefreshCookie, setRefreshCookie, getRefreshCookieName } from './refreshCookie';
import { refresh } from '../application/refresh';
import { logout } from '../application/logout';
import { requestPasswordReset } from '../application/requestPasswordReset';
import { validatePasswordResetToken } from '../application/validatePasswordResetToken';
import { resetPassword } from '../application/resetPassword';
import { isApplicationError, sendErrorResponse, } from '../../../shared/errors/applicationError';

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
    const refreshToken = req.cookies?.[cookieName] as string | undefined;

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

export async function forgotPasswordController(req: Request, res: Response) {
  try {
    const { email } = req.body ?? {};

    const result = await requestPasswordReset(authServices, { email });

    return res.status(202).json(result);
  } catch (error) {
    return sendErrorResponse(res, error, 'Forgot password request failed');
  }
}

export async function validateResetPasswordTokenController(req: Request, res: Response) {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : '';

    const result = await validatePasswordResetToken(authServices, { token });

    return res.status(200).json({
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'Reset password token validation failed');
  }
}

export async function resetPasswordController(req: Request, res: Response) {
  try {
    const { token, password, confirmPassword } = req.body ?? {};

    const result = await resetPassword(authServices, {
      token,
      password,
      confirmPassword,
    });

    clearRefreshCookie(res);

    return res.status(200).json(result);
  } catch (error) {
    return sendErrorResponse(res, error, 'Reset password failed');
  }
}
