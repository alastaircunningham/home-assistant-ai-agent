import { Router, type Request, type Response, type NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      ingressPath?: string;
    }
  }
}

/**
 * Middleware that reads the X-Ingress-Path header set by the HA Ingress proxy
 * and attaches it to the request object so downstream handlers can use it.
 */
export function ingressMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const ingressPath = req.headers['x-ingress-path'];
  if (typeof ingressPath === 'string') {
    req.ingressPath = ingressPath;
  } else {
    req.ingressPath = '';
  }
  next();
}

/**
 * Router that exposes the ingress path to the frontend so it can build
 * correct API URLs when running behind the HA Ingress proxy.
 */
export function ingressRouter(): Router {
  const router = Router();
  router.get('/', (req: Request, res: Response) => {
    res.json({ ingressPath: req.ingressPath ?? '' });
  });
  return router;
}
