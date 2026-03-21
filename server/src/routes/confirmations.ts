import { Router, type Request, type Response } from 'express';
import { getAllPolicies, setPolicy, type PolicyLevel } from '../db/confirmations.repo.js';
import { logger } from '../logger.js';

const VALID_POLICIES: PolicyLevel[] = ['always_confirm', 'auto_approve', 'auto_deny'];

const router = Router();

// GET / — get all confirmation policies
router.get('/', (_req: Request, res: Response) => {
  const policies = getAllPolicies();
  res.json(policies);
});

// PUT /:toolName — update a tool's policy
router.put('/:toolName', (req: Request, res: Response) => {
  const { toolName } = req.params;
  const { policy } = req.body as { policy?: string };

  if (!policy || !VALID_POLICIES.includes(policy as PolicyLevel)) {
    res.status(400).json({
      error: `policy must be one of: ${VALID_POLICIES.join(', ')}`,
    });
    return;
  }

  setPolicy(toolName, policy as PolicyLevel);
  logger.info(`Updated confirmation policy for ${toolName} to ${policy}`);
  res.json({ tool_name: toolName, policy });
});

export default router;
