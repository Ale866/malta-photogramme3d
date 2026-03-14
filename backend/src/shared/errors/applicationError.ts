import type { Response } from "express";

export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

export function badRequest(message: string, code = "bad_request") {
  return new ApplicationError(code, 400, message);
}

export function unauthorized(message = "Not authenticated", code = "unauthorized") {
  return new ApplicationError(code, 401, message);
}

export function forbidden(message = "Forbidden", code = "forbidden") {
  return new ApplicationError(code, 403, message);
}

export function notFound(message: string, code = "not_found") {
  return new ApplicationError(code, 404, message);
}

export function conflict(message: string, code = "conflict") {
  return new ApplicationError(code, 409, message);
}

export function sendErrorResponse(res: Response, error: unknown, fallbackMessage = "Server error") {
  if (isApplicationError(error)) {
    return res.status(error.status).json({
      error: error.message,
      code: error.code,
    });
  }

  console.error(error);
  return res.status(500).json({ error: fallbackMessage });
}
