import jwt from 'jsonwebtoken';
import { config } from '../../../../shared/config/env';
import { ttlToMs } from '../../../../shared/utils/timestamp'

export type AccessTokenPayload = {
  sub: string; // userId
  email: string;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: Math.floor(ttlToMs(config.JWT_ACCESS_TTL) / 1000),
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as AccessTokenPayload;
}
