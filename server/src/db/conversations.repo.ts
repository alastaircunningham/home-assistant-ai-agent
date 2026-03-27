import { getDb } from './database.js';

export const SINGLETON_ID = 'default';

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function ensureSingletonConversation(): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO conversations (id, title) VALUES (?, 'Home Assistant AI')`,
  ).run(SINGLETON_ID);
}

export function getConversation(id: string): Conversation | undefined {
  const db = getDb();
  return db
    .prepare('SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?')
    .get(id) as Conversation | undefined;
}

export function createConversation(id: string, title: string): Conversation {
  const db = getDb();
  db.prepare('INSERT INTO conversations (id, title) VALUES (?, ?)').run(id, title);
  return getConversation(id)!;
}
