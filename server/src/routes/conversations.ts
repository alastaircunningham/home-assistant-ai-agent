import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  listConversations,
  getConversation,
  createConversation,
  updateConversationTitle,
  deleteConversation,
} from '../db/conversations.repo.js';
import { getMessages } from '../db/messages.repo.js';
import { logger } from '../logger.js';

const router = Router();

// GET / — list all conversations
router.get('/', (_req: Request, res: Response) => {
  const conversations = listConversations();
  res.json(conversations);
});

// POST / — create a new conversation
router.post('/', (req: Request, res: Response) => {
  const title = (req.body as { title?: string }).title ?? 'New conversation';
  const id = uuidv4();
  const conversation = createConversation(id, title);
  logger.info(`Created conversation ${id}`);
  res.status(201).json(conversation);
});

// GET /:id — get a conversation with its messages
router.get('/:id', (req: Request, res: Response) => {
  const conversation = getConversation(req.params.id);
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  const messages = getMessages(req.params.id);
  res.json({ ...conversation, messages });
});

// PUT /:id — update conversation title
router.put('/:id', (req: Request, res: Response) => {
  const { title } = req.body as { title?: string };
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  const conversation = updateConversationTitle(req.params.id, title);
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  res.json(conversation);
});

// DELETE /:id — delete a conversation
router.delete('/:id', (req: Request, res: Response) => {
  const deleted = deleteConversation(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  logger.info(`Deleted conversation ${req.params.id}`);
  res.status(204).end();
});

export default router;
