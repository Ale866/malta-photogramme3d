import { Request, Response, NextFunction } from 'express'
import { authServices } from '../modules/auth/infrastructure/authServices';
import { sendErrorResponse, unauthorized } from './errors/applicationError';

export type AuthedRequest = Request & {
  user?: { sub: string; email: string }
}

export function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return sendErrorResponse(res, unauthorized('Missing access token', 'access_token_required'))
  }

  const token = header.slice('Bearer '.length).trim()

  try {
    const payload = authServices.verifyAccessToken(token)
    req.user = payload
    next()
  } catch {
    return sendErrorResponse(res, unauthorized('Invalid or expired token', 'invalid_access_token'))
  }
}

export function optionalAuthenticate(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next()
  }

  const token = header.slice('Bearer '.length).trim()

  try {
    const payload = authServices.verifyAccessToken(token)
    req.user = payload
  } catch {
    req.user = undefined
  }

  return next()
}
