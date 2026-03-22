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
}): Message {
  const db = getDb();
  const insert = db.transaction(() => {
    const row = db
      .prepare('SELECT COALESCE(MAX(seq), 0) AS max_seq FROM messages WHERE conversation_id = ?')
      .get(msg.conversation_id) as { max_seq: number };
    const seq = row.max_seq + 1;
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
      seq,
    );
    return db.prepare('SELECT * FROM messages WHERE id = ?').get(msg.id) as Message;
  });
  return insert();
}
