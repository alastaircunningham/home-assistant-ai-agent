import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import { logger } from '../logger.js';

let db: Database.Database;

function runMigrations(database: Database.Database): void {
  logger.info('Running database migrations');

  database.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New conversation',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user','assistant','tool_use','tool_result')),
      content TEXT,
      tool_name TEXT,
      tool_input TEXT,
      tool_result TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      seq INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS confirmation_policies (
      tool_name TEXT PRIMARY KEY,
      policy TEXT NOT NULL CHECK (policy IN ('always_confirm','auto_approve','auto_deny'))
    );
  `);

  // Insert default confirmation policies (ignore if already present)
  const defaultPolicies: Array<{ tool_name: string; policy: string }> = [
    { tool_name: 'lock_control', policy: 'always_confirm' },
    { tool_name: 'alarm_control', policy: 'always_confirm' },
    { tool_name: 'config_editor', policy: 'always_confirm' },
    { tool_name: 'lights_control', policy: 'auto_approve' },
    { tool_name: 'fan_control', policy: 'auto_approve' },
    { tool_name: 'climate_control', policy: 'auto_approve' },
    { tool_name: 'cover_control', policy: 'auto_approve' },
    { tool_name: 'switch_control', policy: 'auto_approve' },
    { tool_name: 'scene_activate', policy: 'auto_approve' },
    { tool_name: 'media_control', policy: 'auto_approve' },
  ];

  const insert = database.prepare(
    'INSERT OR IGNORE INTO confirmation_policies (tool_name, policy) VALUES (?, ?)',
  );

  const insertAll = database.transaction(() => {
    for (const p of defaultPolicies) {
      insert.run(p.tool_name, p.policy);
    }
  });

  insertAll();

  logger.info('Database migrations complete');
}

export function initDatabase(): Database.Database {
  const dbPath = path.join(config.dataDir, 'chat.db');
  logger.info(`Opening database at ${dbPath}`);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);

  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialised. Call initDatabase() first.');
  }
  return db;
}
