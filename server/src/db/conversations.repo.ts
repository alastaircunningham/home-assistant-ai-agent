import { getDb } from './database.js';

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function listConversations(): Conversation[] {
  const db = getDb();
  return db
    .prepare('SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC')
    .all() as Conversation[];
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

export function updateConversationTitle(id: string, title: string): Conversation | undefined {
  const db = getDb();
  db.prepare("UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?").run(
    title,
    id,
  );
  return getConversation(id);
}

export function deleteConversation(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
  return result.changes > 0;
}
