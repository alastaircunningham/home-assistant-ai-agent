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

    await this.backupAndWrite(resolvedPath, filePath, content);
  }

  /**
   * Add a new item to a YAML list file.
   * Creates the file as an empty list if it doesn't exist yet.
   */
  async addItem(filePath: string, itemContent: string): Promise<void> {
    const resolvedPath = this.resolvePath(filePath);
    this.validatePath(resolvedPath);
    this.checkBlocklist(filePath);

    const newItem = this.parseItem(itemContent);

    // Read existing list or start fresh
    let list: unknown[] = [];
    try {
      const existing = await fs.readFile(resolvedPath, 'utf-8');
      const parsed = yaml.load(existing);
      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed !== null && parsed !== undefined) {
        throw new Error(`${filePath} is not a YAML list — use action=write to overwrite it directly`);
      }
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
      // File doesn't exist yet — start with an empty list
    }

    list.push(newItem);
    await this.writeList(resolvedPath, filePath, list);
  }

  /**
   * Replace an existing item in a YAML list file, found by alias or id.
   */
  async updateItem(filePath: string, itemContent: string, identifier: string): Promise<void> {
    const resolvedPath = this.resolvePath(filePath);
    this.validatePath(resolvedPath);
    this.checkBlocklist(filePath);

    const newItem = this.parseItem(itemContent);
    const list = await this.readList(resolvedPath, filePath);

    const idx = this.findItemIndex(list, identifier);
    if (idx === -1) {
      throw new Error(`No item with id or alias "${identifier}" found in ${filePath}`);
    }

    list[idx] = newItem;
    await this.writeList(resolvedPath, filePath, list);
  }

  /**
   * Remove an item from a YAML list file, found by alias or id.
   */
  async removeItem(filePath: string, identifier: string): Promise<void> {
    const resolvedPath = this.resolvePath(filePath);
    this.validatePath(resolvedPath);
    this.checkBlocklist(filePath);

    const list = await this.readList(resolvedPath, filePath);

    const idx = this.findItemIndex(list, identifier);
    if (idx === -1) {
      throw new Error(`No item with id or alias "${identifier}" found in ${filePath}`);
    }

    list.splice(idx, 1);
    await this.writeList(resolvedPath, filePath, list);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private parseItem(itemContent: string): object {
    let parsed: unknown;
    try {
      parsed = yaml.load(itemContent);
    } catch (err) {
      throw new Error(`Invalid YAML for item: ${(err as Error).message}`);
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('item must be a YAML mapping (single object), not a list or scalar value');
    }
    return parsed as object;
  }

  private async readList(resolvedPath: string, filePath: string): Promise<any[]> {
    const existing = await fs.readFile(resolvedPath, 'utf-8');
    const parsed = yaml.load(existing);
    if (!Array.isArray(parsed)) {
      throw new Error(`${filePath} is not a YAML list — use action=write to edit it directly`);
    }
    return parsed;
  }

  private findItemIndex(list: any[], identifier: string): number {
    return list.findIndex(
      (item: any) =>
        (item?.id !== undefined && String(item.id) === identifier) ||
        (item?.alias !== undefined && item.alias === identifier),
    );
  }

  private async writeList(resolvedPath: string, filePath: string, list: unknown[]): Promise<void> {
    const content = yaml.dump(list, { lineWidth: -1, noRefs: true });
    await this.backupAndWrite(resolvedPath, filePath, content);
  }

  private async backupAndWrite(resolvedPath: string, filePath: string, content: string): Promise<void> {
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
