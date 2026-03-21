import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  entity_id: z.string().describe('The entity ID to get history for'),
  hours_back: z.number().optional().describe('Number of hours of history to retrieve (default 24)'),
});

const getHistory: ToolDefinition = {
  name: 'get_history',
  description:
    'Get the state history of a Home Assistant entity over a time period. Returns historical state changes.',
  inputSchema,
  category: 'system',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id, hours_back } = input;
      const hours = hours_back ?? 24;
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const history = await context.hassClient.getHistory(entity_id, startTime);

      return {
        success: true,
        result: history,
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to get history: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(getHistory);
