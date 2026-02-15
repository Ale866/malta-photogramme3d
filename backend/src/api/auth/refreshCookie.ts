import { Response } from 'express';
import { config } from '../../config/env';
import { ttlToMs } from '../../utils/timestamp';

const REFRESH_COOKIE_NAME = 'refreshToken';

export function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/auth/refresh',
    maxAge: ttlToMs(config.JWT_REFRESH_TTL),
  });
}

export function getRefreshCookieName() {
  return REFRESH_COOKIE_NAME;
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    path: '/auth/refresh',
  });
}
