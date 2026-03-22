import path from 'node:path';
import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';
import { ConfigEditor } from '../../services/config-editor.js';

// Map file name patterns to the HA service that reloads them.
const RELOAD_SERVICE_MAP: Array<{ pattern: RegExp; domain: string; service: string }> = [
  { pattern: /automation/i, domain: 'automation', service: 'reload' },
  { pattern: /script/i, domain: 'script', service: 'reload' },
  { pattern: /scene/i, domain: 'scene', service: 'reload' },
  { pattern: /input_boolean/i, domain: 'input_boolean', service: 'reload' },
  { pattern: /input_number/i, domain: 'input_number', service: 'reload' },
  { pattern: /input_select/i, domain: 'input_select', service: 'reload' },
  { pattern: /input_text/i, domain: 'input_text', service: 'reload' },
  { pattern: /input_datetime/i, domain: 'input_datetime', service: 'reload' },
  { pattern: /group/i, domain: 'group', service: 'reload' },
  { pattern: /template/i, domain: 'template', service: 'reload' },
];

function getReloadService(filePath: string): { domain: string; service: string } | null {
  const name = path.basename(filePath);
  for (const entry of RELOAD_SERVICE_MAP) {
    if (entry.pattern.test(name)) {
      return { domain: entry.domain, service: entry.service };
    }
  }
  return null;
}

const inputSchema = z.object({
  action: z
    .enum(['list', 'read', 'write', 'add_item', 'update_item', 'remove_item'])
    .describe(
      'Action to perform: "list" lists available files, "read" reads a file, "write" writes a complete file, ' +
        '"add_item" appends one item to a YAML list file, "update_item" replaces one item by alias/id, ' +
        '"remove_item" deletes one item by alias/id. ' +
        'Prefer add_item/update_item/remove_item over write for list-based files (automations, scripts, scenes) ' +
        'to avoid the token-limit problem with large files.',
    ),
  file_path: z
    .string()
    .optional()
    .describe('Relative path within the HA config directory. Required for all actions except "list".'),
  content: z
    .string()
    .optional()
    .describe(
      'For action="write" only: the complete new file content as a YAML string. ' +
        'Not used by add_item/update_item/remove_item.',
    ),
  item: z
    .string()
    .optional()
    .describe(
      'For action="add_item" or "update_item": the YAML for a single list item (e.g. one automation block). ' +
        'Must be a YAML mapping, not a full list.',
    ),
  identifier: z
    .string()
    .optional()
    .describe(
      'For action="update_item" or "remove_item": the alias or id of the item to find. ' +
        'Matched against the item\'s "alias" field first, then its "id" field.',
    ),
});

const configEditorTool: ToolDefinition = {
  name: 'config_editor',
  description:
    'Read, write, or surgically edit Home Assistant YAML configuration files. ' +
    'Always requires user confirmation before writing. ' +
    'For list-based files (automations.yaml, scripts.yaml, scenes.yaml, etc.) use ' +
    'add_item / update_item / remove_item instead of write — they only require the ' +
    'single item YAML, not the whole file, so they work regardless of file size. ' +
    'After any write operation, the relevant HA domain is reloaded automatically.',
  inputSchema,
  category: 'config',
  confirmationDefault: 'always_confirm',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { action, file_path, content, item, identifier } = input;
      const editor = new ConfigEditor(context.configDir);

      // ── Read-only actions ────────────────────────────────────────────────

      if (action === 'list') {
        const files = await editor.listFiles();
        return { success: true, result: { files } };
      }

      if (action === 'read') {
        if (!file_path) {
          return { success: false, result: null, error: 'file_path is required for read action' };
        }
        const fileContent = await editor.readFile(file_path);
        return { success: true, result: { path: file_path, content: fileContent } };
      }

      // ── Write actions — all trigger a reload after success ───────────────

      if (action === 'write') {
        if (!file_path) {
          return { success: false, result: null, error: 'file_path is required for write action' };
        }
        if (!content) {
          return { success: false, result: null, error: 'content is required for write action' };
        }
        await editor.writeFile(file_path, content);
        const reloadNote = await triggerReload(file_path, context);
        return { success: true, result: `${file_path} written successfully.${reloadNote}` };
      }

      if (action === 'add_item') {
        if (!file_path) {
          return { success: false, result: null, error: 'file_path is required for add_item action' };
        }
        if (!item) {
          return { success: false, result: null, error: 'item is required for add_item action' };
        }
        await editor.addItem(file_path, item);
        const reloadNote = await triggerReload(file_path, context);
        return { success: true, result: `Item added to ${file_path}.${reloadNote}` };
      }

      if (action === 'update_item') {
        if (!file_path) {
          return { success: false, result: null, error: 'file_path is required for update_item action' };
        }
        if (!item) {
          return { success: false, result: null, error: 'item is required for update_item action' };
        }
        if (!identifier) {
          return { success: false, result: null, error: 'identifier is required for update_item action' };
        }
        await editor.updateItem(file_path, item, identifier);
        const reloadNote = await triggerReload(file_path, context);
        return { success: true, result: `Item "${identifier}" updated in ${file_path}.${reloadNote}` };
      }

      if (action === 'remove_item') {
        if (!file_path) {
          return { success: false, result: null, error: 'file_path is required for remove_item action' };
        }
        if (!identifier) {
          return { success: false, result: null, error: 'identifier is required for remove_item action' };
        }
        await editor.removeItem(file_path, identifier);
        const reloadNote = await triggerReload(file_path, context);
        return { success: true, result: `Item "${identifier}" removed from ${file_path}.${reloadNote}` };
      }

      return { success: false, result: null, error: `Unknown action: ${action}` };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Config editor error: ${(err as Error).message}`,
      };
    }
  },
};

async function triggerReload(filePath: string, context: ToolContext): Promise<string> {
  const reload = getReloadService(filePath);
  if (!reload) {
    return ' You may need to reload the relevant HA configuration manually.';
  }
  try {
    await context.hassClient.callService(reload.domain, reload.service);
    return ` HA ${reload.domain} configuration reloaded automatically.`;
  } catch (err) {
    return ` Note: automatic reload of ${reload.domain} failed (${(err as Error).message}) — reload manually if needed.`;
  }
}

registerTool(configEditorTool);
