import { Response } from 'express';
import { config } from '../../../shared/config/env';
import { ttlToMs } from '../../../shared/utils/timestamp';

const REFRESH_COOKIE_NAME = 'refreshToken';
const IS_SECURE_COOKIE = /^https:/i.test(config.APP_BASE_URL);
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: IS_SECURE_COOKIE ? 'none' : 'lax',
  secure: IS_SECURE_COOKIE,
  path: '/auth',
} as const;

export function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...REFRESH_COOKIE_OPTIONS,
    maxAge: ttlToMs(config.JWT_REFRESH_TTL),
  });
}

export function getRefreshCookieName() {
  return REFRESH_COOKIE_NAME;
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...REFRESH_COOKIE_OPTIONS,
  });
}
