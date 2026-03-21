import { Router, type Request, type Response } from 'express';
import { getConversation } from '../db/conversations.repo.js';
import { logger } from '../logger.js';
import { handleMessage } from '../services/chat.js';
import { sendToAll } from '../websocket/server.js';
import { getToolContext } from '../tool-context.js';

const router = Router();

// POST /:conversationId/messages — send a user message
router.post('/:conversationId/messages', (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { content } = req.body as { content?: string };

  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'content is required and must be a string' });
    return;
  }

  const conversation = getConversation(conversationId);
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const toolContext = getToolContext();

  // Start async message handling (streaming happens via WebSocket)
  handleMessage(conversationId, content, sendToAll, toolContext)
    .then(({ userMessageId }) => {
      logger.info(`Message handling started for conversation ${conversationId}`, {
        userMessageId,
      });
    })
    .catch((err) => {
      logger.error('Failed to handle message', {
        error: (err as Error).message,
        conversationId,
      });
    });

  // Return 202 Accepted immediately — response streams via WebSocket
  res.status(202).json({ status: 'accepted', conversationId });
});

export default router;
