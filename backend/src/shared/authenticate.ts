import { Request, Response, NextFunction } from 'express'
import { authServices } from '../modules/auth/infrastructure/authServices';

export type AuthedRequest = Request & {
  user?: { sub: string; email: string }
}

export function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing access token' })
  }

  const token = header.slice('Bearer '.length).trim()

  try {
    const payload = authServices.verifyAccessToken(token)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
