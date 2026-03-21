import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';
import { ConfigEditor } from '../../services/config-editor.js';

const inputSchema = z.object({
  action: z.enum(['read', 'write', 'list']).describe('Action: "list" lists available files, "read" reads a file, "write" writes a file'),
  file_path: z
    .string()
    .optional()
    .describe('Relative file path within HA config directory. Required for read and write actions.'),
  content: z.string().optional().describe('REQUIRED for write action: the complete new file content to write. Must be valid YAML. Must not be omitted or empty when action is "write".'),
});

const configEditorTool: ToolDefinition = {
  name: 'config_editor',
  description:
    'Read, write, or list Home Assistant YAML configuration files. Always requires user confirmation before writing. IMPORTANT: For action="write" you MUST include both file_path AND content (the full file content as a string). Never call write without content.',
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
