import { Router, type Request, type Response } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { ConfigEditor } from '../services/config-editor.js';

const router = Router();
const editor = new ConfigEditor(config.haConfigDir);

// GET /list — list YAML files in /homeassistant
router.get('/list', async (_req: Request, res: Response) => {
  try {
    const files = await editor.listFiles();
    res.json({ files });
  } catch (err) {
    logger.error('Failed to list config files', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to list config files' });
  }
});

// GET /read?path=... — read a file
router.get('/read', async (req: Request, res: Response) => {
  const filePath = req.query.path as string | undefined;
  if (!filePath) {
    res.status(400).json({ error: 'path query parameter is required' });
    return;
  }

  try {
    const content = await editor.readFile(filePath);
    res.json({ path: filePath, content });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('denied') || msg.includes('not allowed')) {
      res.status(403).json({ error: msg });
    } else if (msg.includes('ENOENT')) {
      res.status(404).json({ error: 'File not found' });
    } else {
      logger.error('Failed to read config file', { error: msg });
      res.status(500).json({ error: 'Failed to read config file' });
    }
  }
});

// PUT /write — write a config file (requires confirmation via tool; this endpoint is for direct use)
router.put('/write', async (req: Request, res: Response) => {
  const { path: filePath, content } = req.body as { path?: string; content?: string };
  if (!filePath || content === undefined) {
    res.status(400).json({ error: 'path and content are required' });
    return;
  }

  try {
    await editor.writeFile(filePath, content);
    res.json({ success: true, path: filePath });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('denied') || msg.includes('not allowed')) {
      res.status(403).json({ error: msg });
    } else if (msg.includes('Invalid YAML')) {
      res.status(400).json({ error: msg });
    } else {
      logger.error('Failed to write config file', { error: msg });
      res.status(500).json({ error: 'Failed to write config file' });
    }
  }
});

export default router;
