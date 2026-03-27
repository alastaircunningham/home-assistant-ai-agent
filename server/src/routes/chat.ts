import { Router, type Request, type Response } from 'express';
import { SINGLETON_ID } from '../db/conversations.repo.js';
import { getMessages } from '../db/messages.repo.js';
import { logger } from '../logger.js';
import { handleMessage } from '../services/chat.js';
import { runMessageAging } from '../services/aging.js';
import { sendToAll } from '../websocket/server.js';
import { getToolContext } from '../tool-context.js';

const router = Router();

// GET /messages — fetch all messages in the singleton conversation
router.get('/messages', (_req: Request, res: Response) => {
  res.json(getMessages(SINGLETON_ID));
});

// POST /messages — send a user message to the singleton conversation
router.post('/messages', (req: Request, res: Response) => {
  const { content } = req.body as { content?: string };

  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'content is required and must be a string' });
    return;
  }

  // Opportunistic aging on each new message
  runMessageAging();

  const toolContext = getToolContext();

  handleMessage(SINGLETON_ID, content, sendToAll, toolContext)
    .then(({ userMessageId }) => {
      logger.info('Message handling started', { userMessageId });
    })
    .catch((err) => {
      logger.error('Failed to handle message', { error: (err as Error).message });
    });

  res.status(202).json({ status: 'accepted', conversationId: SINGLETON_ID });
});

export default router;
