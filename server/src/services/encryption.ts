import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { logger } from '../logger.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get or create the encryption key.
 * Stored in the data directory as .encryption_key
 */
function getEncryptionKey(): Buffer {
  const keyPath = path.join(config.dataDir, '.encryption_key');

  try {
    if (fs.existsSync(keyPath)) {
      const hex = fs.readFileSync(keyPath, 'utf-8').trim();
      return Buffer.from(hex, 'hex');
    }
  } catch {
    // Key file doesn't exist or is unreadable
  }

  // Generate a new key
  const key = crypto.randomBytes(KEY_LENGTH);
  try {
    fs.writeFileSync(keyPath, key.toString('hex'), { mode: 0o600 });
    logger.info('Generated new encryption key');
  } catch (err) {
    logger.warn('Could not persist encryption key', { error: (err as Error).message });
  }

  return key;
}

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (!cachedKey) {
    cachedKey = getEncryptionKey();
  }
  return cachedKey;
}

/**
 * Encrypt a plaintext string.
 * Returns a string in the format: iv:authTag:ciphertext (all hex-encoded).
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string in the format: iv:authTag:ciphertext (hex-encoded).
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex!, 'hex');
  const authTag = Buffer.from(authTagHex!, 'hex');

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid ciphertext components');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex!, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');

  return decrypted;
}
