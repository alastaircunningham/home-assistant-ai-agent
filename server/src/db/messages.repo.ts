import { getDb } from './database.js';

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'tool_use' | 'tool_result';
  content: string | null;
  tool_name: string | null;
  tool_input: string | null;
  tool_result: string | null;
  created_at: string;
  seq: number;
}

export function getMessages(conversationId: string): Message[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY seq ASC')
    .all(conversationId) as Message[];
}

export function addMessage(msg: {
  id: string;
  conversation_id: string;
  role: Message['role'];
  content?: string | null;
  tool_name?: string | null;
  tool_input?: string | null;
  tool_result?: string | null;
  seq: number;
}): Message {
  const db = getDb();
  db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, tool_name, tool_input, tool_result, seq)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    msg.id,
    msg.conversation_id,
    msg.role,
    msg.content ?? null,
    msg.tool_name ?? null,
    msg.tool_input ?? null,
    msg.tool_result ?? null,
    msg.seq,
  );
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(msg.id) as Message;
}

export function getNextSeq(conversationId: string): number {
  const db = getDb();
  const row = db
    .prepare('SELECT COALESCE(MAX(seq), 0) AS max_seq FROM messages WHERE conversation_id = ?')
    .get(conversationId) as { max_seq: number };
  return row.max_seq + 1;
}

export function deleteOldMessages(conversationId: string, olderThanDays: number): number {
  const db = getDb();
  const result = db
    .prepare(
      `DELETE FROM messages WHERE conversation_id = ? AND created_at < datetime('now', '-' || ? || ' days')`,
    )
    .run(conversationId, olderThanDays);
  return result.changes;
}
