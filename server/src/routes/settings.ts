import { Router, type Request, type Response } from 'express';
import { getAllSettings, setSetting } from '../db/settings.repo.js';
import { buildSystemPrompt } from '../services/claude.js';
import { logger } from '../logger.js';

const router = Router();

// GET / — get all settings (includes defaults for keys not yet set)
router.get('/', (_req: Request, res: Response) => {
  const settings = getAllSettings();
  // Return the effective system prompt (DB override or hardcoded default)
  if (!settings['system_prompt']) {
    settings['system_prompt'] = buildSystemPrompt();
  }
  res.json(settings);
});

// PUT / — update settings (accepts an object of key-value pairs)
router.put('/', (req: Request, res: Response) => {
  const body = req.body as Record<string, string>;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    res.status(400).json({ error: 'Body must be a JSON object of key-value pairs' });
    return;
  }
  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== 'string') {
      res.status(400).json({ error: `Value for key "${key}" must be a string` });
      return;
    }
    setSetting(key, value);
  }
  logger.info('Settings updated', { keys: Object.keys(body) });
  res.json(getAllSettings());
});

export default router;
