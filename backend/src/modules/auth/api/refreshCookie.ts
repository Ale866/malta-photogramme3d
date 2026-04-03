import { Request, Response } from 'express';
import { ttlToMs } from '../../../shared/utils/timestamp';
import { config } from '../../../shared/config/env';

const REFRESH_COOKIE_NAME = 'refreshToken';

function isSecureRequest(req: Request) {
  if (req.secure) return true;

  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string') {
    return forwardedProto.split(',')[0]?.trim().toLowerCase() === 'https';
  }

  return false;
}

function getRefreshCookieOptions(req: Request) {
  const secure = isSecureRequest(req);
  const requestOrigin = req.headers.origin;
  const requestHost = req.headers.host;
  const isCrossSite = typeof requestOrigin === 'string'
    && typeof requestHost === 'string'
    && (() => {
      try {
        return new URL(requestOrigin).host !== requestHost;
      } catch {
        return false;
      }
    })();

  return {
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
    partitioned: secure && isCrossSite,
    path: '/auth',
  } as const;
}

export function setRefreshCookie(req: Request, res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...getRefreshCookieOptions(req),
    maxAge: ttlToMs(config.JWT_REFRESH_TTL),
  });
}

export function getRefreshCookieName() {
  return REFRESH_COOKIE_NAME;
}

export function clearRefreshCookie(req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...getRefreshCookieOptions(req),
  });
}
