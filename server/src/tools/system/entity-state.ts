import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  entity_id: z.string().describe('The entity ID to get state for (e.g. sensor.temperature)'),
});

const getEntityState: ToolDefinition = {
  name: 'get_entity_state',
  description:
    'Get the current state and attributes of a specific Home Assistant entity by its entity ID.',
  inputSchema,
  category: 'system',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id } = input;
      const state = await context.hassClient.getState(entity_id);

      return {
        success: true,
        result: state,
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to get entity state: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(getEntityState);
