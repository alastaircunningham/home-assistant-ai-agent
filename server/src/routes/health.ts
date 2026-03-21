import { Router, type Request, type Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

export default router;
