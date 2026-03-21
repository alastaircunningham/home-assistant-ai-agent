import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

const INGRESS_PROXY_IP = '172.30.32.2';
const ALLOWED_IPS = new Set([
  INGRESS_PROXY_IP,
  `::ffff:${INGRESS_PROXY_IP}`,
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
]);

/**
 * Simple IP-based auth middleware.
 *
 * In Home Assistant add-on context, all requests arrive through the Ingress
 * proxy at 172.30.32.2 which already handles authentication.
 *
 * In dev mode (no SUPERVISOR_TOKEN), all requests are allowed.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const isDev = !process.env['SUPERVISOR_TOKEN'];
  if (isDev) {
    next();
    return;
  }

  const remoteIp = req.ip ?? req.socket.remoteAddress ?? '';
  if (ALLOWED_IPS.has(remoteIp)) {
    next();
    return;
  }

  logger.warn(`Rejected request from unauthorized IP: ${remoteIp}`);
  res.status(403).json({ error: 'Forbidden' });
}
