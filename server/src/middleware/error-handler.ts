import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

/**
 * Express error-handling middleware.
 * Must have four parameters so Express recognises it as an error handler.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  const status = (err as Error & { status?: number }).status ?? 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
}
