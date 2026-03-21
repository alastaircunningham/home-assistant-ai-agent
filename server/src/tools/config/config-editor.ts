import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';
import { ConfigEditor } from '../../services/config-editor.js';

const inputSchema = z.object({
  action: z.enum(['read', 'write', 'list']).describe('Action to perform on config files'),
  file_path: z
    .string()
    .optional()
    .describe('Relative file path within HA config directory (for read/write)'),
  content: z.string().optional().describe('File content to write (for write action)'),
});

const configEditorTool: ToolDefinition = {
  name: 'config_editor',
  description:
    'Read, write, or list Home Assistant configuration files (YAML). Always requires confirmation. Use list to see available files, read to view a file, write to modify.',
  inputSchema,
  category: 'config',
  confirmationDefault: 'always_confirm',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { action, file_path, content } = input;
      const editor = new ConfigEditor(context.configDir);

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

      if (action === 'write') {
        if (!file_path) {
          return { success: false, result: null, error: 'file_path is required for write action' };
        }
        if (!content) {
          return { success: false, result: null, error: 'content is required for write action' };
        }
        await editor.writeFile(file_path, content);
        return { success: true, result: `File ${file_path} written successfully` };
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

registerTool(configEditorTool);
