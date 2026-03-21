import { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolResult } from '../types.js';
import { registerTool } from '../registry.js';

const inputSchema = z.object({
  entity_id: z.string().describe('The entity ID of the switch (e.g. switch.garden_lights)'),
  action: z.enum(['turn_on', 'turn_off', 'toggle']).describe('The action to perform'),
});

const switchControl: ToolDefinition = {
  name: 'switch_control',
  description: 'Control switches. Turn on, turn off, or toggle any switch entity.',
  inputSchema,
  category: 'device-control',
  confirmationDefault: 'auto_approve',

  async execute(input: z.infer<typeof inputSchema>, context: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id, action } = input;
      await context.hassClient.callService('switch', action, {}, { entity_id });

      return {
        success: true,
        result: `Switch ${entity_id} ${action} executed successfully`,
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: `Failed to control switch: ${(err as Error).message}`,
      };
    }
  },
};

registerTool(switchControl);
