import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { logger } from '../logger.js';

const BLOCKLIST = [
  'secrets.yaml',
  '.storage',
  '.cloud',
  'home-assistant.log',
  'home-assistant_v2.db',
  'home-assistant_v2.db-shm',
  'home-assistant_v2.db-wal',
  'tts',
  '.git',
  '.gitignore',
  'OZW_Log.txt',
];

export class ConfigEditor {
  private configDir: string;

  constructor(configDir: string) {
    this.configDir = configDir;
  }

  /**
   * List YAML files in the HA config directory, recursively.
   */
  async listFiles(subDir: string = ''): Promise<string[]> {
    const fullDir = path.join(this.configDir, subDir);
    const files: string[] = [];

    try {
      const entries = await fs.readdir(fullDir, { withFileTypes: true });

      for (const entry of entries) {
        const relativePath = path.join(subDir, entry.name);

        // Skip blocklisted paths
        if (this.isBlocklisted(relativePath)) continue;

        if (entry.isDirectory()) {
          const subFiles = await this.listFiles(relativePath);
          files.push(...subFiles);
        } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
          files.push(relativePath);
        }
      }
    } catch (err) {
      logger.warn(`Failed to list config files in ${fullDir}`, {
        error: (err as Error).message,
      });
    }

    return files;
  }

  /**
   * Read a config file's content.
   */
  async readFile(filePath: string): Promise<string> {
    const resolvedPath = this.resolvePath(filePath);
    this.validatePath(resolvedPath);
    this.checkBlocklist(filePath);

    return fs.readFile(resolvedPath, 'utf-8');
  }

  /**
   * Write content to a config file, with YAML validation and backup.
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    const resolvedPath = this.resolvePath(filePath);
    this.validatePath(resolvedPath);
    this.checkBlocklist(filePath);

    // Validate YAML
    try {
      yaml.load(content);
    } catch (err) {
      throw new Error(`Invalid YAML content: ${(err as Error).message}`);
    }

    // Create backup if file exists
    try {
      await fs.access(resolvedPath);
      const backupPath = `${resolvedPath}.bak`;
      await fs.copyFile(resolvedPath, backupPath);
      logger.info(`Created backup: ${backupPath}`);
    } catch {
      // File doesn't exist yet, no backup needed
    }

    // Ensure directory exists
    const dir = path.dirname(resolvedPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(resolvedPath, content, 'utf-8');
    logger.info(`Config file written: ${filePath}`);
  }

  private resolvePath(filePath: string): string {
    return path.resolve(this.configDir, filePath);
  }

  private validatePath(resolvedPath: string): void {
    const normalizedConfig = path.resolve(this.configDir);
    const normalizedTarget = path.resolve(resolvedPath);
    if (!normalizedTarget.startsWith(normalizedConfig + path.sep) && normalizedTarget !== normalizedConfig) {
      throw new Error('Path traversal detected: access denied');
    }
  }

  private isBlocklisted(relativePath: string): boolean {
    const parts = relativePath.split(path.sep);
    return parts.some((part) => BLOCKLIST.includes(part));
  }

  private checkBlocklist(filePath: string): void {
    if (this.isBlocklisted(filePath)) {
      throw new Error(`Access to ${filePath} is not allowed`);
    }
  }
}
