import { Response } from 'express';
import { config } from '../../config/env';
import { ttlToMs } from '../../utils/timestamp';

export function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/auth/refresh',
    maxAge: ttlToMs(config.JWT_REFRESH_TTL),
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie('refreshToken', {
    path: '/auth/refresh',
  });
}
