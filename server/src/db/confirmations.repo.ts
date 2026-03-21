import { getDb } from './database.js';

export type PolicyLevel = 'always_confirm' | 'auto_approve' | 'auto_deny';

export interface ConfirmationPolicy {
  tool_name: string;
  policy: PolicyLevel;
}

export function getPolicy(toolName: string): PolicyLevel | null {
  const db = getDb();
  const row = db
    .prepare('SELECT policy FROM confirmation_policies WHERE tool_name = ?')
    .get(toolName) as { policy: PolicyLevel } | undefined;
  return row?.policy ?? null;
}

export function setPolicy(toolName: string, policy: PolicyLevel): void {
  const db = getDb();
  db.prepare(
    'INSERT INTO confirmation_policies (tool_name, policy) VALUES (?, ?) ON CONFLICT(tool_name) DO UPDATE SET policy = excluded.policy',
  ).run(toolName, policy);
}

export function getAllPolicies(): ConfirmationPolicy[] {
  const db = getDb();
  return db
    .prepare('SELECT tool_name, policy FROM confirmation_policies ORDER BY tool_name')
    .all() as ConfirmationPolicy[];
}
