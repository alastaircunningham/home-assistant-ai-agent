import { SINGLETON_ID } from '../db/conversations.repo.js';
import { deleteOldMessages } from '../db/messages.repo.js';
import { logger } from '../logger.js';

const AGE_DAYS = 30;
const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function runMessageAging(): void {
  const deleted = deleteOldMessages(SINGLETON_ID, AGE_DAYS);
  if (deleted > 0) {
    logger.info(`Message aging: deleted ${deleted} messages older than ${AGE_DAYS} days`);
  }
}

export function startAgingScheduler(): void {
  runMessageAging();
  setInterval(runMessageAging, INTERVAL_MS);
}
