import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  addon_slug: z
    .string()
    .optional()
    .describe('Specific add-on slug to get info for. Omit to list all add-ons.'),
});

const addonInfo: ToolDefinition = {
  name: 'addon_info',
  description:
    'Get information about Home Assistant add-ons. List all installed add-ons or get details for a specific one.',
  inputSchema,
  category: 'system',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { addon_slug } = input;

      if (addon_slug) {
        const result = await context.hassClient.callApi(
          'GET',
          `http://supervisor/addons/${addon_slug}/info`,
        );
        return { success: true, result };
      }

      const addons = await context.hassClient.getAddons();
      return {
        success: true,
        result: { count: addons.length, addons },
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to get addon info: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(addonInfo);
